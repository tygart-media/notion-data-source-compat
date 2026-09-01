# Social posts (draft)

Not a job application — a Cursor multi-model showcase for the Solari Cookbook challenge.

## X (≤280)

```
Not a job application — a Cursor multi-model showcase for @getsolari.

Using Opus, Grok, Gemini & Fable in 1 session: tore down a broken draft & shipped an a11y checker proving served HTML passes CI while Solari's cloud browser catches post-paint defects.

cc @harrychow_
```

## LinkedIn

```
Not a job application — this is a Cursor multi-model showcase built for the Solari Cookbook challenge.

In one Cursor Cloud Agent session we coordinated four frontier models:

• Grok — orchestration, competitor PR teardown, demo narrative
• Gemini — cookbook voice, PMF, docs requirements
• Fable — SDK/API correctness across @solarisdk/browser + @solarisdk/sdk
• Opus — staff-engineer rewrite; rejected a circular first draft that looked fine but failed every run

Example: accessibility-render-check-ts
Static a11y linters only see the HTML the server sent. Visitors get the DOM after theme/consent/widget scripts run. A page can pass CI and still hand screen-reader users missing alts.

Solari sandbox hosts draft / source-fix / theme-fix stages. Solari cloud browser is the live DOM oracle:

stage          served  rendered
1-draft        3       4
2-source-fix   0       1   ← CI green, visitor still broken
3-theme-fix    0       0

The script grades itself and exits non-zero if the gap fails to reproduce.

Repo: <PUBLIC_URL>
Cookbook PR: <UPSTREAM_PR>

@harrychow_ @getsolari
```

## Still needed before posting

1. Live `SOLARI_API_KEY` run — paste real transcript into the README
2. Public fork + PR to solari-sdk/solari-cookbook
3. Replace placeholders above with real URLs
