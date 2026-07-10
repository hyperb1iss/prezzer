# Motion

All motion runs on `motion` (Motion for React, a peer dependency). `Deck` wraps everything in `MotionConfig reducedMotion="user"`, so every transition and variant below respects `prefers-reduced-motion` for free — don't add manual reduced-motion branches.

```tsx
import { motion } from "motion/react";
import { fadeInUp, springs, staggerContainer, staggerItem } from "prezzer"; // or "prezzer/motion"
```

## Slide transitions

Set per slide via `SlideDef.transition`. Default is `morph`.

| Type     | Personality                                | Use for                       |
| -------- | ------------------------------------------ | ----------------------------- |
| `morph`  | Pure crossfade, elegant                    | The default; dense content    |
| `slide`  | Standard horizontal, direction-aware       | Sequential narration          |
| `zoom`   | Scale up from center, bright bloom         | Big reveals                   |
| `portal` | Scale down + blur + saturation, 3D tilt    | Traveling into a new world    |
| `glitch` | Instant clip-path cut with hue-shift flash | Failure modes, security beats |
| `rise`   | Vertical from bottom                       | New sections / act openers    |
| `spiral` | Rotation + scale, direction-aware          | Playful pivots                |
| `split`  | Horizontal stretch from edges              | Dramatic contrast             |

All are spring-driven except `glitch` (0.25s tween) and `morph` (0.5s tween). Vary transitions by act or moment; a whole deck of `portal` reads as noise.

## Spring presets

`springs.snappy` (400/30) · `springs.smooth` (200/25) · `springs.bouncy` (300/20) · `springs.gentle` (100/20) — stiffness/damping, no durations. Spread into any Motion `transition`.

## Variant catalog

Ready-made `Variants` for `motion.*` elements. Unless noted, animate `initial="hidden" animate="visible"`.

| Variant                            | Motion                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `fadeInUp`                         | Rise 30px + fade, smooth spring                                            |
| `scaleIn`                          | Scale from 0.9, bouncy                                                     |
| `snapIn`                           | Scale down from 1.08 + blur, snappy — hero moments                         |
| `staggerContainer` / `staggerItem` | Parent + children list reveal, 80ms stagger                                |
| `counterVariants`                  | Stat pop, bouncy with delay                                                |
| `progressFill`                     | Bar fill; pass progress 0–1 via `custom`                                   |
| `checkmarkPop`                     | Delayed scale pop for completion marks                                     |
| `drawLine`                         | SVG `pathLength` draw over 1.5s                                            |
| `drawFromCenter`                   | Accent line scaleX from center                                             |
| `glowPulse`                        | Looping glow breath — states `idle` / `pulse`                              |
| `glowBloom(color, delay?)`         | Factory: glow appears after the element lands                              |
| `scanSweep`                        | One scanline pass on slide enter                                           |
| `crtFlicker`                       | Subtle terminal flicker — states `idle` / `flicker`                        |
| `hoverLift`                        | Not variants: a `whileHover` value (lift + shadow)                         |
| `typing`                           | Config object: `charDelay` 25ms, `wordDelay` 80ms, `cursorBlinkRate` 800ms |

```tsx
<motion.ul variants={staggerContainer} initial="hidden" animate="visible">
  {items.map((item) => (
    <motion.li key={item} variants={staggerItem}>
      {item}
    </motion.li>
  ))}
</motion.ul>
```

## Custom beat reveals

`<Beat>` accepts a `variants` override with `hidden`/`visible` keys when the default rise-and-unblur is wrong for the moment:

```tsx
<Beat
  at={1}
  variants={{
    hidden: { opacity: 0, scale: 1.06 },
    visible: { opacity: 1, scale: 1, transition: springs.snappy },
  }}
>
  <BigNumber />
</Beat>
```
