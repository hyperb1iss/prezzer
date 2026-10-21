import { constants } from 'node:fs'
import { access, readdir } from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Browser, BrowserContext, Page } from 'playwright-core'
import {
  assertFfmpeg,
  type FrameSink,
  openFrameDirectory,
  openVideoSink,
  orderedSink,
} from './encoder'
import { type Film, prepareFilm, startFilm } from './film'
import {
  clampSlideRange,
  frameStep,
  framesFor,
  holdFor,
  parsePosition,
  type Timeline,
  widgetHoldFor,
} from './timeline'

/** A widget is done once its slide stays this quiet for this long. */
const widgetQuietSeconds = 1.5
/** No widget gets more than this before the renderer moves on. */
const widgetLimitSeconds = 30
/** At the deck's final position, how long a press gets to show it started something. */
const widgetProbeSeconds = 0.5
/** A position claiming more advances than this is treated as stuck. */
const widgetsPerPosition = 32

export class RenderError extends Error {
  override name = 'RenderError'
}

/** What the renderer learns about a deck before filming it. */
export interface DeckShape {
  /** Beats per slide, in slide order */
  beats: number[]
  width: number
  height: number
}

/** A press of the advance key before frame `frame`, and the hash it must produce. */
export interface Press {
  frame: number
  hash: string
}

/** A deterministic shooting script: how many frames, and when to advance. */
export interface RenderPlan {
  frames: number
  presses: Press[]
  /**
   * What the planning page observed on every frame. Capture workers must
   * observe the same, which catches a worker whose page drifted from the
   * plan even while its hash still matches.
   */
  observed: Array<{ mutations: number; running: number }>
  shape: DeckShape
  first: number
  last: number
}

export interface RenderProgress {
  phase: 'plan' | 'film'
  frame: number
  frames: number
}

export interface RenderOptions {
  /** A built, single-file deck */
  file: string
  timeline: Timeline
  /** MP4 path; ignored when `frames` is set */
  out?: string | undefined
  /** Directory for a PNG sequence instead of an MP4 */
  frames?: string | undefined
  crf?: number | undefined
  /** Parallel capture pages; each replays the same plan and captures its share */
  workers?: number | undefined
  /** Browser channel such as "chrome"; defaults to Playwright's bundled Chromium */
  channel?: string | undefined
  seed?: number | undefined
  onProgress?: ((progress: RenderProgress) => void) | undefined
  /** Stops the render; a partial MP4 or frame sequence is removed */
  signal?: AbortSignal | undefined
}

export interface RenderResult {
  frames: number
  seconds: number
  width: number
  height: number
  output: string
  elapsedMs: number
}

const installHint =
  'bun add -d playwright-core && bunx playwright-core install --only-shell chromium'

async function loadChromium() {
  try {
    return (await import('playwright-core')).chromium
  } catch {
    throw new RenderError(`prezzer render needs playwright-core: ${installHint}`)
  }
}

export async function launchBrowser(channel?: string): Promise<Browser> {
  const chromium = await loadChromium()
  try {
    // The caller owns signals, so an interrupted render can clean up its
    // partial output before the browser goes away.
    return await chromium.launch({
      headless: true,
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
      ...(channel ? { channel } : {}),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/Executable doesn't exist|install/i.test(message) && !channel) {
      throw new RenderError(`Playwright's Chromium is not installed: ${installHint}`)
    }
    throw new RenderError(`could not launch ${channel ?? 'chromium'}: ${message.split('\n')[0]}`)
  }
}

/** The default worker count: a quarter of the cores, at most four. */
export function defaultWorkers(): number {
  return Math.max(1, Math.min(4, Math.floor(availableParallelism() / 4)))
}

const readHash = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        // The deck mirrors position into the hash from a passive effect,
        // so let React's queued work run before reading it.
        const channel = new MessageChannel()
        channel.port1.onmessage = () => resolve(window.location.hash)
        channel.port2.postMessage(0)
      })
  )

/**
 * Learns the deck's slide count, beats per slide, and design canvas from
 * its public contracts alone (the hash deep link clamps and canonicalizes
 * out-of-range positions), so any built prezzer deck can be filmed.
 */
export async function probeDeck(browser: Browser, url: string): Promise<DeckShape> {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  try {
    const page = await context.newPage()
    await page.goto(`${url}#99999`)
    const canvas = await page.evaluate(() => {
      const element = document.querySelector<HTMLElement>('.slide-canvas')
      if (!element) return null
      return {
        width: Number.parseFloat(element.style.width),
        height: Number.parseFloat(element.style.height),
      }
    })
    if (!canvas) throw new RenderError('no .slide-canvas found: is this a built prezzer deck?')
    const last = parsePosition(await readHash(page))
    if (!last || last.slide === 99999) {
      throw new RenderError('the deck never rewrote its hash: render needs hashSync (the default)')
    }
    const beats: number[] = []
    for (let slide = 1; slide <= last.slide; slide += 1) {
      const hash = await page.evaluate(
        (target) =>
          new Promise<string>((resolve) => {
            window.addEventListener('hashchange', () => resolve(window.location.hash), {
              once: true,
            })
            window.location.hash = target
          }),
        `#${slide}.99999`
      )
      beats.push((parsePosition(hash)?.beat ?? 0) + 1)
    }
    return { beats, width: canvas.width, height: canvas.height }
  } finally {
    await context.close()
  }
}

