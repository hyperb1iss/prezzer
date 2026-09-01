import type { TransitionType } from './src/motion/animations'

/**
 * Build-time parser for `.md` deck files. Runs under Bun (the dev server and
 * the bake) via the onLoad hook in bun-plugin.ts — never in the browser, so
 * Bun.markdown is available. The runtime half lives in src/markdown.
 *
 * Grammar (Slidev-flavored):
 *   - slides separate on lines containing only `---`
 *   - a slide may open with a frontmatter block of `key: value` lines closed
 *     by another `---`; a leading frontmatter block belongs to the first slide
 *   - `<!-- beat -->` on its own line splits a slide into beat chunks; the
 *     beat count derives from the markers, so it can never drift
 */

export interface MarkdownSlideData {
  id: string
  title: string
  act?: number
  beats: number
  transition?: TransitionType
  deep?: boolean
  badge?: string
  notes: string[]
  chunks: string[]
}

const transitionNames: readonly TransitionType[] = [
  'slide',
  'zoom',
  'portal',
  'glitch',
  'rise',
  'spiral',
  'morph',
  'split',
]

const beatMarker = /^<!--\s*beat\s*-->\s*$/m

interface RawSlide {
  meta: string
  body: string
}

function splitSlides(source: string): RawSlide[] {
  const lines = source.replaceAll('\r\n', '\n').split('\n')
  const slides: RawSlide[] = []
  let index = 0

  const isDivider = (line: string | undefined) => line?.trim() === '---'

  // A frontmatter block is consecutive `key: value`, `- item`, or blank
  // lines closed by a divider; anything else means the `---` was a plain
  // slide separator and the content that follows is markdown.
  const frontmatterAhead = (): boolean => {
    if (!/^[A-Za-z_][\w-]*:/.test(lines[index] ?? '')) return false
    for (let look = index; look < lines.length; look += 1) {
      const line = lines[look] ?? ''
      if (isDivider(line)) return true
      if (!/^([A-Za-z_][\w-]*:|\s*-\s|\s*$)/.test(line)) return false
    }
    return false
  }

  const readBlockUntilDivider = (): string => {
    const start = index
    while (index < lines.length && !isDivider(lines[index])) index += 1
    const block = lines.slice(start, index).join('\n')
    index += 1
    return block
  }

  let meta = ''
  if (isDivider(lines[0])) {
    index = 1
    if (frontmatterAhead()) meta = readBlockUntilDivider()
    else index = 0
  }

  let body: string[] = []
  const flush = () => {
    slides.push({ meta, body: body.join('\n').trim() })
    meta = ''
    body = []
  }

  while (index < lines.length) {
    if (isDivider(lines[index])) {
      flush()
      index += 1
      if (frontmatterAhead()) meta = readBlockUntilDivider()
      continue
    }
    body.push(lines[index] ?? '')
    index += 1
  }
  flush()

  return slides.filter((slide) => slide.meta !== '' || slide.body !== '')
}

function parseMeta(meta: string): Record<string, string | string[]> {
  const data: Record<string, string | string[]> = {}
  const lines = meta.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(lines[index] ?? '')
    if (!match) continue
    const key = match[1] as string
    const value = (match[2] ?? '').trim()
    if (value === '') {
      const items: string[] = []
      while (index + 1 < lines.length && /^\s*-\s+/.test(lines[index + 1] ?? '')) {
        items.push((lines[index + 1] ?? '').replace(/^\s*-\s+/, '').trim())
        index += 1
      }
      if (items.length > 0) data[key] = items
    } else {
      data[key] = value
    }
  }
  return data
}

function firstHeading(body: string): string | undefined {
  const match = /^#{1,3}\s+(.+)$/m.exec(body)
  return match?.[1]?.replace(/[*_`]/g, '').trim()
}

/** Parse a whole `.md` deck file into serializable slide data. */
export function parseMarkdownDeck(source: string): MarkdownSlideData[] {
  return splitSlides(source).map((raw, position) => {
    const meta = parseMeta(raw.meta)
    const chunks = raw.body
      .split(beatMarker)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk !== '')
      .map((chunk) => Bun.markdown.html(chunk))
    if (chunks.length === 0) chunks.push('')

    const transition =
      typeof meta.transition === 'string' &&
      (transitionNames as readonly string[]).includes(meta.transition)
        ? (meta.transition as TransitionType)
        : undefined
    if (typeof meta.transition === 'string' && transition === undefined) {
      console.warn(
        `[prezzer] slide ${position + 1}: unknown transition "${meta.transition}" — using the default`
      )
    }

    const notes =
      typeof meta.notes === 'string' ? [meta.notes] : Array.isArray(meta.notes) ? meta.notes : []

    return {
      id: typeof meta.id === 'string' ? meta.id : `S${position + 1}`,
      title:
        typeof meta.title === 'string'
          ? meta.title
          : (firstHeading(raw.body) ?? `slide ${position + 1}`),
      ...(typeof meta.act === 'string' ? { act: Number.parseInt(meta.act, 10) } : {}),
      // Beat count derives from the markers; a frontmatter `beats:` is
      // ignored because the chunks are the truth for a markdown slide.
      beats: chunks.length,
      ...(transition ? { transition } : {}),
      ...(meta.deep === 'true' ? { deep: true } : {}),
      ...(typeof meta.badge === 'string' ? { badge: meta.badge } : {}),
      notes,
      chunks,
    }
  })
}
