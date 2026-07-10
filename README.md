# prezzer

Build cinematic, interactive presentations with Bun and React. A Prezzer deck is real code, lives in its own repository, and builds to one HTML file you can present offline.

## Start a deck

```bash
bun create prezzer my-talk
cd my-talk
bun dev
```

That is the whole development setup. Bun serves the HTML entry, hot reloads React and TypeScript, and runs Tailwind through its native plugin.

When the deck is ready:

```bash
bun run check
bun run build
```

`dist/index.html` contains the complete presentation. Open it from `file://`, attach it to an email, or put it on any static host.

## Slides are components

```tsx
import { Beat, Deck, type SlideDef } from "prezzer";
import "prezzer/styles.css";

function Thesis() {
  return (
    <main>
      <h1>context is the product</h1>
      <Beat at={1}>retrieval decides what the model can become.</Beat>
    </main>
  );
}

const slides: SlideDef[] = [
  {
    id: "S1",
    title: "the thesis",
    beats: 2,
    notes: ["pause before the reveal"],
    component: Thesis,
  },
];

export function Talk() {
  return <Deck slides={slides} />;
}
```

Prezzer gives the deck a fixed 16:9 canvas, hash-addressed slides and beats, keyboard and touch navigation, speaker notes, a grid overview, act-aware progress, fullscreen, themes, transitions, and an imperative widget lane for live demos.

| Key             | Action                           |
| --------------- | -------------------------------- |
| `space`, `→`    | next beat, widget, or slide      |
| `←`             | previous beat or slide           |
| `shift` + arrow | skip a whole slide               |
| `g`             | grid overview                    |
| `n`             | speaker notes                    |
| `f`             | fullscreen                       |
| `d`             | deny mode for failure-path demos |

## Packages

- `prezzer` contains the React engine, presenter chrome, theme tokens, motion primitives, widget registry, styles, and `prezzer build`.
- `create-prezzer` powers `bun create prezzer` and owns the starter deck.
- `examples/hello` exercises the published package boundary and the complete build path.

The built-in chrome is framework-free CSS. Decks can use Tailwind, vanilla CSS, CSS modules, or any other styling approach without changing the engine.

## Learn the system

- [Deck authoring](docs/deck-authoring.md)
- [Engine package](packages/engine/README.md)
- [Scaffolder package](packages/create-prezzer/README.md)
- [Contributing](CONTRIBUTING.md)
- [Release process](docs/releasing.md)
- [Security policy](SECURITY.md)

## Repository development

```bash
bun install
bun run check
bun run build
```

The project is MIT licensed. Build something electric. 💜
