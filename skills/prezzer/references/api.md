# Core API

Accurate for `prezzer` 0.2.0. Source of truth when developing the engine itself: `packages/engine/src/`.

## Deck

```tsx
import { Deck } from "prezzer";
<Deck slides={slides} acts={acts} theme={theme} />;
```

| Prop                   | Type                  | Default       | Notes                                                                                                                                                      |
| ---------------------- | --------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slides`               | `readonly SlideDef[]` | required      | Navigation tolerates empty and live-changing lists; an empty deck renders a placeholder                                                                    |
| `acts`                 | `readonly ActDef[]`   | derived       | Derived acts get one entry per distinct `act` number, titled `act N`, colored from the theme palette in order purple → cyan → coral → yellow → green → red |
| `theme`                | `Theme`               | `silkCircuit` | See [theming.md](theming.md)                                                                                                                               |
| `hashSync`             | `boolean`             | `true`        | Mirror position into `location.hash`; pass `false` when embedding the deck inside a host page that owns the URL                                            |
| `designWidth`          | `number`              | `1920`        | Fixed design canvas, uniformly scaled to the viewport (reveal.js technique)                                                                                |
| `designHeight`         | `number`              | `1080`        | Author in absolute pixels against this canvas; sizes stay stable at any window size                                                                        |
| `minScale`, `maxScale` | `number`              | `0.2`, `2`    | Clamp on the viewport scale factor for extreme displays (tiny embeds, LED walls)                                                                           |
| `extraChrome`          | `ReactNode`           | —             | Rendered outside the scaled canvas, inside the themed viewport                                                                                             |
| `showProgressRail`     | `boolean`             | `true`        |                                                                                                                                                            |
| `showScanlines`        | `boolean`             | `true`        | Subtle CRT texture layer                                                                                                                                   |

`Deck` composes `MotionConfig reducedMotion="user"` → `DeckProvider` → `SlideWidgetProvider` → the shell (scaled canvas, keyboard and touch nav, notes and grid overlays, badge, progress rail). Compose `DeckProvider` and the pieces manually only when the shell's layout genuinely doesn't fit.

## SlideDef

Defaults below are what `resolveSlide` fills in; the engine always works with the resolved form.

| Field        | Type                      | Default   | Meaning                                                                                                                                                                              |
| ------------ | ------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`         | `string`                  | required  | Outline id, e.g. `"S9"` — stable across reorders; shown in notes and grid                                                                                                            |
| `title`      | `string`                  | required  | Accessible label and grid card title                                                                                                                                                 |
| `component`  | `ComponentType`           | required  | The slide itself                                                                                                                                                                     |
| `act`        | `number`                  | `0`       | Groups the progress rail and colors the grid cards; matches an `ActDef.number`                                                                                                       |
| `beats`      | `number`                  | `1`       | Total in-slide states **including the initial one**; `1` = no in-slide advance. In dev, a mounted `<Beat at>` past the declared range logs a warning naming the count to declare     |
| `transition` | `TransitionType`          | `"morph"` | See [motion.md](motion.md) for the eight personalities                                                                                                                               |
| `notes`      | `string[]`                | `[]`      | Speaker notes for the `n` overlay                                                                                                                                                    |
| `deep`       | `boolean`                 | —         | ▽ deep slide, first to compress when time runs short; marked in notes and grid                                                                                                       |
| `badge`      | `RolloutStatus \| string` | —         | Honest status stamp rendered top-right by the shell; the `RolloutStatus` union autocompletes the built-in vocabulary, any string renders. See RolloutBadge in [chrome.md](chrome.md) |

`ActDef` is `{ number: number; title: string; color: string }`. Pass explicit acts when labels and colors carry meaning; otherwise let the deck derive them.

## Beat

```tsx
<Beat at={2} className="mt-8" variants={customVariants}>
  the reveal
</Beat>
```

Visible once the slide's beat reaches `at`; backing up a beat re-hides it. The default reveal is opacity 0 / y 24px / 6px blur springing to rest. While hidden, the wrapper is `aria-hidden` and `inert`, so unrevealed content stays out of the accessibility tree and can't be tabbed into. Pass Motion `variants` with `hidden`/`visible` keys to restyle the reveal.

## Hooks

All deck hooks throw outside a `DeckProvider`.

