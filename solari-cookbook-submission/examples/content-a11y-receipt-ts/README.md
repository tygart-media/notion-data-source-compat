# Content A11y Verification Receipt (TypeScript)

Prove that accessibility fixes actually landed in the rendered DOM — not just in raw source code.

This recipe combines two Solari primitives into a closed-loop verification workflow:
1. **Solari Sandbox**: Spins up an isolated container hosting a client-rendered preview site.
2. **Solari Cloud Browser**: Renders the page with full JavaScript execution, audits live DOM defects, applies fixes, and re-renders to guarantee a zero-defect receipt.

---

## Why this exists

Agencies and content teams ship client pages daily. Alt text gets dropped, "click here" links sneak into markdown, and client-side scripts or CMS hydration inject widgets post-paint.

Static `curl` / AST checks fail here:
- **Late DOM injection**: Modern themes inject banner images, related posts, or widgets via JS after initial HTML parse. Static HTML fetchers miss them completely.
- **Selector drift**: A regex or AST patch targeted at raw markdown may fail to bind once hydrated into the browser DOM.

The only real proof of a fix is a **rendered browser audit before and after**.

---

## How it works

```text
[Broken HTML + JS] ──> Sandbox (hosts /before.html)
                             │
                             ▼
                   Solari Cloud Browser
                             │
                             ├─ 1. Renders /before.html (catches post-paint <img>)
                             ├─ 2. Audits live DOM (finds 3 defects vs static's 2)
                             ├─ 3. Applies patches in-DOM & writes /after.html
                             ├─ 4. Generates /receipt.json
                             │
                             ▼
                   Solari Cloud Browser (Fresh Run)
                             │
                             └─ 5. Re-renders /after.html ──> Verifies 0 defects remain
```

---

## Gotchas called out

1. **Preview URLs carry authentication tokens**
   `sandbox.previewUrl(PORT)` returns a URL containing `?pt_token=...`. Never string-concatenate paths (e.g. `url + "/before.html"`), as that corrupts query params. Use standard URL mutation:
   ```ts
   const u = new URL(url)
   u.pathname = "/before.html"
   const target = u.toString()
   ```

2. **Sandbox commands do not invoke a shell by default**
   `sandbox.commands.run()` executes binaries directly without shell expansion or backgrounding (`&`). To run a background web server, delegate explicitly to `sh`:
   ```ts
   await sandbox.commands.run("sh", {
     args: ["-c", "nohup python3 /tmp/server.py >/dev/null 2>&1 &"],
   })
   ```

3. **Always call `solari.close()` in Node**
   The SDK keeps a local loopback proxy open for browser reconnection retries. If you only call `browser.close()`, the Node event loop stays open and your script hangs. Always pair them in a `finally` block:
   ```ts
   try {
     const browser = await solari.launch()
     // ...
   } finally {
     await browser.close()
     await solari.close()
   }
   ```

---

## Run

### 1. Set environment variable

```bash
export SOLARI_API_KEY=slr_live_...   # https://console.getsolari.com
```

### 2. Install and execute

```bash
cd examples/content-a11y-receipt-ts
npm install
npm start
```

---

## Expected output

```text
rendered before: 3 defect(s)
  - [img-alt] img[data-audit-id="d1"]  (/assets/hero-flood.jpg)
  - [img-alt] img[data-audit-id="d2"]  (/assets/crew-on-site.png)
  - [vague-link] a[data-audit-id="d3"]  (click here)
static fetch   : 2 img(s) without alt (browser saw more — JS injection)
rendered after : 0 defect(s)
receipt        : https://preview-xyz.solari.dev/receipt.json?pt_token=...
preview after  : https://preview-xyz.solari.dev/after.html?pt_token=...
verified       : 0 defects remain
```

---

## Customizing with an LLM

The example uses deterministic fix values to run self-contained on `SOLARI_API_KEY` alone. To produce production-grade copy in your client's brand voice, replace `fixValue()` with a call to Claude, GPT-4o, or Gemini:

```ts
async function fixValueWithLLM(defect: Defect, pageContext: string): Promise<string> {
  // Call your model of choice with image + page context
  // Return descriptive alt text or descriptive link label
}
```

The verification loop and receipt generation remain identical: Solari Cloud Browser guarantees the model's output actually works in production rendering.
