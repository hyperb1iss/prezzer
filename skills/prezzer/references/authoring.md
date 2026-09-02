# Authoring the story

Slides are the last artifact, not the first. Build in this order because every later layer is cheaper to change than to rebuild: facts → outline → timing → components → polish.

## Before any component exists

- **Factual outline.** Every slide gets a stable id (`S1`, `S2`, and so on), a title, an act, and the one claim it makes. Ids survive reorders; use them in filenames, notes, and commit messages.
- **Timing budget.** Minutes per act, written down. A 25-minute slot with 20 slides means some slides get 30 seconds. Decide which ones now.
- **Compression path.** Mark deep-dive slides `deep: true`. They render a ▽ in the speaker notes and grid, so mid-talk the presenter can see exactly what to skip when time runs short. A deck without a compression path runs long in front of people.
- **Demo fallbacks.** Every live demo needs a rehearsed failure path: a deny-mode variant or a static end-state. Decide before building the widget, not after it breaks on stage.
- **Claim review.** Verify every number, quote, and status against its source repository or live system. Slides are visual anchors; narration carries the detail and nuance.

## One idea per slide

One idea per slide is a better default than shrinking text to fit. If a slide needs three ideas, it's three beats or three slides. The audience reads the slide in two seconds and listens to you for the rest. Write for that split.

## The `facts.ts` pattern

Keep every live number, commit hash, date, and status badge in one `src/data/facts.ts` and import from it everywhere. The day-of truth pass then re-stamps a single file instead of hunting stale numbers through twenty components:

```ts
export const facts = {
  decksShipped: 12,
  engineVersion: "0.2.0",
  lastVerified: "2026-07-10",
} as const;
```

## Speaker notes are performance cues

Notes render in the `n` overlay next to the slide id, deep marker, and beat position. Write them as short imperative cues (`"pause before the reveal"`, `"demo starts on space"`, `"skip S14 if past :40"`), not paragraphs to read aloud.

## The canvas is fixed

You author against a 1920×1080 design canvas (override via `Deck`'s `designWidth`/`designHeight`) that scales uniformly to the viewport. Absolute pixel sizes are design pixels, so `text-9xl` on the canvas is the same fraction of the screen everywhere. Consequences:

- Design and verify at 16:9; other aspect ratios letterbox. The scale factor is clamped to 0.2 through 2.0 by default (`Deck`'s `minScale`/`maxScale` override it), so extreme viewports can crop or leave slack instead of scaling further.
- Don't use viewport units (`vw`/`vh`) inside slides; they bypass the scale and drift.
- `h-full w-full` inside a slide refers to the canvas, which is what you want.

## Acts

Acts group the progress rail; the grid overview stays one flat registry-ordered list where acts supply the card colors and legend. Pass explicit `ActDef[]` when the talk has meaningful chapter names; derived acts (`act 0`, `act 1`, and so on) are fine for drafts. Act numbers don't need to be contiguous, but the rail reads best with three to five acts.

## File organization

Keep the registry and slides in `src/slides.tsx` until one file per slide genuinely improves navigation, then split to `src/slides/S04-control-plane.tsx` style names and keep the registry as the single ordered list. The registry order **is** the deck order.
