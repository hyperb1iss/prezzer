# Presenter chrome

```tsx
import {
  CreedChip,
  SlideArt,
  SlideHeader,
  Starfield,
  StatRail,
} from "prezzer/chrome";
```

Two kinds of chrome. **Shell-owned** pieces render automatically — `SpeakerNotes` (`n`), `GridOverview` (`g`), `ProgressRail`, and the `RolloutBadge` stamped from `SlideDef.badge`. **Author-placed** pieces go inside slide components. All of them read the deck context, so they only work under `<Deck>` (or a manual `DeckProvider`).

Built-in chrome is plain CSS shipped by `prezzer/styles.css` — it never depends on the deck's styling system. Deck content is free to use Tailwind (the starter wires `bun-plugin-tailwind`), vanilla CSS, or anything else.

## SlideHeader

```tsx
<SlideHeader
  act={2}
  title="the control plane"
  tag="⚡ war story"
  creeds={["SHOW THE CHANGE"]}
/>
```

| Prop     | Type        | Notes                                         |
| -------- | ----------- | --------------------------------------------- |
| `act`    | `number`    | Colors the eyebrow from the matching `ActDef` |
| `title`  | `ReactNode` | Display-font slide title                      |
| `tag`    | `string?`   | Small yellow tag before the act label         |
| `creeds` | `string[]?` | Rendered as `CreedChip`s on the right         |

The standard content-slide opener: act eyebrow, display title, creed chips right.

## StatRail

```tsx
<StatRail
  stats={[
    { value: "361 KB", label: "one file" },
    { value: "0", label: "servers" },
  ]}
/>
```

Coral stat callouts stacked along the right edge with a staggered entrance. `stats` is `{ value: string; label: string }[]`.

## CreedChip

`{ label: string; color?: string }` — neon pill for a design creed, electric purple by default. Use it (or a small custom chip) for badges in running text.

## RolloutBadge

The shell renders this automatically from `SlideDef.badge`; import it directly only in custom chrome. `{ status: string; color?: string; filled?: boolean }`. The built-in vocabulary styles: `GA` (green, filled), `DEV ONLY` (yellow, filled), `NOT ROLLED OUT` (purple, outline), `COMING SOON` (cyan, outline), `IN FLIGHT` (yellow, outline). Any other string renders purple outline; override with `color`/`filled`.

It is a **corner stamp** — absolutely positioned top-right of the canvas. For a badge inside a card or sentence, use `CreedChip` or a custom inline chip instead.

## Starfield

```tsx
<div className="relative h-full w-full">
  <Starfield count={48} />
  {/* content */}
</div>
```

`{ count?: number; className?: string; palette?: string[] }` — defaults: 32 stars, cyan/purple/coral from the theme. Star positions are seeded, not random, so renders are deterministic. It fills its nearest positioned ancestor — give the parent `position: relative`.

## SlideArt

```tsx
<SlideArt src="/art/control-plane.png" scrim="left" opacity={0.9} />
```

| Prop       | Type                                      | Default    | Notes                                                                                  |
| ---------- | ----------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| `src`      | `string`                                  | required   | Rooted `public/` path; see the dev-server gotcha in [verification.md](verification.md) |
| `position` | `string`                                  | `"center"` | CSS `object-position`                                                                  |
| `opacity`  | `number`                                  | `1`        |                                                                                        |
| `scrim`    | `"left" \| "right" \| "bottom" \| "none"` | `"none"`   | Dark gradient over one edge so slide text stays readable                               |
| `fit`      | `"cover" \| "contain"`                    | `"cover"`  | `contain` keeps the whole illustration                                                 |

Full-bleed art layer behind slide content with a slow Ken Burns drift. Put text opposite the scrim edge.

## CSS class inventory

Everything the engine styles uses the `prezzer-` prefix (plus the shell's `slide-viewport`, `slide-canvas`, `slide-container`, `scanlines`). Target these from deck CSS only to _extend_, never to rebuild what a prop already controls:

`prezzer-creed-chip` · `prezzer-deny-badge` · `prezzer-empty-deck` · `prezzer-grid-card` (`-badge`, `-meta`, `-title`) · `prezzer-grid-hint` · `prezzer-grid-legend` (`-item`) · `prezzer-grid-list` · `prezzer-grid-overview` · `prezzer-grid-panel` · `prezzer-progress` (`-act`, `-dot`, `-dots`, `-label`, `-readout`) · `prezzer-rollout-badge` · `prezzer-slide-art` (`-edge`, `-image`, `-scrim`) · `prezzer-slide-creeds` · `prezzer-slide-eyebrow` · `prezzer-slide-header` (`-copy`) · `prezzer-slide-tag` · `prezzer-slide-title` · `prezzer-speaker-note` · `prezzer-speaker-notes` (`-header`, `-hint`, `-list`) · `prezzer-sr-only` · `prezzer-star` · `prezzer-starfield` · `prezzer-stat` (`-label`, `-rail`, `-value`)
