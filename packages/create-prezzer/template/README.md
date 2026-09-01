# {{title}}

A [Prezzer](https://github.com/hyperb1iss/prezzer) deck built with Bun and React.

```bash
bun install
bun dev
```

Edit `src/slides.tsx`, then press space to move through slides and beats. Press `?` for the full keyboard map, `g` for the grid, `n` for speaker notes, and `f` for fullscreen.

```bash
bun run check
bun run build
```

The build is one self-contained file at `dist/index.html`, ready to present offline or hand to anyone. Files in `public/` (images, fonts, data) are served in dev and inlined into the artifact when referenced by literal rooted paths like `/art/hero.png`.

One caveat on "offline": the starter loads its display fonts from CDNs, so a network-less machine falls back to system type — the build says so when it happens. To bake full typography into the file, [self-host the fonts](https://github.com/hyperb1iss/prezzer/blob/main/docs/deck-authoring.md#fonts).
