import { Beat } from '../engine/Beat'
import type { TransitionType } from '../motion/animations'
import type { SlideDef } from '../types'

/**
 * Runtime half of markdown decks. The bun plugin parses a `.md` file at
 * bundle time (markdown-loader.ts) and emits a module calling
 * `markdownSlides` with pre-rendered HTML chunks; this side only turns that
 * data into SlideDefs. Chunk HTML comes from the deck author's own file,
 * the same trust boundary as their JSX.
 */

export interface MarkdownSlideData {
  id: string
  title: string
  act?: number | undefined
  beats: number
  transition?: TransitionType | undefined
  deep?: boolean | undefined
  badge?: string | undefined
  notes: string[]
  chunks: string[]
}

function MarkdownChunks({ chunks }: { chunks: string[] }) {
  return (
    <div className="prezzer-markdown-slide">
      {chunks.map((html, index) =>
        index === 0 ? (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: chunks are positional and never reorder
            key={index}
            className="prezzer-markdown-chunk"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: author-owned markdown, rendered at build time
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: chunks are positional and never reorder
          <Beat key={index} at={index} className="prezzer-markdown-chunk">
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: author-owned markdown, rendered at build time */}
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </Beat>
        )
      )}
    </div>
  )
}

/** Turn parsed markdown slide data into SlideDefs for `<Deck slides>`. */
export function markdownSlides(data: readonly MarkdownSlideData[]): SlideDef[] {
  return data.map((slide) => ({
    id: slide.id,
    title: slide.title,
    beats: slide.beats,
    notes: slide.notes,
    ...(slide.act !== undefined ? { act: slide.act } : {}),
    ...(slide.transition !== undefined ? { transition: slide.transition } : {}),
    ...(slide.deep !== undefined ? { deep: slide.deep } : {}),
    ...(slide.badge !== undefined ? { badge: slide.badge } : {}),
    component: () => <MarkdownChunks chunks={slide.chunks} />,
  }))
}
