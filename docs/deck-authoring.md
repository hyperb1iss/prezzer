# Deck authoring

## Create the repository

```bash
bun create prezzer my-talk
cd my-talk
bun dev
```

The generated repository has one source of truth for the deck in `src/slides.tsx`. Split slides into individual files when the talk grows beyond a handful of components.

## Define slides and acts

`SlideDef` is the deck registry:

```tsx
const slides: SlideDef[] = [
  {
    id: "S4",
    title: "the control plane",
    act: 2,
    beats: 3,
    transition: "rise",
    notes: [
      "start with the user action",
      "then reveal the reconciliation loop",
    ],
    deep: true,
    badge: "IN FLIGHT",
    component: ControlPlane,
  },
];
```

- `id` stays stable when slides are reordered.
- `beats` includes the initial state. A three-beat slide accepts two in-slide advances before moving on.
- `notes` appear in the presenter overlay.
- `deep` marks a slide that can be compressed when time is short.
- `badge` displays an honest delivery status.

Acts group the progress rail and color the grid overview's cards and legend. Pass explicit `ActDef[]` values when the talk needs meaningful labels and colors; otherwise Prezzer derives them from slide act numbers.

## Reveal with beats

```tsx
function Architecture() {
  const beat = useBeat();
  return (
    <section>
      <Diagram stage={beat} />
      <Beat at={1}>the worker claims the job</Beat>
      <Beat at={2}>the result closes the loop</Beat>
    </section>
  );
}
```

`<Beat at={n}>` handles a standard reveal. `useBeat()` is better for diagrams, counters, timelines, and any scene whose whole state changes together. The current position is mirrored into the URL hash, so refresh resumes exactly where you were; the beat suffix is the 0-indexed beat, so `#4.2` is slide four with two reveals fired.

## Write slides in markdown

Text-heavy slides can live in one `.md` file instead of JSX:

```tsx
import slides from "./slides.md";

<Deck slides={slides} />;
```

Slides separate on `---` lines, each may open with a `key: value` frontmatter block (`id`, `title`, `act`, `transition`, `deep`, `badge`, `notes`), and `<!-- beat -->` markers split a slide into reveals. The beat count derives from the markers, so it never drifts. The plugin renders everything at build time with `Bun.markdown`; the artifact ships pre-rendered HTML styled by the theme. Markdown slides are `SlideDef[]`, so they mix freely with JSX slides in one array. Reach for JSX when a slide needs widgets, `useBeat()` scenes, or deny variants.

## Add imperative widgets

Self-timed demos can claim the next advance before the deck moves on. Implement `DeckWidgetHandle`, register the ref with `useWidgetRegistration()`, and report whether the widget already started. Keyboard and touch advances use the same widget ordering.

## Theme the deck

Prezzer ships SilkCircuit by default. Override only what the talk needs:

```tsx
import { createTheme, Deck } from "prezzer";

const theme = createTheme({
  colors: {
    electricPurple: "#b14cff",
    background: "#08060f",
  },
});

<Deck slides={slides} theme={theme} />;
```

Components read the active theme through `useDeckTheme()`. The shell also exposes every token as a `--prezzer-*` custom property for CSS.

## Fonts

The starter loads Clash Display, Satoshi, and Geist Mono from font CDNs, with system fallbacks when the network is unavailable. Those `<link>` tags stay external in the built file, so a deck presented fully offline falls back to system fonts.

For an artifact whose typography survives airplane mode, self-host instead: download the `woff2` files into `public/fonts/`, declare them in `src/index.css`, and remove the CDN links.

```css
@font-face {
  font-family: "Clash Display";
  src: url(/fonts/ClashDisplay-Semibold.woff2) format("woff2");
  font-weight: 600;
}
```

`prezzer build` inlines every referenced `public/` asset as a data URI, fonts included, so the deck stays one self-contained file.

## Export a PDF

Open the built artifact with `?print` appended (works from `file://` too) and print from the browser: every slide renders as one fully revealed 16:9 page sized to the design canvas. Speaker notes stay out of the pages; hand the deck itself to anyone who needs the interactive version.

## Verify what gets presented

```bash
bun run check
bun run build
open dist/index.html
```

The final file is the product. Drive every slide, beat, widget, note, grid entry, and failure mode from the built file. Turn the network off once and confirm the talk still works before sharing it.
