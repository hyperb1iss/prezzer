# prezzer

The React presentation engine behind [Prezzer](https://github.com/hyperb1iss/prezzer).

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
- `prezzer/styles.css` contains the framework-free shell and chrome styles.

## Build CLI

```bash
prezzer build
prezzer build talk.html --outdir release
```

The command uses Bun's browser compiler and Tailwind plugin to emit one self-contained HTML file. Pass `--no-minify` while diagnosing output.

Full authoring guidance lives in the [repository documentation](https://github.com/hyperb1iss/prezzer/blob/main/docs/deck-authoring.md).
