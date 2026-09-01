/**
 * Content a11y receipt — a model (or script) can "fix" a page; a browser
 * has to prove the fix actually landed in what visitors render.
 *
 * Agencies ship client pages every week. Alt text goes missing, the theme
 * drops a meta description, "click here" links sneak back in. Someone says
 * the page is fixed. Curl of the HTML source is not proof: themes inject
 * blocks after paint, and a patch aimed at the wrong selector is a silent no-op.
 *
 * This example closes the loop with two Solari products:
 *   1. A sandbox hosts before.html (broken) and after.html (patched).
 *   2. A cloud browser renders each URL, runs the SAME audit in the DOM,
 *      and only exits 0 when the second count is zero.
 *
 * The "fix" here is deliberately deterministic (alt from the image basename)
 * so the example runs on SOLARI_API_KEY alone. Swap in a model call for the
 * rewrite step when you want copy in the client's voice — the receipt shape
 * stays identical.
 */
import { Solari } from "@solarisdk/browser"
import { SolariClient } from "@solarisdk/sdk"

const apiKey = process.env.SOLARI_API_KEY
if (!apiKey) {
  console.error("SOLARI_API_KEY is required (console.getsolari.com)")
  process.exit(1)
}

const PORT = 8765

/** Minimal client-ish page: missing alts + a vague link. JS injects one more
 *  image after paint so a plain fetch would under-count — that's why we use
 *  a real browser for the audit, not curl. */
const BEFORE_HTML = `<!doctype html>
<html lang="en"><meta charset="utf-8">
<title>Client landing (draft)</title>
<body>
  <h1>Storm restoration, done right</h1>
  <p>We help property managers recover fast.</p>
  <img src="/assets/hero-flood.jpg" width="640" height="360">
  <img src="/assets/crew-on-site.png" width="320" height="240">
  <p><a href="/quote">click here</a> to request a quote.</p>
  <script>
    // Theme-like late injection — invisible to a static HTML fetch.
    setTimeout(() => {
      const img = document.createElement("img");
      img.src = "/assets/related-post.webp";
      img.width = 200; img.height = 120;
      document.body.appendChild(img);
    }, 300);
  </script>
</body></html>`

/** Tiny static file server. Paths under /assets/* return a 1x1 GIF so <img>
 *  tags do not 404 while we only care about the DOM audit. */
const SERVER_PY = `
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import mimetypes

ROOT = Path("/tmp/site")
GIF = bytes.fromhex(
  "47494638396101000100800000000000ffffff21f90401000000002c000000000100010000020144003b"
)

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path.startswith("/assets/"):
            body, ctype = GIF, "image/gif"
        else:
            name = "index.html" if path in ("", "/") else path.lstrip("/")
            target = (ROOT / name).resolve()
            if not str(target).startswith(str(ROOT.resolve())) or not target.is_file():
                self.send_error(404); return
            body = target.read_bytes()
            ctype = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass

HTTPServer(("0.0.0.0", PORTNUM), Handler).serve_forever()
`.replace("PORTNUM", String(PORT))

type Defect = {
  id: string
  kind: "img-alt" | "vague-link"
  selector: string
  current: string
}

/** Runs inside the page. Selects defects; never invents copy — that stays in Node. */
const AUDIT_JS = `(() => {
  const defects = [];
  let n = 0;
  for (const img of document.querySelectorAll("img")) {
    const alt = img.getAttribute("alt");
    if (alt === null || alt.trim() === "") {
      const id = "d" + (++n);
      img.setAttribute("data-audit-id", id);
      defects.push({
        id,
        kind: "img-alt",
        selector: 'img[data-audit-id="' + id + '"]',
        current: img.getAttribute("src") || "",
      });
    }
  }
  for (const a of document.querySelectorAll("a")) {
    const text = (a.textContent || "").trim().toLowerCase();
    if (text === "click here" || text === "here" || text === "read more") {
      const id = "d" + (++n);
      a.setAttribute("data-audit-id", id);
      defects.push({
        id,
        kind: "vague-link",
        selector: 'a[data-audit-id="' + id + '"]',
        current: a.textContent || "",
      });
    }
  }
  return defects;
})()`

