# Land this example upstream

These commands assume you have already forked
[`solari-sdk/solari-cookbook`](https://github.com/solari-sdk/solari-cookbook)
and are running them from the root of this submission checkout.

Set your GitHub username, then create a clean branch from upstream `main`:

```bash
export GITHUB_USER="YOUR_GITHUB_USERNAME"
export SUBMISSION_ROOT="$(pwd -P)"
export COOKBOOK_ROOT="${TMPDIR:-/tmp}/solari-cookbook-accessibility-render-check"

git clone "https://github.com/${GITHUB_USER}/solari-cookbook.git" "$COOKBOOK_ROOT"
cd "$COOKBOOK_ROOT"
git remote add upstream https://github.com/solari-sdk/solari-cookbook.git
git fetch upstream main
git switch -c add-accessibility-render-check-ts upstream/main
```

Copy only the example's four shippable files:

```bash
mkdir -p examples/accessibility-render-check-ts
cp "$SUBMISSION_ROOT/examples/accessibility-render-check-ts/index.ts" \
  "$SUBMISSION_ROOT/examples/accessibility-render-check-ts/package.json" \
  "$SUBMISSION_ROOT/examples/accessibility-render-check-ts/README.md" \
  "$SUBMISSION_ROOT/examples/accessibility-render-check-ts/.env.example" \
  examples/accessibility-render-check-ts/
```

Add this one row to the root README's **Cloud browser** table:

```markdown
| [accessibility-render-check-ts](examples/accessibility-render-check-ts) | TypeScript | Static a11y CI goes green; the rendered DOM still fails |
```

This copy-paste command inserts it after the browser session recording example
and refuses to edit an unexpected README:

```bash
python3 - <<'PY'
from pathlib import Path

path = Path("README.md")
text = path.read_text()
anchor = "| [browser-session-recording-py](examples/browser-session-recording-py) | Python | Record a session, download the replay |"
row = "| [accessibility-render-check-ts](examples/accessibility-render-check-ts) | TypeScript | Static a11y CI goes green; the rendered DOM still fails |"

if row not in text:
    if anchor not in text:
        raise SystemExit("README table anchor not found; add the documented row manually")
    path.write_text(text.replace(anchor, f"{anchor}\n{row}", 1))
PY
```

Install without generating a lockfile and run the example with a real key:

```bash
cd examples/accessibility-render-check-ts
npm install --no-package-lock
export SOLARI_API_KEY="slr_live_..."
npm start
cd ../..
```

The final diff should contain exactly the root README plus the four example
files. Commit it to your fork and open the upstream PR:

```bash
git add README.md \
  examples/accessibility-render-check-ts/.env.example \
  examples/accessibility-render-check-ts/README.md \
  examples/accessibility-render-check-ts/index.ts \
  examples/accessibility-render-check-ts/package.json
git diff --cached --check
git diff --cached --stat
git commit -m "Add accessibility render check example"
git push -u origin add-accessibility-render-check-ts

gh pr create \
  --repo solari-sdk/solari-cookbook \
  --base main \
  --head "${GITHUB_USER}:add-accessibility-render-check-ts" \
  --title "Add accessibility render check example" \
  --body "Adds a TypeScript browser + sandbox example that compares served HTML with the rendered DOM and reproduces an accessibility defect hidden from static checks."
```
