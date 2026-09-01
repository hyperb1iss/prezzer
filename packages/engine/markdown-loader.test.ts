import { describe, expect, test } from 'bun:test'
import { parseMarkdownDeck } from './markdown-loader'

const deck = `---
id: INTRO
title: the thesis
act: 1
transition: portal
notes:
  - pause before the reveal
  - second note
---

# context is the product

<!-- beat -->

retrieval decides what the model can become.

---

## plain slide

just a body, no frontmatter.

---
deep: true
badge: IN FLIGHT
---

### deep dive

- one
- two
`

describe('parseMarkdownDeck', () => {
  const slides = parseMarkdownDeck(deck)

  test('splits slides on dividers and reads per-slide frontmatter', () => {
    expect(slides.length).toBe(3)
    expect(slides[0]?.id).toBe('INTRO')
    expect(slides[0]?.title).toBe('the thesis')
    expect(slides[0]?.act).toBe(1)
    expect(slides[0]?.transition).toBe('portal')
    expect(slides[0]?.notes).toEqual(['pause before the reveal', 'second note'])
  })

  test('derives beats from beat markers', () => {
    expect(slides[0]?.beats).toBe(2)
    expect(slides[1]?.beats).toBe(1)
  })

  test('renders chunks to HTML at parse time', () => {
    expect(slides[0]?.chunks[0]).toContain('<h1>context is the product</h1>')
    expect(slides[0]?.chunks[1]).toContain('retrieval decides')
    expect(slides[2]?.chunks[0]).toContain('<li>one</li>')
  })

  test('defaults id and title when frontmatter omits them', () => {
    expect(slides[1]?.id).toBe('S2')
    expect(slides[1]?.title).toBe('plain slide')
  })

  test('reads flag and string frontmatter fields', () => {
    expect(slides[2]?.deep).toBe(true)
    expect(slides[2]?.badge).toBe('IN FLIGHT')
  })

  test('rejects unknown transitions instead of emitting an invalid one', () => {
    const [slide] = parseMarkdownDeck('---\ntransition: teleport\n---\n\n# hi\n')
    expect(slide?.transition).toBeUndefined()
  })

  test('keeps dividers and beat markers inside code fences as content', () => {
    const parsed = parseMarkdownDeck(
      '# fenced\n\n```yaml\n---\nkey: value\n---\n```\n\n<!-- beat -->\n\n```html\n<!-- beat -->\n```\n'
    )
    expect(parsed.length).toBe(1)
    expect(parsed[0]?.beats).toBe(2)
    expect(parsed[0]?.chunks[0]).toContain('key: value')
    expect(parsed[0]?.chunks[1]).toContain('beat')
  })

  test('treats unknown key-looking lines as content, not frontmatter', () => {
    const parsed = parseMarkdownDeck('# one\n\n---\n\nwarning: never do this\n\n---\n\n# three\n')
    expect(parsed.length).toBe(3)
    expect(parsed[1]?.chunks[0]).toContain('warning: never do this')
  })

  test('warns and drops a non-numeric act instead of emitting NaN', () => {
    const [slide] = parseMarkdownDeck('---\nact: banana\n---\n\n# hi\n')
    expect(slide?.act).toBeUndefined()
  })

  test('treats a divider without key lines as a plain separator', () => {
    const parsed = parseMarkdownDeck('# one\n\n---\n\n# two\n')
    expect(parsed.length).toBe(2)
    expect(parsed[1]?.title).toBe('two')
  })
})
