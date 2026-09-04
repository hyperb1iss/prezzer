import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { Deck } from 'prezzer'
import { acts, slides } from './slides'

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

describe('demo artwork', () => {
  for (const slide of slides) {
    test(`${slide.title} has an offline-safe illustration`, async () => {
      const { container } = render(
        <Deck slides={[slide]} acts={acts} hashSync={false} showProgressRail={false} />
      )
      const images = container.querySelectorAll<HTMLImageElement>('.prezzer-slide-art-image')
      expect(images).toHaveLength(1)
      const source = images[0]?.getAttribute('src') ?? ''
      expect(source).toMatch(/^\/art\/[a-z-]+\.webp$/)
      const asset = Bun.file(new URL(`../public${source}`, import.meta.url))
      expect(await asset.exists()).toBe(true)
      const bytes = new Uint8Array(await asset.arrayBuffer())
      expect(new TextDecoder().decode(bytes.slice(8, 12))).toBe('WEBP')
      expect(images[0]?.getAttribute('alt')).toBe('')
      expect(images[0]?.getAttribute('aria-hidden')).toBe('true')
    })
  }
})

describe('demo interactions', () => {
  test('keeps the bake widget ahead of slide navigation', async () => {
    const widget = slides.find((slide) => slide.id === 'S5')
    const next = slides.find((slide) => slide.id === 'S6')
    if (!widget || !next) throw new Error('missing demo slides')
    render(<Deck slides={[widget, next]} acts={acts} showProgressRail={false} />)
    fireEvent.keyDown(window, { key: ' ' })
    expect(window.location.hash).toBe('#1')
    fireEvent.keyDown(window, { key: ' ' })
    await waitFor(() => expect(window.location.hash).toBe('#2'))
  })

  test('reveals and re-hides the pitch on cue', () => {
    const pitch = slides.find((slide) => slide.id === 'S2')
    if (!pitch) throw new Error('missing pitch slide')
    const { container } = render(
      <Deck slides={[pitch]} acts={acts} hashSync={false} showProgressRail={false} />
    )
    expect(container.querySelectorAll('[inert]')).toHaveLength(3)
    fireEvent.keyDown(window, { key: ' ' })
    expect(container.querySelectorAll('[inert]')).toHaveLength(2)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(container.querySelectorAll('[inert]')).toHaveLength(3)
  })
})
