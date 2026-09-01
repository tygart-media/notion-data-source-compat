/**
 * Accessibility render check — a green a11y linter is not an accessible page.
 *
 * Static checkers read the HTML your server sends. Visitors get the DOM after
 * the theme, the consent banner and the recommendation widget have all run.
 * Anything those scripts inject is invisible to the checker, so a page can pass
 * CI, pass the agency's audit, and still hand a screen-reader user a stack of
 * unlabelled images.
 *
 * Three copies of the same client page are served from a sandbox: the draft,
 * the draft after a source patch (the fix a developer or a CMS edit makes), and
 * the same page after the theme script is patched too. Each is graded twice —
 * once by a regex over the served HTML, once by a real browser reading the
 * rendered DOM.
 *
 * Stage 2 is the whole point. The static check reports a clean page and the
 * browser still finds a defect, which is the exact state real sites ship in.
 *
 * Both products are load-bearing. The sandbox hosts the site because the
 * browser runs on Solari's infrastructure and cannot reach a server on your
 * laptop. The browser is the only thing that can see what a visitor sees.
 */
import { Solari } from "@solarisdk/browser"
import { SolariClient } from "@solarisdk/sdk"

const apiKey = process.env.SOLARI_API_KEY!
const PORT = 3000

/** Two images and one link live in the markup. `patched` is the edit a
 *  developer makes after the linter complains. */
const markup = (patched: boolean) => `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Storm restoration</title></head>
<body>
  <h1>Storm restoration, done right</h1>
  <p>We help property managers dry out and reopen fast.</p>
  <img src="/assets/hero-flood.jpg" width="640" height="360"${
    patched ? ` alt="Flooded office lobby being pumped dry"` : ""
  }>
  <img src="/assets/crew-on-site.png" width="320" height="240"${
    patched ? ` alt="Restoration crew unloading drying equipment"` : ""
  }>
  <p><a href="/quote">${
    patched ? "Request a storm damage quote" : "click here"
  }</a>${patched ? "" : " to request a quote."}</p>
  <script src="theme.js"></script>
</body>
</html>
`

/** Stands in for a theme, an ad slot, a related-posts widget — anything that
 *  writes to the DOM after the HTML has left the server. */
const theme = (patched: boolean) => `
setTimeout(() => {
  const img = document.createElement("img")
  img.src = "/assets/related-post.webp"
  img.width = 200
  img.height = 120
${patched ? `  img.alt = "Before and after a basement water extraction"\n` : ""}\
  document.body.appendChild(img)
}, 300)
`

const STAGES = [
  { dir: "1-draft", markup: false, theme: false, note: "as authored" },
  { dir: "2-source-fix", markup: true, theme: false, note: "markup patched — CI goes green here" },
  { dir: "3-theme-fix", markup: true, theme: true, note: "theme patched too" },
]

/** What a checker that only reads the response body can see. */
const auditServed = (html: string) => [
  ...(html.match(/<img\b(?![^>]*\balt\s*=)[^>]*>/gi) ?? []).map(
    (tag) => `<img> without alt: ${tag}`,
  ),
  ...(html.match(/>\s*(?:click here|here|read more)\s*</gi) ?? []).map(
    (hit) => `link text conveys nothing: "${hit.slice(1, -1).trim()}"`,
  ),
]

/** Runs in the page. Deliberately the same two rules as `auditServed`, so the
 *  only variable between the two columns is *when* you look. */
const auditRendered = () => {
  const problems: string[] = []
  for (const img of Array.from(document.querySelectorAll("img"))) {
    if (!(img.getAttribute("alt") ?? "").trim())
      problems.push(`<img> without alt: ${img.getAttribute("src")}`)
  }
  for (const a of Array.from(document.querySelectorAll("a"))) {
    const text = (a.textContent ?? "").trim()
    if (["click here", "here", "read more"].includes(text.toLowerCase()))
      problems.push(`link text conveys nothing: "${text}"`)
  }
  return problems
}

const client = new SolariClient({ apiKey })
const solari = new Solari({ apiKey })
const sandbox = await client.sandboxes.create({
  template: "base",
  timeoutMs: 5 * 60_000,
})

try {
  await sandbox.connect()

  // A directory per stage rather than one file rewritten in place: python's
  // http.server answers If-Modified-Since with a 304, so re-fetching one path
  // can hand back the previous stage. Separate URLs sidestep every cache.
  for (const stage of STAGES) {
    await sandbox.files.write(`/tmp/site/${stage.dir}/index.html`, markup(stage.markup))
    await sandbox.files.write(`/tmp/site/${stage.dir}/theme.js`, theme(stage.theme))
  }

  // Background it with an explicit `sh -c`: commands are not shell-interpreted,
  // and `run` waits for the process to exit, so a foreground server would block
  // until the idle timeout.
  await sandbox.commands.run("sh", {
    args: ["-c", `cd /tmp/site && nohup python3 -m http.server ${PORT} >/dev/null 2>&1 &`],
  })

  const { url } = await sandbox.previewUrl(PORT)

  // `previewUrl` hands back an address that already carries a `?pt_token=`
  // query string. Concatenating a path onto it puts the path *after* the query
  // and every request 404s, so build paths through URL.
  const at = (path: string) => {
    const u = new URL(url)
    u.pathname = path
    return u.toString()
  }

  await waitForServer(at(`/${STAGES[0].dir}/index.html`))

  const results = []
  const browser = await solari.launch()
  try {
    const page = await browser.newPage()

    for (const stage of STAGES) {
      const target = at(`/${stage.dir}/index.html`)

      // The /assets/* URLs intentionally 404. Only the elements matter here,
      // and a missing image is still an image the audit has to grade.
      await page.goto(target, { waitUntil: "networkidle" })

      // networkidle does not wait for a setTimeout that has not fired yet.
      await page.waitForTimeout(600)

      results.push({
        ...stage,
        served: auditServed(await (await fetch(target)).text()),
        rendered: await page.evaluate(auditRendered),
      })
    }
  } finally {
    await browser.close()
  }

  console.log("stage          served  rendered")
  for (const r of results) {
    const served = String(r.served.length).padEnd(7)
    console.log(`${r.dir.padEnd(14)} ${served} ${String(r.rendered.length).padEnd(8)} ${r.note}`)
  }

  for (const r of results.filter((r) => r.rendered.length)) {
    console.log(`\n${r.dir} — what a visitor actually gets:`)
    for (const problem of r.rendered) console.log(`  - ${problem}`)
  }

  const [draft, sourceFix, themeFix] = results

  // The example is only worth reading if the gap it describes shows up, so it
  // grades itself rather than asking you to trust the numbers above.
  const reproduced =
    draft.rendered.length > draft.served.length &&
    sourceFix.served.length === 0 &&
    sourceFix.rendered.length > 0 &&
    themeFix.rendered.length === 0

  if (reproduced) {
    console.log(
      `\n2-source-fix is the one that matters: the served HTML is clean and a` +
        ` browser still finds ${sourceFix.rendered.length}.`,
    )
  } else {
    console.error("\nthe render gap did not reproduce — check the fixtures")
    process.exitCode = 1
  }
} finally {
  // `kill()`, not `close()`, ends the VM. Nested so a failing kill cannot skip
  // the close: the browser client owns a listening loopback proxy, so missing
  // `solari.close()` leaves the process alive forever instead of exiting.
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
      // preview routing is not up yet
    }
  }
  throw new Error(`server never came up at ${target}`)
}
