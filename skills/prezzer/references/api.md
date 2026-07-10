# Core API

Accurate for `prezzer` 0.1.0. Source of truth when developing the engine itself: `packages/engine/src/`.

## Deck

```tsx
import { Deck } from "prezzer";
<Deck slides={slides} acts={acts} theme={theme} />;
```

| Prop               | Type                  | Default       | Notes                                                                                                                                                      |
| ------------------ | --------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slides`           | `readonly SlideDef[]` | required      | Navigation tolerates empty and live-changing lists; an empty deck renders a placeholder                                                                    |
| `acts`             | `readonly ActDef[]`   | derived       | Derived acts get one entry per distinct `act` number, titled `act N`, colored from the theme palette in order purple → cyan → coral → yellow → green → red |
| `theme`            | `Theme`               | `silkCircuit` | See [theming.md](theming.md)                                                                                                                               |
| `designWidth`      | `number`              | `1920`        | Fixed design canvas, uniformly scaled to the viewport (reveal.js technique)                                                                                |
| `designHeight`     | `number`              | `1080`        | Author in absolute pixels against this canvas; sizes stay stable at any window size                                                                        |
| `extraChrome`      | `ReactNode`           | —             | Rendered outside the scaled canvas, inside the themed viewport                                                                                             |
| `showProgressRail` | `boolean`             | `true`        |                                                                                                                                                            |
| `showScanlines`    | `boolean`             | `true`        | Subtle CRT texture layer                                                                                                                                   |

`Deck` composes `MotionConfig reducedMotion="user"` → `DeckProvider` → `SlideWidgetProvider` → the shell (scaled canvas, keyboard and touch nav, notes and grid overlays, badge, progress rail). Compose `DeckProvider` and the pieces manually only when the shell's layout genuinely doesn't fit.

## SlideDef

Defaults below are what `resolveSlide` fills in; the engine always works with the resolved form.

| Field        | Type             | Default   | Meaning                                                                                         |
| ------------ | ---------------- | --------- | ----------------------------------------------------------------------------------------------- |
| `id`         | `string`         | required  | Outline id, e.g. `"S9"` — stable across reorders; shown in notes and grid                       |
| `title`      | `string`         | required  | Accessible label and grid card title                                                            |
| `component`  | `ComponentType`  | required  | The slide itself                                                                                |
| `act`        | `number`         | `0`       | Groups the progress rail and colors the grid cards; matches an `ActDef.number`                  |
| `beats`      | `number`         | `1`       | Total in-slide states **including the initial one**; `1` = no in-slide advance                  |
| `transition` | `TransitionType` | `"morph"` | See [motion.md](motion.md) for the eight personalities                                          |
| `notes`      | `string[]`       | `[]`      | Speaker notes for the `n` overlay                                                               |
| `deep`       | `boolean`        | —         | ▽ deep slide, first to compress when time runs short; marked in notes and grid                  |
| `badge`      | `string`         | —         | Honest status stamp rendered top-right by the shell; see RolloutBadge in [chrome.md](chrome.md) |

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

The root also exports the shell's building blocks — `useKeyboardShortcuts`, `useSlideScale`, `useTouchNavigation`, `useFullscreen`, `SlideContainer` — for custom shells only; `Deck` already wires them.

## Navigation model

| Key                        | Action                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `space`, `→`, `pgdn`       | Start the next pending widget, else next beat, else next slide                                 |
| `←`, `pgup`                | Previous beat, else previous slide **landed fully revealed**                                   |
| `shift` + advance/back key | Whole slide, skipping beats and widgets — applies to arrows, `space`, `pgup`, and `pgdn` alike |
| `1`–`9`                    | Jump straight to slides one through nine (grid is random access beyond that)                   |
| `home`, `end`              | First or last slide                                                                            |
| `g` / `n` / `f`            | Grid overview / speaker notes / fullscreen                                                     |
| `d`                        | Deny mode; auto-resets on slide change                                                         |
| `a`                        | Fire the autoplay signal (increments `autoplaySignal`)                                         |
| `esc`                      | Close grid, then notes, then exit fullscreen                                                   |

Shortcuts are skipped when `meta`, `ctrl`, or `alt` is held (`shift` stays live — it upgrades advances to whole-slide jumps) or when the event target is inside the exact selector `a, button, input, select, textarea, [contenteditable="true"]` — browser shortcuts and embedded interactive demos keep working. The selector is literal: `contenteditable=""` or `"plaintext-only"` variants and custom focusable surfaces are **not** covered, so keep embedded demos on real interactive elements. Page up/down means presenter clickers work unconfigured.

Touch shares the exact same ordering guarantees: horizontal swipes past 50px navigate, taps on the outer 20% screen edges step back/forward, and center taps advance. **Every forward gesture — left swipe, right-edge tap, center tap — starts a pending widget before it advances the deck**; backward gestures never do. Taps must be under 300ms with less than 10px of movement, and touches starting on interactive elements (same selector as above) are ignored.

## Hash deep links

The URL hash mirrors position so refresh resumes exactly where the presenter was, and editing the hash navigates. Indexing is mixed: the slide number is **1-indexed positional**, the beat suffix is the **raw 0-indexed beat**. So `#4.2` is slide four with two reveals fired — beat index 2, which the notes overlay displays as `beat 3/N` — and beat zero canonicalizes to a bare `#4`. Both parts are clamped to valid ranges. Slide numbers are not outline ids: when an outline skips numbers (`S15` → `S17`), position and id drift. Navigate by position.
