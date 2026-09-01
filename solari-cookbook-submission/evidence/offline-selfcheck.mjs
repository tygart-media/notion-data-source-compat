/**
 * Offline self-check for accessibility-render-check-ts fixtures.
 * Mirrors the served/rendered audit rules without calling Solari.
 * Run: node offline-selfcheck.mjs
 */
const markup = (patched) => `<!doctype html>
<html lang="en"><body>
  <img src="/assets/hero-flood.jpg"${patched ? ` alt="Flooded lobby being pumped dry"` : ""}>
  <img src="/assets/crew-on-site.png"${patched ? ` alt="Crew unloading drying equipment"` : ""}>
  <p><a href="/quote">${patched ? "Request a storm damage quote" : "click here"}</a></p>
  <script src="theme.js"></script>
</body></html>`

const themeImg = (patched) =>
  `<img src="/assets/related-post.webp"${patched ? ` alt="Basement water extraction before and after"` : ""}>`

const auditServed = (html) => [
  ...(html.match(/<img\b(?![^>]*\balt\s*=)[^>]*>/gi) ?? []),
  ...(html.match(/>\s*(?:click here|here|read more)\s*</gi) ?? []),
]

const auditRendered = (html, injected) => {
  const combined = html.replace("</body>", `${injected}</body>`)
  const problems = []
  for (const m of combined.matchAll(/<img\b([^>]*)>/gi)) {
    if (!/\balt\s*=/.test(m[1])) problems.push((m[1].match(/\bsrc="([^"]+)"/) || [])[1])
  }
  for (const m of combined.matchAll(/<a\b[^>]*>(.*?)<\/a>/gis)) {
    const text = m[1].replace(/<[^>]+>/g, "").trim().toLowerCase()
    if (["click here", "here", "read more"].includes(text)) problems.push(text)
  }
  return problems
}

const draftS = auditServed(markup(false)).length
const draftR = auditRendered(markup(false), themeImg(false)).length
const srcS = auditServed(markup(true)).length
const srcR = auditRendered(markup(true), themeImg(false)).length
const thR = auditRendered(markup(true), themeImg(true)).length

const rows = [
  ["1-draft", draftS, draftR],
  ["2-source-fix", srcS, srcR],
  ["3-theme-fix", srcS, thR],
]
console.log("stage          served  rendered")
for (const [dir, s, r] of rows) console.log(`${dir.padEnd(14)} ${String(s).padEnd(7)} ${r}`)

const ok = draftR > draftS && srcS === 0 && srcR > 0 && thR === 0
console.log(ok ? "\nself-check reproduced: true" : "\nself-check reproduced: false")
process.exit(ok ? 0 : 1)
