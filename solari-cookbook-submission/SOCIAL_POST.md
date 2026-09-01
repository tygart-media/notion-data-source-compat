# Social Posts (X & LinkedIn)

## X (Twitter) Version (≤280 chars)

```
Not a job application — a Cursor multi-model showcase for @getsolari.

Using Opus, Grok, Gemini & Fable in 1 session: tore down a broken draft & shipped an a11y checker proving served HTML passes CI while Solari's cloud browser catches post-paint defects.

cc @harrychow_
```

---

## LinkedIn Version

```
Not a job application — this is a Cursor multi-model showcase built for the @getsolari Cookbook challenge.

In a single Cursor Cloud Agent session, we coordinated four frontier models to research, tear down, and ship a production-grade cookbook example:

• Grok: Orchestrated the challenge workflow, analyzed competitor PRs, and enforced a sharp demo narrative.
• Gemini: Extracted cookbook voice, PMF alignment, and API documentation requirements.
• Fable: Handled SDK/API correctness across @solarisdk/browser and @solarisdk/sdk, catching subtle evaluate runtime caveats.
• Opus: Staff-engineer teardown & rewrite. Rejected a circular "self-verifying HTML" draft that looked fine on paper but masked real bugs, then rebuilt the architecture from scratch.

The Example: accessibility-render-check-ts
Static accessibility linters only inspect the raw HTML payload returned by the server. But real users experience the hydrated DOM after themes, consent banners, and client scripts inject post-paint elements. A page can pass CI with flying colors while still handing screen-reader users missing alt tags and broken labels.

By pairing a Solari sandbox (serving draft, markup-patched, and theme-patched stages) with Solari's cloud browser (acting as the live DOM oracle), the example demonstrates this gap directly:

stage          served  rendered
1-draft        3       4        as authored
2-source-fix   0       1        markup patched — CI goes green, browser still catches defect
3-theme-fix    0       0        theme patched too

The script grades itself and exits non-zero if the served-vs-rendered gap fails to reproduce.

Repo: https://github.com/solari-sdk/solari-cookbook

Tags: @harrychow_ @getsolari
```
