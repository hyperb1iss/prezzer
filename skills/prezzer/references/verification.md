# Verification

The built `dist/index.html` is the product. Dev-mode behavior is a draft — several things (asset serving, font loading) genuinely differ between `bun dev` and the artifact, so a deck is only verified when the _built file_ has been driven end to end.

## Gates

```bash
bun run check   # format, lint, typecheck
bun run build   # prezzer build → dist/index.html
```

Run the narrow gate while editing; run both before handing off.

## CLI

`prezzer build [entry] [--outdir <dir>] [--no-minify]` — defaults `index.html` and `dist`. `--outdir` must be inside the project and can't contain the entry. Use `--no-minify` when diagnosing what landed in the artifact.

## The built-file pass

Open `dist/index.html` from `file://` and drive:

- every slide **forward and backward** (backing up re-hides beats; previous-slide lands fully revealed),
- every widget (space starts it, next space advances),
- deny mode (`d`) on every slide that has a failure variant,
- speaker notes (`n`) and the grid (`g`, click a card to jump),
- a hash deep link (`#4.2`, refresh, confirm resume),
- **networking off once** — the artifact must present with zero network. If display fonts fall back to system type, that's the CDN-font tradeoff; see [theming.md](theming.md) to self-host.

## Browser screenshot pass

Use a real browser at the target projector ratio (1920×1080). Screenshot at minimum: the title slide, the densest content slide, the grid overview, the notes overlay, deny mode, and each interactive demo's mid and final states. Navigate by loading `dist/index.html#N.B` URLs — positional hash beats simulating keypresses for reproducibility.

agent-browser operational notes: daemons share one socket across agents, so an orphaned Chrome wedges CDP for everyone — `pkill -9 -f ".agent-browser/browsers"` and relaunch. Run screenshot loops as one long-timeout foreground command, not many short ones.

## Gotcha: `bun dev` swallows runtime `public/` fetches

**Symptom:** images, fetched JSON, or CSS-referenced fonts under `public/` render broken in dev but work in the built file. `curl` shows the tell — the request returns the page:

```
$ curl -sI http://localhost:3000/art/x.png | grep -i content-type
content-type: text/html;charset=utf-8
```

**Cause:** `bun dev` (`bun index.html`) SPA-fallbacks every unmatched path to the page, and the engine's public-assets handling only covers bundler-time resolution (imports, inlining at bake). Runtime HTTP requests for rooted paths have no `public/` convention.

**Fix** (verified against prezzer 0.1.0, Bun 1.3.14 — serves the app with HMR, returns `public/` assets with correct MIME types, 404s real misses): add `dev.ts` and run `bun dev.ts` instead of `bun index.html`; the `bunfig.toml` serve plugins still apply to the imported HTML.

```ts
import index from "./index.html";

const server = Bun.serve({
  routes: { "/": index },
  development: { hmr: true },
  async fetch(request) {
    const path = new URL(request.url).pathname;
    const asset = Bun.file(`public${path}`);
    if (await asset.exists()) return new Response(asset);
    return new Response("not found", { status: 404 });
  },
});

console.log(`prezzer dev → ${server.url}`);
```

Retire this workaround when the engine ships a `prezzer dev` command.

## Gotcha: the bake inlines only literal asset paths

`prezzer build` inlines a `public/` asset by string-matching its rooted path (`/art/x.png`) against the built output. Literal paths anywhere — JSX, CSS, even a `fetch("/shots/a.json")` string — get inlined as data URIs. A runtime-constructed path (`` `/art/${id}.png` ``) never matches, is never inlined, and the artifact silently breaks offline while dev (with the fix above) keeps working. Keep asset paths literal, or build a literal-path manifest object and index into it.

## Gotcha: layout inside beats

`<Beat>` wrappers are motion-transformed, which makes them the containing block for absolutely-positioned children. `bottom`-anchored children land at the wrapper's flow position, not the slide bottom. Give absolute children explicit `top`/`left`, or better, use flow layout for stacked groups.

## Gotcha: positional hashes drift from outline ids

`#16` is the sixteenth slide, not outline id `S16`. When an outline skips numbers, position and id diverge — navigate and screenshot by position, and get the position from the grid or the notes header when unsure.
