# Solari Cookbook submission — Cursor multi-model demo

Not a job application. A public proof that Cursor can drive several frontier
models in one session to research, critique, rewrite, and ship a real Solari
Cookbook example.

## Challenge (from @harrychow_ / Solari)

1. Fork [solari-sdk/solari-cookbook](https://github.com/solari-sdk/solari-cookbook)
2. Build a real use case with Solari browsers, sandboxes, and/or desktops
3. Publish on a public GitHub account
4. Share on LinkedIn or X tagging `@harrychow_` and `@getsolari`
5. Use AI to build it (required)

Free credits (when offered): redeem at [console.getsolari.com](https://console.getsolari.com)

## Example

[`examples/accessibility-render-check-ts`](examples/accessibility-render-check-ts) —
proves a static a11y check can go green while a real browser still finds
defects injected after paint. Sandbox hosts the pages; cloud browser is the
oracle. Self-grading.

## Root README row (for upstream cookbook)

```markdown
| [accessibility-render-check-ts](examples/accessibility-render-check-ts) | TypeScript | Static a11y CI goes green; the rendered DOM still fails |
```

## Multi-model trail

See [`MULTI_MODEL.md`](MULTI_MODEL.md).

## Status

- [x] Cookbook-shaped example (4 files, no framework)
- [x] Multi-model design + rewrite pass (Opus / Fable / Gemini / Grok)
- [ ] Live run against `SOLARI_API_KEY` (paste real output into README)
- [ ] Public fork + PR into `solari-sdk/solari-cookbook`
- [ ] X / LinkedIn post tagging `@harrychow_` `@getsolari`
