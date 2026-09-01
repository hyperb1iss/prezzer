---
name: prezzer
description: Build, edit, verify, or present an interactive Prezzer deck — the Bun-native React presentation engine that compiles a talk into one offline HTML file. Use whenever the work involves a Prezzer deck or a repository scaffolded by `bun create prezzer`, and for any mention of slides, beats, speaker notes, presenter chrome, deck widgets, slide transitions, deck theming, deck outlines, or standalone HTML deck builds, even when prezzer is not named explicitly.
---

# Prezzer decks as software

A Prezzer deck is a small Bun + React application. Slides are components, in-slide reveals are "beats" of a per-slide state machine, and `prezzer build` bakes everything — markup, styles, scripts, images, self-hosted fonts — into a single `dist/index.html` that presents from `file://` with no network.

This file carries the workflow and the map. The `references/` directory carries exact API tables, verified code patterns, and gotchas; read the file that matches the work before guessing at an API.

| Reference                                                | Read when                                                                                                               |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [references/api.md](references/api.md)                   | Writing slides: `Deck` props, `SlideDef` fields and defaults, `Beat`, hooks, keyboard/touch map, hash deep links        |
| [references/chrome.md](references/chrome.md)             | Placing headers, stat rails, badges, starfields, art layers; the `.prezzer-*` CSS class inventory                       |
| [references/theming.md](references/theming.md)           | Colors, glow, fonts, z-layers, `createTheme`, `--prezzer-*` CSS variables, self-hosting fonts for offline               |
| [references/motion.md](references/motion.md)             | Slide transition personalities, spring presets, the reveal/stagger/glow variant catalog                                 |
| [references/widgets.md](references/widgets.md)           | Beat-driven diagrams (pull) or self-timed demos that claim the spacebar (push), with a verified working example         |
| [references/authoring.md](references/authoring.md)       | Shaping the story: outline, acts, timing budget, compression path, speaker notes, the `facts.ts` pattern                |
| [references/verification.md](references/verification.md) | Before handing off: the check/build gates, the dev-server asset gotcha and its verified fix, offline and browser passes |

## Start from the supported path

```bash
bun create prezzer my-talk
cd my-talk
bun dev
```

The generated repository is the contract: `index.html` is the entry, `src/main.tsx` mounts `<Deck>`, `src/slides.tsx` is the deck registry, `src/index.css` wires Tailwind 4 and the font stacks, and `bunfig.toml` registers the serve plugins. Scripts: `bun dev` (serve with HMR), `bun run check` (format, lint, typecheck), `bun run build` (bake the artifact). Keep the registry in `src/slides.tsx` until one file per slide genuinely improves navigation.

## Entry points — import from the right place

| Import                            | Provides                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `prezzer`                         | `Deck`, `DeckProvider`, `Beat`, `useBeat`/`useDeck`/`useDenyMode`/`useDeckTheme`, `SlideDef`/`ActDef` types, theme tokens, motion variants |
| `prezzer/chrome`                  | `SlideHeader`, `StatRail`, `CreedChip`, `RolloutBadge`, `Starfield`, `SlideArt` (plus the shell overlays for custom shells)                |
| `prezzer/widgets`                 | `DeckWidgetHandle`, `useWidgetRegistration` (plus `SlideWidgetProvider` for manual composition) — **not re-exported from the root**        |
| `prezzer/theme`, `prezzer/motion` | Focused imports of the same tokens and variants the root exports                                                                           |
| `prezzer/styles.css`              | The shell and chrome styles; import once in the entry                                                                                      |
| `prezzer/bun-plugin`              | Keeps linked local dev on one React/Motion instance                                                                                        |

The table and the references are curated working sets, not exhaustive export inventories — [references/api.md](references/api.md) and [references/chrome.md](references/chrome.md) go deeper, and `packages/engine/src` is the final word.

## Minimal deck

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

A beat count includes the initial state: `beats: 2` means one in-slide advance. `<Beat at={n}>` gates ordinary content; `useBeat()` drives diagrams and any scene whose whole state changes together. The engine logs a console warning when a mounted `<Beat at>` sits past the declared `beats` (that content can never reveal); conditionally rendered Beats can hide from the check, so still verify reveal counts in the built file.

## Shape the story before the components

A strong deck has a factual outline, a timing budget, a narrative arc, a compression path, speaker notes, and explicit demo fallbacks before visual implementation begins. Mark deep-dive slides with `deep: true` so the presenter sees what compresses first. Review every claim against its source repository or live system — slides are visual anchors; narration carries the detail. One load-bearing idea per slide beats shrinking text to fit. The full workflow, including the `facts.ts` single-source pattern for live numbers, is in [references/authoring.md](references/authoring.md).

## Gotchas that bite fastest

- **Serve with `prezzer dev`, never plain `bun index.html`.** The bare HTML server SPA-fallbacks every unmatched path, so `<img src="/art/x.png">`, `fetch("/shots/a.json")`, and CSS `url(/fonts/x.woff2)` return the HTML page while the bake works fine. The starter's `bun dev` script already runs `prezzer dev`, which serves `public/` correctly; on the npm-published 0.1.0 (which predates the command) use the verified `dev.ts` fallback in [references/verification.md](references/verification.md).
- **The bake inlines only literal asset paths.** `prezzer build` string-matches rooted paths against the built output; a runtime-constructed path like `` `/art/${id}.png` `` is never inlined and silently breaks offline. Keep asset paths literal.
- **`<Beat>` wrappers are motion-transformed**, so they become the containing block for absolutely-positioned children. `bottom`-anchoring lands at the wrapper's flow position, not the slide bottom. Prefer flow layout inside beats.
- **Hash routing is positional and mixed-index.** `#16` is the sixteenth slide, not outline id `S16`, and the beat suffix is 0-indexed — `#4.2` is slide four with two reveals already fired.

## Verify before handing off

```bash
bun run check
bun run build
```

The built `dist/index.html` is the product — open it from `file://` and drive every slide, beat, widget, note, grid entry, and deny state there, not just in dev. Turn networking off once to prove the deck is self-contained. The full checklist, the browser screenshot recipe, and the CLI flags are in [references/verification.md](references/verification.md).
