# Markdown slides

Text-heavy slides can be authored as one `.md` file instead of JSX. The bun plugin (`prezzer/bun-plugin`, already wired in every deck's `bunfig.toml` and in `prezzer build`) parses the file at bundle time with `Bun.markdown`, so the browser artifact carries pre-rendered HTML and no markdown parser.

```tsx
import slides from "./slides.md";
import { Deck } from "prezzer";

<Deck slides={slides} />;
```

The import's type comes from a module declaration in the deck's `assets.d.ts`:

```ts
declare module "*.md" {
  import type { SlideDef } from "prezzer";
  const slides: SlideDef[];
  export default slides;
}
```

Mixing is normal: `.md` slides are plain `SlideDef[]`, so spread them alongside JSX slides in one array.

## File grammar (Slidev-flavored)

```md
---
id: INTRO
title: the thesis
act: 1
transition: portal
notes:
  - pause before the reveal
---

# context is the product

<!-- beat -->

retrieval decides what the model can become.

---

## a plain slide

no frontmatter needed; title comes from the first heading.
```

- Slides separate on lines containing only `---`.
- A slide may open with a frontmatter block of `key: value` lines closed by another `---`; a leading block belongs to the first slide. Keys: `id`, `title`, `act`, `transition`, `deep`, `badge`, `notes` (a `- item` list), and `beats`, which parses so the block stays frontmatter and is then ignored.
- `<!-- beat -->` on its own line splits the slide into reveal chunks. **The beat count derives from the markers.** A frontmatter `beats:` is ignored, so markdown slides can never drift the way hand-declared counts can.
- Defaults: `id` is positional (`S3`); `title` is the text of the first `#`, `##`, or `###` heading, falling back to `slide N`.
- Dividers and beat markers inside code fences (``` or ~~~) are content, never boundaries, so YAML/diff/HTML examples are safe.
- Frontmatter accepts only the known keys; a block containing any other `key:`-looking line is treated as slide content, so a paragraph starting `warning: ...` cannot eat a slide.
- An unknown `transition` or non-numeric `act` warns at build time and falls back; because a bare `---` line separates slides, use `***` for a horizontal rule and prefer `#` headings over setext (`Title` + `---`) style.

## Rendering

Chunks render inside `.prezzer-markdown-slide`, which ships themed typography in `prezzer/styles.css`: display-font headings, 40px body at the 1920×1080 canvas, `strong` in coral, `em` and inline code in cyan, terminal-black code blocks, purple list markers and blockquote bars. Everything reads the `--prezzer-*` custom properties, so `createTheme` overrides apply. Override the classes (`.prezzer-markdown-slide`, `.prezzer-markdown-chunk`) in deck CSS for layout changes.

The runtime factory, `markdownSlides(data)` from `prezzer/markdown`, is importable directly for decks that build slide data another way; each datum carries `{ id, title, beats, notes, chunks }` plus the optional SlideDef fields, where `chunks` are pre-rendered HTML strings gated behind `<Beat>` in order.

## Limits

- Markdown slides are static content: no widgets, no `useBeat()` scenes, no deny variants. Reach for JSX the moment a slide needs behavior.
- The chunk HTML comes from the author's own file (the same trust boundary as JSX), rendered once at build time, so runtime data can't be interpolated into it.
