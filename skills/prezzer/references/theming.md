# Theming

Prezzer ships the SilkCircuit design language: deep-space blacks, electric purple, neon cyan, glow tuned to survive washed-out projectors. Decks **override, never fork**: the two ancestor decks copy-pasted the token file and drifted 15 lines apart, which is exactly what `createTheme` exists to prevent. Do not copy token files into a deck.

```tsx
import { createTheme, Deck } from "prezzer";

const theme = createTheme({
  colors: { electricPurple: "#b14cff", background: "#08060f" },
});

<Deck slides={slides} theme={theme} />;
```

`createTheme` merges each section (`colors`, `glow`, `fonts`, `layers`) shallowly over `silkCircuit`, so override only the tokens the talk needs.

## Tokens

`theme.colors`:

| Token             | Default                  | Role                                                   |
| ----------------- | ------------------------ | ------------------------------------------------------ |
| `electricPurple`  | `#e135ff`                | Keywords, markers, importance                          |
| `neonCyan`        | `#80ffea`                | Functions, paths, interactions                         |
| `coral`           | `#ff6ac1`                | Numbers, stats, constants                              |
| `electricYellow`  | `#f1fa8c`                | Warnings, tags, attention                              |
| `successGreen`    | `#50fa7b`                | Success states                                         |
| `errorRed`        | `#ff6363`                | Errors, deny states                                    |
| `deepBlack`       | `#0a0a12`                | Scrims, overlays                                       |
| `terminalBlack`   | `#0d0d17`                | Terminal-style surfaces, notes overlay                 |
| `gridLine`        | `#1a1a2e`                | Hairlines                                              |
| `scanLine`        | `rgba(128,255,234,0.03)` | CRT texture                                            |
| `background`      | `#0a0a12`                | Viewport background                                    |
| `surface`         | `#10101c`                | Cards                                                  |
| `surfaceElevated` | `#151524`                | Raised cards                                           |
| `textPrimary`     | `#f0f0f5`                | Body text                                              |
| `textMuted`       | `#9fa2bd`                | Bright enough to survive a projector from the back row |

`theme.glow` holds prebuilt box-shadow strings: `cyan`, `purple`, `coral`, `green`, `yellow`. Use for `textShadow`/`boxShadow` emphasis.

`theme.fonts` holds `display` (Clash Display), `body` (Satoshi), and `mono` (Geist Mono). See Fonts below for offline behavior.

`theme.layers` is the z-index scale: `background` 0, `grid` 1, `scanlines` 2, `content` 10, `particles` 20, `navigation` 30, `overlay` 40. Slot custom layers into this scale instead of inventing z-indexes.

## Reading the theme

In components: `useDeckTheme()` returns the active theme. Never import `silkCircuit` directly inside themed components, or overrides silently stop applying.

In CSS: the shell flattens every token onto the viewport as custom properties via `themeToCssVars`. Naming is camelCase → kebab-case under a section prefix:

```css
color: var(--prezzer-color-electric-purple);
box-shadow: var(--prezzer-glow-cyan);
font-family: var(--prezzer-font-display);
z-index: var(--prezzer-layer-overlay);
```

JS and CSS therefore share one source of truth; pick whichever is closer to the code you're writing.

For translucent variants of a theme color, use `withAlpha(color, 0.4)` (exported from `prezzer` and `prezzer/theme`). It compiles to `color-mix(in srgb, …)` and works for any CSS color a theme can carry. Never append hex-alpha suffixes like `` `${color}66` ``: they silently produce invalid colors the moment a theme override uses `rgb()`, `oklch()`, or a named color. The built-in chrome uses `withAlpha` everywhere for exactly this reason.

## Fonts

The starter loads Clash Display, Satoshi, and Geist Mono from font CDNs. Those `<link>` tags stay external in the built file, so a deck presented fully offline falls back to system type. That is acceptable for most talks and wrong for airplane mode.

For typography that survives with zero network: download the `woff2` files into `public/fonts/`, declare `@font-face` in `src/index.css`, and remove the CDN links.

```css
@font-face {
  font-family: "Clash Display";
  src: url(/fonts/ClashDisplay-Semibold.woff2) format("woff2");
  font-weight: 600;
}
```

`prezzer build` inlines every referenced `public/` asset as a data URI, fonts included. Rooted font URLs resolve in the bake and under `prezzer dev`; serving the entry directly with `bun index.html` swallows them. See [verification.md](verification.md).