| Hook             | Returns                                                     |
| ---------------- | ----------------------------------------------------------- |
| `useBeat()`      | Current in-slide beat, 0-indexed                            |
| `useDenyMode()`  | Whether the `d` deny variant is active on the current slide |
| `useDeckTheme()` | The active `Theme`                                          |
| `useDeck()`      | The full context, below                                     |

`useDeck()` surface: state — `slideIndex`, `beat`, `direction`, `slides` (resolved), `acts`, `theme`, `totalSlides`, `denyMode`, `autoplaySignal`; actions — `next()`, `prev()`, `nextSlide()`, `prevSlide()`, `goToSlide(index)`, `toggleDeny()`, `fireAutoplay()`.

The root also exports the shell's building blocks — `useKeyboardShortcuts`, `useSlideScale`, `useTouchNavigation`, `useFullscreen`, `SlideContainer`, and the `interactiveElementSelector` guard string — for custom shells only; `Deck` already wires them. A custom shell also needs `useSlideWidgets()` from `prezzer/widgets` to wire `onAdvanceIntercept`, or widgets never claim the spacebar (see [widgets.md](widgets.md)).

## Navigation model

| Key                        | Action                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `space`, `→`, `pgdn`       | Start the next pending widget, else next beat, else next slide                                 |
| `←`, `pgup`                | Previous beat, else previous slide **landed fully revealed**                                   |
| `shift` + advance/back key | Whole slide, skipping beats and widgets — applies to arrows, `space`, `pgup`, and `pgdn` alike |
| `1`–`9`                    | Jump straight to slides one through nine (the grid is random access beyond that)               |
| `home`, `end`              | First or last slide                                                                            |
| `g` / `n` / `f`            | Grid overview / speaker notes / fullscreen                                                     |
| `d`                        | Deny mode; auto-resets on slide change                                                         |
| `a`                        | Fire the autoplay signal (increments `autoplaySignal`)                                         |
| `?`                        | Shortcut help overlay                                                                          |
| `esc`                      | Close the open modal, then notes, then exit fullscreen                                         |

Shortcuts are skipped when `meta`, `ctrl`, or `alt` is held (`shift` stays live — it upgrades advances to whole-slide jumps) or when the event target is inside the guard selector: `a`, `button`, `input`, `select`, `textarea`, `video`, `audio`, `summary`, `[role="button"]`, any `[contenteditable]` not set to `"false"`, or anything under `[data-prezzer-interactive]` — browser shortcuts and embedded interactive demos keep working. Mark custom demo surfaces (canvas playgrounds, ARIA widgets) with `data-prezzer-interactive` to keep the deck's hands off them; the same guard applies to touch. Holding a toggle key (`f`/`n`/`g`/`d`/`a`) fires once, not per key-repeat. Page up/down means presenter clickers work unconfigured.

Grid and help are exclusive modals (opening one closes the other); speaker notes are an independent pinned panel that stays open across them. While the grid is open it owns the keyboard: arrows move focus across slide cards (up/down by visual row), typing digits builds a slide number shown in the hint line (`enter` jumps, the buffer clears after 1.5s), and `home`/`end` move focus to the first/last card instead of moving the deck.

Touch shares the exact same ordering guarantees: horizontal swipes past 50px navigate, taps on the outer 20% screen edges step back/forward, and center taps advance. **Every forward gesture — left swipe, right-edge tap, center tap — starts a pending widget before it advances the deck**; backward gestures never do. Taps must be under 300ms with less than 10px of movement, touches starting inside the guard selector above are ignored, multi-finger gestures (pinch/zoom) never navigate, and touch navigation is disabled entirely while the grid or notes overlay is open.

## Hash deep links

The URL hash mirrors position so refresh resumes exactly where the presenter was, and editing the hash navigates. The mirror uses `history.replaceState`, so navigating a deck never grows browser history — Back leaves the page instead of unwinding the talk. Indexing is mixed: the slide number is **1-indexed positional**, the beat suffix is the **raw 0-indexed beat**. So `#4.2` is slide four with two reveals fired — beat index 2, which the notes overlay displays as `beat 3/N` — and beat zero canonicalizes to a bare `#4`. Both parts are clamped to valid ranges, and a hand-typed hash beyond the deck is rewritten to the clamped position it actually shows. Slide numbers are not outline ids: when an outline skips numbers (`S15` → `S17`), position and id drift. Navigate by position. Disable the whole mirror with `hashSync={false}` when embedding.
