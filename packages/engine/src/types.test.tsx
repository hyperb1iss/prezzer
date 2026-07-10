import { describe, expect, test } from 'bun:test'
import { resolveSlide } from './types'

function Slide() {
  return null
}

describe('resolveSlide', () => {
  test('normalizes invalid beat counts and optional fields', () => {
    const slide = resolveSlide({
      id: 'S1',
      title: 'hello',
      component: Slide,
      beats: 0,
    })

    expect(slide.beats).toBe(1)
    expect(slide.act).toBe(0)
    expect(slide.notes).toEqual([])
    expect(slide.transition).toBe('morph')
  })
})
