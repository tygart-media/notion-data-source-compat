# Accessibility render check (TypeScript)

Grade the same page twice — once by reading the HTML the server sent, once by
reading the DOM a visitor actually gets. A browser and a sandbox working
together.

Static accessibility checkers see the response body. Visitors see the DOM after
the theme, the consent banner and the recommendation widget have run. Whatever
those scripts inject is invisible to the checker, so a page can pass CI and
still hand a screen-reader user a stack of unlabelled images.

The sandbox serves three copies of one client page: the draft, the draft after a
source patch, and the same page after the theme script is patched too. Stage 2
is the point — the served HTML is clean and the browser still finds a defect.

The site has to live in the sandbox rather than on your machine. The browser
runs on Solari's infrastructure, so it cannot reach a server on your laptop.

## Run

```bash
cd examples/accessibility-render-check-ts
npm install
export SOLARI_API_KEY=slr_live_...   # https://console.getsolari.com
npm start
```

```
stage          served  rendered
1-draft        3       4        as authored
2-source-fix   0       1        markup patched — CI goes green here
3-theme-fix    0       0        theme patched too

1-draft — what a visitor actually gets:
  - <img> without alt: /assets/hero-flood.jpg
  - <img> without alt: /assets/crew-on-site.png
  - <img> without alt: /assets/related-post.webp
  - link text conveys nothing: "click here"

2-source-fix — what a visitor actually gets:
  - <img> without alt: /assets/related-post.webp

2-source-fix is the one that matters: the served HTML is clean and a browser
still finds 1.
```

Exits non-zero if that gap fails to reproduce, so the example grades itself
rather than asking you to trust the numbers.

Source: [`index.ts`](index.ts)
