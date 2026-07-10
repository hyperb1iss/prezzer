---
name: prezzer
description: Build, edit, verify, or present an interactive Prezzer deck with Bun and React. Use for slides, beats, speaker notes, presenter chrome, widgets, deck outlines, and standalone HTML builds.
---

# Prezzer decks as software

Prezzer turns a technical talk into a small Bun and React application. The final artifact is one offline HTML file.

## Start from the supported path

```bash
bun create prezzer my-talk
cd my-talk
bun dev
```

Use the generated structure. Keep the registry in `src/slides.tsx` until the deck is large enough that one file per slide improves navigation.

## Shape the story before the components

A strong deck has a factual outline, a timing budget, a narrative arc, a compression path, speaker notes, and explicit demo fallbacks before visual implementation begins. Mark deep slides with `deep: true` so the presenter can see what compresses first.

Review claims against their source repositories and current systems. Slides are visual anchors; narration carries the detail. One load-bearing idea per slide is a better default than shrinking text to fit.

## Core API

```tsx
import { Beat, Deck, type ActDef, type SlideDef } from "prezzer";
import "prezzer/styles.css";

<Deck acts={acts} slides={slides} />;
```

`SlideDef` accepts `id`, `title`, `component`, `act`, `beats`, `transition`, `notes`, `deep`, and `badge`. A beat count includes the initial state. Reveal ordinary content with `<Beat at={n}>`; use `useBeat()` when a whole scene changes together.

Transitions are `slide`, `zoom`, `portal`, `glitch`, `rise`, `spiral`, `morph`, and `split`.

The shell provides keyboard and touch navigation, notes, grid overview, progress, fullscreen, deny mode, hash deep links, and reduced-motion support.

## Widgets

Use the pull model for beat-driven diagrams: read `useBeat()`, `useDenyMode()`, or `autoplaySignal` and render the current scene.

Use the push model for self-timed demos: implement `DeckWidgetHandle`, register through `useWidgetRegistration()`, and report whether the widget started. The next keyboard or touch advance starts pending widgets before moving the deck.

## Chrome and themes

`prezzer/chrome` exports `SlideHeader`, `StatRail`, `CreedChip`, `RolloutBadge`, `Starfield`, and `SlideArt`. The deck shell owns notes, grid, and progress.

Create theme overrides with `createTheme()` and read the active theme with `useDeckTheme()`. Do not copy token files into a deck. The engine exposes theme values as `--prezzer-*` CSS properties.

Built-in chrome is plain CSS. Deck content can use Tailwind through the generated `bunfig.toml`, vanilla CSS, or another styling system.

## Verify the artifact

```bash
bun run check
bun run build
```

Open `dist/index.html` directly. Verify every slide, beat, widget, grid entry, note, deny state, and shortcut in the built artifact. Turn networking off once to prove the presentation is actually self-contained.

For visual verification, use a real browser at the target projector aspect ratio and screenshot the title, densest content slide, grid, notes, and any interactive demo states.