async function openFilm(
  browser: Browser,
  url: string,
  shape: DeckShape,
  options: { scale: number; seed?: number | undefined; reportErrors?: boolean }
): Promise<{ context: BrowserContext; film: Film }> {
  const context = await browser.newContext({
    viewport: { width: shape.width, height: shape.height },
    deviceScaleFactor: options.scale,
    reducedMotion: 'no-preference',
  })
  await prepareFilm(context, { seed: options.seed })
  const page = await context.newPage()
  if (options.reportErrors) {
    page.on('pageerror', (error) => process.emitWarning(`deck page error: ${error.message}`))
  }
  await page.goto(url)
  const film = await startFilm(page)
  await film.watch('.slide-container')
  return { context, film }
}

async function press(page: Page): Promise<string> {
  // Advancing from a focused control would hand the key to the content.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.())
  await page.keyboard.press('Space')
  return readHash(page)
}

/**
 * Runs the deck once without capturing to decide every advance: beat
 * holds from the timeline, and push widgets filmed until they go quiet.
 * Every capture worker then replays this exact script.
 */
export async function planRender(
  browser: Browser,
  url: string,
  shape: DeckShape,
  timeline: Timeline,
  options: {
    seed?: number | undefined
    onProgress?: RenderOptions['onProgress']
    signal?: AbortSignal | undefined
  } = {}
): Promise<RenderPlan> {
  const { first, last } = clampSlideRange(timeline.slides, shape.beats.length)
  const { fps } = timeline
  const { context, film } = await openFilm(browser, `${url}#${first}`, shape, {
    scale: timeline.scale,
    seed: options.seed,
    reportErrors: true,
  })
  try {
    const presses: Press[] = []
    const history: number[] = []
    const observed: RenderPlan['observed'] = []
    let frames = 0
    const shoot = async (count: number) => {
      const seen = { mutations: 0, quiet: 0 }
      for (let index = 0; index < count; index += 1) {
        options.signal?.throwIfAborted()
        const step = await film.advance(frameStep(frames, fps), false)
        history.push(step.mutations)
        observed[frames] = { mutations: step.mutations, running: step.running }
        frames += 1
        seen.mutations += step.mutations
        seen.quiet = step.mutations === 0 && step.running === 0 ? seen.quiet + 1 : 0
        if (frames % 30 === 0) options.onProgress?.({ phase: 'plan', frame: frames, frames: 0 })
      }
      return seen
    }
    const recent = (count: number) => history.slice(-count).reduce((sum, value) => sum + value, 0)

    const deckEnd = { slide: shape.beats.length, beat: (shape.beats.at(-1) ?? 1) - 1 }
    let position = { slide: first, beat: 0 }
    let claimed = 0
    await shoot(Math.max(1, framesFor(holdFor(timeline, position.slide, position.beat), fps)))

    for (;;) {
      const atDeckEnd = position.slide === deckEnd.slide && position.beat === deckEnd.beat
      const baseline = recent(framesFor(widgetProbeSeconds, fps))
      const hash = await press(film.page)
      const next = parsePosition(hash)
      if (!next) throw new RenderError(`the deck reported an unreadable position: ${hash}`)

      if (next.slide !== position.slide || next.beat !== position.beat) {
        if (next.slide > last) break
        presses.push({ frame: frames, hash })
        position = next
        claimed = 0
        await shoot(framesFor(holdFor(timeline, next.slide, next.beat), fps))
        continue
      }

      // The position held, so a push widget claimed the advance, unless this
      // is the deck's last beat, where an advance can also do nothing at all.
      const startedAt = frames
      claimed += 1
      if (claimed > widgetsPerPosition) {
        throw new RenderError(
          `slide ${position.slide} claimed ${widgetsPerPosition} advances in a row`
        )
      }
      const explicit = widgetHoldFor(timeline, position.slide, position.beat)
      if (atDeckEnd && explicit === undefined) {
        const probe = await shoot(framesFor(widgetProbeSeconds, fps))
        if (probe.mutations === 0 || baseline > 0) {
          frames = startedAt
          break
        }
      }
      presses.push({ frame: startedAt, hash })
      if (explicit !== undefined) {
        await shoot(framesFor(explicit, fps) - (frames - startedAt))
        continue
      }
      const quietFrames = framesFor(widgetQuietSeconds, fps)
      const limit = startedAt + framesFor(widgetLimitSeconds, fps)
      let quiet = 0
      while (quiet < quietFrames && frames < limit) {
        quiet = (await shoot(1)).quiet ? quiet + 1 : 0
      }
      await shoot(framesFor(holdFor(timeline, position.slide, position.beat), fps))
    }
    observed.length = frames
    return { frames, presses, observed, shape, first, last }
  } finally {
    await context.close()
  }
}

