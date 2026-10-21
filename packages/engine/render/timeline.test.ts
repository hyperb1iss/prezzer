import { describe, expect, test } from 'bun:test'
import {
  clampSlideRange,
  frameStep,
  framesFor,
  frameTime,
  holdFor,
  parsePosition,
  parseSlideRange,
  parseTimelineFile,
  resolveTimeline,
  TimelineError,
  widgetHoldFor,
} from './timeline'

describe('parseSlideRange', () => {
  test('reads a single slide, a closed span, and an open-ended span', () => {
    expect(parseSlideRange('3')).toEqual({ first: 3, last: 3 })
    expect(parseSlideRange('2-5')).toEqual({ first: 2, last: 5 })
    expect(parseSlideRange(' 4 - ')).toEqual({ first: 4, last: null })
  })

  test('rejects slide zero, backwards spans, and anything that is not a range', () => {
    expect(() => parseSlideRange('0')).toThrow(TimelineError)
    expect(() => parseSlideRange('5-2')).toThrow('ends before it starts')
    expect(() => parseSlideRange('1,3')).toThrow(TimelineError)
    expect(() => parseSlideRange('')).toThrow(TimelineError)
  })
})

describe('clampSlideRange', () => {
  test('fills an open end and trims a span that runs past the deck', () => {
    expect(clampSlideRange({ first: 2, last: null }, 7)).toEqual({ first: 2, last: 7 })
    expect(clampSlideRange({ first: 2, last: 40 }, 7)).toEqual({ first: 2, last: 7 })
  })

  test('refuses a range that starts past the last slide', () => {
    expect(() => clampSlideRange({ first: 8, last: null }, 7)).toThrow('past the end')
  })
})

describe('frame clock', () => {
  test('rounds absolute frame times so a second of 30 fps is exactly 1000 ms', () => {
    const steps = Array.from({ length: 31 }, (_, index) => frameStep(index, 30))
    expect(steps[0]).toBe(0)
    expect(steps.reduce((sum, step) => sum + step, 0)).toBe(1000)
    // The 33.33 ms frame period lands as whole-millisecond 33s and 34s.
    expect(new Set(steps.slice(1))).toEqual(new Set([33, 34]))
    expect(frameTime(30, 30)).toBe(1000)
  })

  test('steps evenly when the frame period is whole', () => {
    expect(frameStep(7, 25)).toBe(40)
    expect(frameTime(250, 25)).toBe(10_000)
  })

  test('covers a hold with whole frames', () => {
    expect(framesFor(3, 30)).toBe(90)
    expect(framesFor(0.5, 30)).toBe(15)
    expect(framesFor(0, 30)).toBe(0)
  })
})

describe('timeline resolution', () => {
  test('defaults to 30 fps, scale 1, three-second holds, and the whole deck', () => {
    expect(resolveTimeline()).toEqual({
      fps: 30,
      scale: 1,
      hold: 3,
      slides: { first: 1, last: null },
      holds: {},
      widgets: {},
    })
  })

  test('lets explicit overrides beat the file, and ignores undefined overrides', () => {
    const file = parseTimelineFile({ fps: 60, hold: 2, slides: '2-4' })
    const timeline = resolveTimeline(file, { fps: 24, hold: undefined, slides: '3' })
    expect(timeline.fps).toBe(24)
    expect(timeline.hold).toBe(2)
    expect(timeline.slides).toEqual({ first: 3, last: 3 })
  })

  test('accepts a bare slide number for slides', () => {
    expect(resolveTimeline(parseTimelineFile({ slides: 5 })).slides).toEqual({ first: 5, last: 5 })
  })

  test('resolves holds beat first, then slide, then the default', () => {
    const timeline = resolveTimeline(parseTimelineFile({ hold: 3, holds: { '2': 5, '2.1': 8 } }))
    expect(holdFor(timeline, 2, 1)).toBe(8)
    expect(holdFor(timeline, 2, 0)).toBe(5)
    expect(holdFor(timeline, 3, 0)).toBe(3)
  })

  test('leaves widgets to quiet detection unless a duration is given', () => {
    const timeline = resolveTimeline(parseTimelineFile({ widgets: { '5': 4, '6.2': 0 } }))
    expect(widgetHoldFor(timeline, 5, 3)).toBe(4)
    expect(widgetHoldFor(timeline, 6, 2)).toBe(0)
    expect(widgetHoldFor(timeline, 6, 1)).toBeUndefined()
  })
})

describe('parseTimelineFile', () => {
  test('fails loudly on unknown keys so a typo never passes silently', () => {
    expect(() => parseTimelineFile({ hodl: 3 })).toThrow('unknown timeline key "hodl"')
  })

  test('rejects malformed positions and negative or non-numeric seconds', () => {
    expect(() => parseTimelineFile({ holds: { S3: 2 } })).toThrow('slide like "3"')
    expect(() => parseTimelineFile({ holds: { '3': -1 } })).toThrow('zero or more')
    expect(() => parseTimelineFile({ widgets: { '3': '2s' } })).toThrow('zero or more')
    expect(() => parseTimelineFile({ fps: 0 })).toThrow('positive')
    expect(() => parseTimelineFile([])).toThrow('JSON object')
  })

  test('allows a $schema key for editor tooling', () => {
    expect(parseTimelineFile({ $schema: 'x', hold: 1 }).hold).toBe(1)
  })
})

describe('parsePosition', () => {
  test('reads the deck hash as a 1-indexed slide and 0-indexed beat', () => {
    expect(parsePosition('#4')).toEqual({ slide: 4, beat: 0 })
    expect(parsePosition('#4.2')).toEqual({ slide: 4, beat: 2 })
    expect(parsePosition('4.2')).toEqual({ slide: 4, beat: 2 })
    expect(parsePosition('#intro')).toBeNull()
  })
})
