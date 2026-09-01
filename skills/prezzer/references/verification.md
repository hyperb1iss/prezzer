# Verification

The built `dist/index.html` is the product. Dev-mode behavior is a draft — several things (asset serving, font loading) genuinely differ between `bun dev` and the artifact, so a deck is only verified when the _built file_ has been driven end to end.

## Gates

```bash
bun run check   # format, lint, typecheck
bun run build   # prezzer build → dist/index.html
```

Run the narrow gate while editing; run both before handing off.

## CLI

`prezzer dev [entry] [--port <n>] [--host <name>]` — hot-reload dev server that also serves `public/`, on `127.0.0.1:1609` by default (1609 because 16:9; `--port` beats `$BUN_PORT`/`$PORT`/`$NODE_PORT` beats the default, `--host` exposes beyond loopback). When the default port is busy the server walks up to nine ports forward; an explicit `--port` fails instead of walking. The starter's `bun dev` script runs this.

`prezzer build [entry] [--outdir <dir>] [--no-minify]` — defaults `index.html` and `dist`. `--outdir` must be inside the project and can't contain the entry. Use `--no-minify` when diagnosing what landed in the artifact. `prezzer --version` prints the engine version.

## The built-file pass

Open `dist/index.html` from `file://` and drive:

- every slide **forward and backward** (backing up re-hides beats; previous-slide lands fully revealed),
- every widget (space starts it, next space advances),
- deny mode (`d`) on every slide that has a failure variant,
- speaker notes (`n`) and the grid (`g`, click a card to jump),
- a hash deep link (`#4.2` — the beat suffix is 0-indexed, so that's slide four with two reveals fired; refresh, confirm resume),
- **networking off once** — the artifact must present with zero network. If display fonts fall back to system type, that's the CDN-font tradeoff; see [theming.md](theming.md) to self-host.

## Browser screenshot pass

Use a real browser at the target projector ratio (1920×1080). Screenshot at minimum: the title slide, the densest content slide, the grid overview, the notes overlay, deny mode, and each interactive demo's mid and final states. Navigate by loading `dist/index.html#N.B` URLs — positional hash beats simulating keypresses for reproducibility (remember the beat suffix `B` is 0-indexed).

agent-browser operational notes: load the current agent-browser skill and follow its workflow rather than improvising — daemons can be shared across concurrent agents, so use an isolated session or daemon namespace of your own, diagnose a wedged browser with `agent-browser doctor` (destructive repair only via its explicit `--fix` path), and close only your own session when done. Run screenshot loops as one long-timeout foreground command, not many short ones.

## Gotcha: plain `bun index.html` swallows runtime `public/` fetches

**Symptom:** images, fetched JSON, or CSS-referenced fonts under `public/` render broken in dev but work in the built file. `curl` shows the tell — the request returns the page:

```
$ curl -sI http://localhost:3000/art/x.png | grep -i content-type
content-type: text/html;charset=utf-8
```

**Cause:** serving the entry directly (`bun index.html`) SPA-fallbacks every unmatched path to the page, and the engine's bundler plugin only covers bundler-time resolution (imports, inlining at bake). Runtime HTTP requests for rooted paths have no `public/` convention there.

**Fix:** serve with `prezzer dev` — the starter's `bun dev` script already does. It wraps the same HTML entry in `Bun.serve` with hot reload and serves unmatched paths from `public/` through Bun's directory routes, which handle ETag/304 revalidation and Range requests and reject non-canonical paths (verified on Bun 1.4.0: app and HMR chunks serve, assets return correct MIME types with ETags, misses and `..` traversal 404). Root-absolute CSS references like `url(/fonts/x.woff2)` resolve through `prezzer/bun-plugin` in dev too, so self-hosted fonts work the same in dev and in the artifact.

On the npm-published 0.1.0, which predates the dev command, add this verified `dev.ts` and run `bun dev.ts` instead; the `bunfig.toml` serve plugins still apply to the imported HTML:

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

Retire the fallback once the deck is on a release that ships `prezzer dev`.

## Gotcha: the bake inlines only literal asset paths

`prezzer build` inlines a `public/` asset by string-matching its rooted path (`/art/x.png`) against the built output. Literal paths anywhere — JSX, CSS, even a `fetch("/shots/a.json")` string — get inlined as data URIs. A runtime-constructed path (`` `/art/${id}.png` ``) never matches, is never inlined, and the artifact silently breaks offline while dev (with the fix above) keeps working. Keep asset paths literal, or build a literal-path manifest object and index into it.

## Gotcha: layout inside beats

`<Beat>` wrappers are motion-transformed, which makes them the containing block for absolutely-positioned children. `bottom`-anchored children land at the wrapper's flow position, not the slide bottom. Give absolute children explicit `top`/`left`, or better, use flow layout for stacked groups.

## Gotcha: positional hashes drift from outline ids

`#16` is the sixteenth slide, not outline id `S16`. When an outline skips numbers, position and id diverge — navigate and screenshot by position, and get the position from the grid or the notes header when unsure. The beat suffix is 0-indexed on top of the 1-indexed slide (`#16.2` = the notes overlay's `beat 3/N`); see [api.md](api.md).