function fixValue(d: Defect): string {
  if (d.kind === "img-alt") {
    const base = d.current.split("/").pop() || "image"
    return base.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ")
  }
  return "Request a quote"
}

const APPLY_FIXES_JS = `(defects) => {
  for (const d of defects) {
    const el = document.querySelector(d.selector);
    if (!el) continue;
    if (d.kind === "img-alt") el.setAttribute("alt", d.value);
    if (d.kind === "vague-link") el.textContent = d.value;
  }
}`

const client = new SolariClient({ apiKey })
const solari = new Solari({ apiKey })
const sandbox = await client.sandboxes.create({
  template: "base",
  timeoutMs: 5 * 60_000,
})

try {
  await sandbox.connect()
  await sandbox.files.write("/tmp/site/before.html", BEFORE_HTML)
  await sandbox.files.write("/tmp/site/index.html", BEFORE_HTML)
  await sandbox.files.write("/tmp/server.py", SERVER_PY)

  // commands are NOT shell-interpreted; background the server via sh -c.
  await sandbox.commands.run("sh", {
    args: ["-c", "nohup python3 /tmp/server.py >/dev/null 2>&1 &"],
  })

  const { url } = await sandbox.previewUrl(PORT)

  // previewUrl already carries ?pt_token=… — do not concatenate paths.
  const at = (path: string) => {
    const u = new URL(url)
    u.pathname = path
    return u.toString()
  }

  await waitForServer(at("/before.html"))

  const browser = await solari.launch()
  try {
    const page = await browser.newPage()

    // --- audit before ---
    await page.goto(at("/before.html"), { waitUntil: "networkidle" })
    await page.waitForTimeout(500) // let the late-injected <img> land
    const before = (await page.evaluate(AUDIT_JS)) as Defect[]
    console.log(`rendered before: ${before.length} defect(s)`)
    for (const d of before) {
      console.log(`  - [${d.kind}] ${d.selector}  (${d.current})`)
    }
    if (before.length === 0) {
      throw new Error("fixture produced zero defects — audit is broken")
    }

    // Static fetch under-counts because of the post-paint <img>.
    const staticHtml = await (await fetch(at("/before.html"))).text()
    const staticMissing = (staticHtml.match(/<img\\b(?![^>]*\\balt=)/gi) || [])
      .length
    console.log(
      `static fetch : ${staticMissing} img(s) without alt (browser saw more — JS injection)`,
    )

    // --- apply deterministic fixes in the live DOM, then freeze HTML ---
    const patches = before.map((d) => ({ ...d, value: fixValue(d) }))
    await page.evaluate(APPLY_FIXES_JS, patches)
    const afterHtml = await page.content()
    await sandbox.files.write("/tmp/site/after.html", afterHtml)

    const receipt = {
      builtWith: "Cursor multi-model (Opus design, Fable SDK research, Gemini intel, Grok orchestrator)",
      beforeCount: before.length,
      patches: patches.map(({ id, kind, value }) => ({ id, kind, value })),
    }
    await sandbox.files.write(
      "/tmp/site/receipt.json",
      JSON.stringify(receipt, null, 2) + "\\n",
    )

    // --- prove it: fresh navigation, identical audit ---
    await page.goto(at("/after.html"), { waitUntil: "networkidle" })
    await page.waitForTimeout(500)
    const after = (await page.evaluate(AUDIT_JS)) as Defect[]
    console.log(`rendered after : ${after.length} defect(s)`)
    console.log(`receipt        : ${at("/receipt.json")}`)
    console.log(`preview after  : ${at("/after.html")}`)

    if (after.length !== 0) {
      console.error("verification failed — fixes did not survive a fresh render")
      process.exitCode = 1
    } else {
      console.log("verified       : 0 defects remain")
    }
  } finally {
    await browser.close()
  }
} finally {
  try {
    await sandbox.kill()
  } finally {
    await solari.close()
  }
}

async function waitForServer(target: string) {
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise((r) => setTimeout(r, 1000))
    try {
      if ((await fetch(target)).ok) return
    } catch {
      // preview routing not up yet
    }
  }
  throw new Error(`server never came up at ${target}`)
}
