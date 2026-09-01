# Multi-model build log

This submission was researched, torn down, and rewritten across several Cursor
models in one Cloud Agent session — the point of the demo.

| Model | Role | What changed |
| --- | --- | --- |
| Grok (parent) | Orchestration, challenge research (X / GitHub / LinkedIn mirrors), packaging | Framed the goal; pulled Harry Chow's apply steps; cloned cookbook + open PRs |
| Gemini | Competition intel + PMF / README voice | Confirmed apply steps, handles to tag, promo redemption path; cookbook-voice README draft |
| Fable | SDK / API correctness | Mapped `@solarisdk/browser` + `@solarisdk/sdk` against cookbook + PR #4; flagged silent `page.evaluate(string, arg)` failure mode |
| Opus | Staff-engineer rewrite | Rejected first circular "fix then verify own HTML" draft; shipped `accessibility-render-check-ts` with served-vs-rendered gap + self-check |
| Grok | Competitive teardown vs open PRs #3–#6 | Forced sharper one-line demo output and "why both products" necessity vs PR #4 |

## What we refused to ship

The first draft (`content-a11y-receipt-ts`) looked fine and failed every run:
freezing `page.content()` kept the injector `<script>`, so verification always
re-created a missing-alt image. Opus deleted it. Shipping both would have been
two overlapping a11y demos in one PR.

## Remaining gates before "world-class done"

1. Live `SOLARI_API_KEY` run — replace README sample output with a real transcript
2. Land the example on a public fork of `solari-sdk/solari-cookbook` (this agent
   cannot fork under the current GitHub token)
3. Social post — Cursor multi-model story + receipt numbers, tags as required

## Note on environment

This Cloud Agent booted on `tygart-media/notion-data-source-compat`, not the
Tygart workers environment. Solari work is staged under
`solari-cookbook-submission/` so it can be copied into a cookbook fork once
fork/push access and the API key are available.
