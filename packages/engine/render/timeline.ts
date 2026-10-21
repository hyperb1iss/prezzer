/** Inclusive, 1-indexed slide span; `last: null` runs to the end of the deck. */
export interface SlideRange {
  first: number
  last: number | null
}

/** Everything that decides when the renderer advances the deck. */
export interface Timeline {
  fps: number
  /** Device scale factor; 2 films a 1920x1080 stage at 3840x2160 */
  scale: number
  /** Default seconds on each beat before the next advance */
  hold: number
  slides: SlideRange
  /** Seconds keyed by position: "N" for every beat of slide N, "N.B" for one beat */
  holds: Readonly<Record<string, number>>
  /** Seconds to film after each widget started at a position, instead of waiting for it to go quiet */
  widgets: Readonly<Record<string, number>>
}

/** The shape of a `--timeline` JSON file; every field is optional. */
export interface TimelineFile {
  fps?: number
  scale?: number
  hold?: number
  slides?: string | number
  holds?: Record<string, number>
  widgets?: Record<string, number>
}

export const defaultTimeline: Timeline = {
  fps: 30,
  scale: 1,
  hold: 3,
  slides: { first: 1, last: null },
  holds: {},
  widgets: {},
}

export class TimelineError extends Error {
  override name = 'TimelineError'
}

/** Parses "3", "2-5", or "4-" into a slide range. */
export function parseSlideRange(text: string): SlideRange {
  const match = /^\s*(\d+)\s*(?:(-)\s*(\d+)?)?\s*$/.exec(text)
  if (!match?.[1]) throw new TimelineError(`slide range "${text}" must look like 3, 2-5, or 4-`)
  const first = Number(match[1])
  const last = match[2] ? (match[3] ? Number(match[3]) : null) : first
  if (first < 1) throw new TimelineError(`slide range "${text}" starts before slide 1`)
  if (last !== null && last < first) {
    throw new TimelineError(`slide range "${text}" ends before it starts`)
  }
  return { first, last }
}

/** Clamps a range to a deck with `total` slides, rejecting ranges that miss it entirely. */
export function clampSlideRange(range: SlideRange, total: number): { first: number; last: number } {
  if (range.first > total) {
    throw new TimelineError(`slide ${range.first} is past the end of a ${total}-slide deck`)
  }
  return { first: range.first, last: Math.min(range.last ?? total, total) }
}

const positionKey = /^\d+(?:\.\d+)?$/

function readSeconds(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TimelineError(`${label} must be a number of seconds, zero or more`)
  }
  return value
}

function readPositive(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TimelineError(`${label} must be a positive number`)
  }
  return value
}

function readHolds(value: unknown, label: string): Record<string, number> {
  if (value === undefined) return {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TimelineError(`${label} must map positions like "3" or "3.1" to seconds`)
  }
  const holds: Record<string, number> = {}
  for (const [key, seconds] of Object.entries(value)) {
    if (!positionKey.test(key)) {
      throw new TimelineError(`${label} key "${key}" must be a slide like "3" or a beat like "3.1"`)
    }
    holds[key] = readSeconds(seconds, `${label}["${key}"]`)
  }
  return holds
}

const timelineKeys = new Set(['fps', 'scale', 'hold', 'slides', 'holds', 'widgets', '$schema'])

/** Validates parsed timeline JSON. Unknown keys fail loudly so typos never pass silently. */
export function parseTimelineFile(value: unknown): TimelineFile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TimelineError('a timeline file must be a JSON object')
  }
  const record = value as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (!timelineKeys.has(key)) throw new TimelineError(`unknown timeline key "${key}"`)
  }
  const file: TimelineFile = {}
  if (record.fps !== undefined) file.fps = readPositive(record.fps, 'fps')
  if (record.scale !== undefined) file.scale = readPositive(record.scale, 'scale')
  if (record.hold !== undefined) file.hold = readSeconds(record.hold, 'hold')
  if (record.slides !== undefined) {
    if (typeof record.slides !== 'string' && typeof record.slides !== 'number') {
      throw new TimelineError('slides must be a range like "2-5"')
    }
    file.slides = record.slides
  }
  file.holds = readHolds(record.holds, 'holds')
  file.widgets = readHolds(record.widgets, 'widgets')
  return file
}

/** Layers a timeline file and then explicit overrides (CLI flags) over the defaults. */
export type TimelineOverrides = {
  [Key in 'fps' | 'scale' | 'hold' | 'slides']?: TimelineFile[Key] | undefined
}

export function resolveTimeline(
  file: TimelineFile = {},
  overrides: TimelineOverrides = {}
): Timeline {
  const merged = { ...file, ...stripUndefined(overrides) }
  const slides =
    merged.slides === undefined ? defaultTimeline.slides : parseSlideRange(`${merged.slides}`)
  return {
    fps: merged.fps === undefined ? defaultTimeline.fps : readPositive(merged.fps, 'fps'),
    scale: merged.scale === undefined ? defaultTimeline.scale : readPositive(merged.scale, 'scale'),
    hold: merged.hold === undefined ? defaultTimeline.hold : readSeconds(merged.hold, 'hold'),
    slides,
    holds: file.holds ?? {},
    widgets: file.widgets ?? {},
  }
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as Partial<T>
}

/** Seconds to hold at a beat: the beat's own entry, then its slide's, then the default. */
export function holdFor(timeline: Timeline, slide: number, beat: number): number {
  return timeline.holds[`${slide}.${beat}`] ?? timeline.holds[`${slide}`] ?? timeline.hold
}

/** An explicit widget duration for a position, or undefined to wait until the widget goes quiet. */
export function widgetHoldFor(timeline: Timeline, slide: number, beat: number): number | undefined {
  return timeline.widgets[`${slide}.${beat}`] ?? timeline.widgets[`${slide}`]
}

/**
 * Film time of frame `index` in whole milliseconds. Rounding the absolute
 * time (not each step) keeps a 30 fps film at exactly 1000 ms per 30 frames.
 */
export function frameTime(index: number, fps: number): number {
  return Math.round((index * 1000) / fps)
}

/** Milliseconds the clock advances to reach frame `index` from the frame before it. */
export function frameStep(index: number, fps: number): number {
  return index === 0 ? 0 : frameTime(index, fps) - frameTime(index - 1, fps)
}

/** Whole frames that cover `seconds` at `fps`. */
export function framesFor(seconds: number, fps: number): number {
  return Math.round(seconds * fps)
}

/** Parses a deck hash like "#4" or "#4.2" into a 1-indexed slide and 0-indexed beat. */
export function parsePosition(hash: string): { slide: number; beat: number } | null {
  const match = /^#?(\d+)(?:\.(\d+))?$/.exec(hash)
  if (!match?.[1]) return null
  return { slide: Number(match[1]), beat: match[2] ? Number(match[2]) : 0 }
}
