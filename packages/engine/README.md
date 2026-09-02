# 🎭 prezzer

> _Cinematic presentations as code. Bun-native, React-powered, one offline HTML file._

[![npm](https://img.shields.io/npm/v/prezzer?logo=npm&logoColor=white&color=e135ff)](https://www.npmjs.com/package/prezzer)
[![License](https://img.shields.io/github/license/hyperb1iss/prezzer?color=80ffea)](https://github.com/hyperb1iss/prezzer/blob/main/LICENSE)

The React presentation engine behind [Prezzer](https://github.com/hyperb1iss/prezzer): beat-driven slides, presenter chrome, SilkCircuit theming, motion primitives, and a build command that bakes the whole deck into one self-contained HTML file.

For a new deck, use the scaffolder:

```bash
bun create prezzer my-talk
```

To add Prezzer to an existing Bun and React project:

```bash
bun add prezzer react react-dom motion
```

```tsx
import { Deck, type SlideDef } from "prezzer";
import "prezzer/styles.css";

const slides: SlideDef[] = [
  { id: "S1", title: "hello", component: HelloSlide },
];

export function App() {
  return <Deck slides={slides} />;
}
```

## Entry points

- `prezzer` exports the deck, providers, beats, hooks, types, themes, and motion primitives.
- `prezzer/chrome` exports the built-in headers, rails, badges, notes, grid, starfield, and art layer.
- `prezzer/widgets` exports the imperative widget registry.
- `prezzer/theme` and `prezzer/motion` provide focused imports.
- `prezzer/markdown` turns pre-rendered markdown slide data into `SlideDef[]`; the bun plugin emits calls to it for `.md` imports.
- `prezzer/styles.css` contains the framework-free shell and chrome styles.
- `prezzer/bun-plugin` keeps linked decks on one React and Motion instance and resolves root-absolute `public/` references for both the dev server and the bake.

## CLI

```bash
prezzer dev
prezzer build
prezzer build talk.html --outdir release
```

`prezzer dev` serves the deck with hot reload and rooted `public/` paths (ETag/304 and Range handling built in), on `127.0.0.1:1609` by default and bound to localhost unless `--host` says otherwise; when 1609 is busy it walks to the next free port. `prezzer build` uses Bun's browser compiler and Tailwind plugin to emit one self-contained HTML file that inlines literally referenced `public/` assets (and warns about the rest); pass `--no-minify` while diagnosing output. `prezzer --version` prints the engine version.

Full authoring guidance lives in the [repository documentation](https://github.com/hyperb1iss/prezzer/blob/main/docs/deck-authoring.md).