/** Replays a plan in `workers` parallel pages and sends every frame to the sink in order. */
export async function shootPlan(
  browser: Browser,
  url: string,
  plan: RenderPlan,
  timeline: Timeline,
  sink: FrameSink,
  options: {
    workers: number
    seed?: number | undefined
    onProgress?: RenderOptions['onProgress']
    signal?: AbortSignal | undefined
  }
) {
  const workers = Math.max(1, Math.min(options.workers, plan.frames))
  const ordered = orderedSink(sink, workers * 4)
  // Zero-second holds put several presses before the same frame.
  const pressAt = new Map<number, string[]>()
  for (const entry of plan.presses) {
    pressAt.set(entry.frame, [...(pressAt.get(entry.frame) ?? []), entry.hash])
  }
  const films = await Promise.all(
    Array.from({ length: workers }, () =>
      openFilm(browser, `${url}#${plan.first}`, plan.shape, {
        scale: timeline.scale,
        seed: options.seed,
      })
    )
  )
  let done = 0
  try {
    await Promise.all(
      films.map(async ({ film }, worker) => {
        for (let frame = 0; frame < plan.frames; frame += 1) {
          for (const expected of pressAt.get(frame) ?? []) {
            const hash = await press(film.page)
            if (hash !== expected) {
              throw new RenderError(
                `capture worker diverged from the plan at frame ${frame}: expected ${expected}, saw ${hash}`
              )
            }
          }
          const mine = frame % workers === worker
          if (mine) await ordered.reserve(frame)
          options.signal?.throwIfAborted()
          const step = await film.advance(frameStep(frame, timeline.fps), mine)
          const planned = plan.observed[frame]
          if (step.mutations !== planned?.mutations || step.running !== planned.running) {
            throw new RenderError(
              `capture worker diverged from the plan at frame ${frame}: planned ${planned?.mutations} mutations and ${planned?.running} running animations, saw ${step.mutations} and ${step.running}`
            )
          }
          if (!mine) continue
          await ordered.put(frame, await film.capture())
          done += 1
          options.onProgress?.({ phase: 'film', frame: done, frames: plan.frames })
        }
      })
    )
  } finally {
    await Promise.all(films.map(({ context }) => context.close()))
  }
}

/** Fails before any browser starts when the output cannot be written. */
async function checkOutput(options: RenderOptions) {
  if (options.frames) {
    const existing = await readdir(options.frames).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return []
      throw new RenderError(`cannot read ${options.frames}: ${error.message}`)
    })
    if (existing.length > 0) {
      throw new RenderError(
        `${options.frames} is not empty; frames go into a new or empty directory so no stale frame survives`
      )
    }
    return options.frames
  }
  if (!options.out) throw new RenderError('set out (an MP4 path) or frames (a directory)')
  const parent = dirname(options.out)
  await access(parent, constants.W_OK).catch(() => {
    throw new RenderError(`cannot write to ${parent}: it must exist and be writable`)
  })
  return options.out
}

/** Films a built deck into an MP4 (or a PNG sequence) on a virtual clock. */
export async function renderDeck(options: RenderOptions): Promise<RenderResult> {
  const startedAt = performance.now()
  const { timeline, signal } = options
  const output = await checkOutput(options)
  if (!options.frames) assertFfmpeg()
  signal?.throwIfAborted()
  const url = pathToFileURL(options.file).href
  const browser = await launchBrowser(options.channel)
  // Closing the browser unblocks whatever page call is in flight, so the
  // render unwinds (and removes its partial output) promptly.
  const stop = () => void browser.close().catch(() => undefined)
  signal?.addEventListener('abort', stop, { once: true })
  try {
    const shape = await probeDeck(browser, url)
    const width = shape.width * timeline.scale
    const height = shape.height * timeline.scale
    if (!options.frames && (!Number.isInteger(width / 2) || !Number.isInteger(height / 2))) {
      throw new RenderError(`H.264 needs even dimensions; ${width}x${height} is not`)
    }
    const plan = await planRender(browser, url, shape, timeline, options)
    if (plan.frames === 0) throw new RenderError('the timeline produced no frames')
    const sink = options.frames
      ? await openFrameDirectory(options.frames)
      : openVideoSink({ out: output, fps: timeline.fps, crf: options.crf })
    try {
      await shootPlan(browser, url, plan, timeline, sink, {
        workers: options.workers ?? defaultWorkers(),
        seed: options.seed,
        onProgress: options.onProgress,
        signal,
      })
      signal?.throwIfAborted()
      await sink.close()
    } catch (error) {
      await sink.abort()
      throw signal?.aborted ? new RenderError('render interrupted; partial output removed') : error
    }
    return {
      frames: plan.frames,
      seconds: plan.frames / timeline.fps,
      width,
      height,
      output,
      elapsedMs: performance.now() - startedAt,
    }
  } catch (error) {
    if (signal?.aborted && !(error instanceof RenderError)) {
      throw new RenderError('render interrupted before any output was written')
    }
    throw error
  } finally {
    signal?.removeEventListener('abort', stop)
    await browser.close().catch(() => undefined)
  }
}
