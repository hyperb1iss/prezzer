import type { BrowserContext, CDPSession, Page } from 'playwright-core'

/** What one film step observed inside the page. */
export interface FilmStep {
  /** Film time in milliseconds since `startFilm` */
  time: number
  /** Structural or text mutations inside the watched subtree since the previous step */
  mutations: number
  /** Animations with a finite end that are still progressing */
  running: number
}

export interface FilmOptions {
  /** Seed for the page's Math.random and crypto.getRandomValues */
  seed?: number | undefined
  /** Wall-clock instant the page sees as `new Date()` */
  time?: Date | undefined
}

export type CaptureFormat = 'png' | 'jpeg'

export interface CaptureOptions {
  format?: CaptureFormat | undefined
  /** JPEG quality, 0 to 100 */
  quality?: number | undefined
}

export interface Film {
  readonly page: Page
  /** Current film time in milliseconds */
  readonly time: number
  /**
   * Advance the virtual clock, then pin every animation and video to the
   * new time. Pass `captured: false` when no capture follows this step;
   * page state is identical either way, but videos skip the decode.
   */
  advance(ms: number, captured?: boolean): Promise<FilmStep>
  /** Screenshot the viewport at the current film time */
  capture(): Promise<Uint8Array>
  /** Count mutations only inside elements matching this selector */
  watch(selector: string | null): Promise<void>
}

interface FilmRuntime {
  ready(): Promise<void>
  tick(ms: number, captured: boolean): Promise<FilmStep>
  watch(selector: string | null): void
}

/**
 * Runs inside the page before any page script and owns every source of
 * time: timers, animation frames, Date, and performance.now() run on a
 * virtual clock; Web Animations and CSS animations, which the compositor
 * would otherwise advance in real time, are pinned to it; media elements
 * seek to it; randomness is seeded. Must stay self-contained, because
 * Playwright serializes it by source.
 */
function filmRuntime({ seed, epoch }: { seed: number; epoch: number }) {
  type Track = { start: number; rate: number; held: number | null; done: boolean }
  type MediaTrack = { playing: boolean; anchorFilm: number; anchorMedia: number; ended: boolean }
  type Timer = {
    id: number
    due: number
    callback: (...args: unknown[]) => void
    args: unknown[]
    interval: number | null
    nesting: number
  }

  const nativeFrame = window.requestAnimationFrame.bind(window)
  const nativeTimeout = window.setTimeout.bind(window)

  let state = seed >>> 0 || 0x9e3779b9
  const nextRandom = () => {
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state
  }
  Math.random = () => nextRandom() / 4294967296
  if (globalThis.crypto) {
    crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
      if (array) {
        const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength)
        for (let index = 0; index < bytes.length; index += 1) bytes[index] = nextRandom() & 0xff
      }
      return array
    }
    crypto.randomUUID = () => {
      const hex = Array.from({ length: 16 }, () =>
        (nextRandom() & 0xff).toString(16).padStart(2, '0')
      )
      hex[6] = `4${hex[6]?.[1] ?? '0'}`
      hex[8] = ((Number.parseInt(hex[8] ?? '0', 16) & 0x3f) | 0x80).toString(16).padStart(2, '0')
      const text = hex.join('')
      return `${text.slice(0, 8)}-${text.slice(8, 12)}-${text.slice(12, 16)}-${text.slice(16, 20)}-${text.slice(20)}` as `${string}-${string}-${string}-${string}-${string}`
    }
  }

  // Film time in milliseconds. It only moves inside tick(), and every timer
  // fires at its exact due time with the page drained to quiet in between,
  // so how fast the machine runs can never reorder page work.
  let clock = 0
  let changes = 0
  const now = () => clock

  const timers = new Map<number, Timer>()
  let nextTimer = 1
  let nesting = 0
  const schedule = (handler: unknown, delay: unknown, args: unknown[], repeat: boolean) => {
    // String handlers are a legacy eval path no deck uses; they never run.
    const callback =
      typeof handler === 'function' ? (handler as Timer['callback']) : () => undefined
    // The HTML clamp: deeply nested zero-delay timers wait 4 ms, which also
    // keeps a self-rescheduling timer from spinning forever at one instant.
    let ms = Math.max(0, Number(delay) || 0)
    if (nesting >= 5 && ms < 4) ms = 4
    const id = nextTimer
    nextTimer += 1
    timers.set(id, {
      id,
      due: clock + ms,
      callback,
      args,
      interval: repeat ? Math.max(ms, 1) : null,
      nesting: nesting + 1,
    })
    changes += 1
    return id
  }
  const clear = (id: unknown) => {
    timers.delete(Number(id))
  }
  const fake = window as unknown as Record<string, unknown>
  fake.setTimeout = (handler: unknown, delay?: unknown, ...args: unknown[]) =>
    schedule(handler, delay, args, false)
  fake.setInterval = (handler: unknown, delay?: unknown, ...args: unknown[]) =>
    schedule(handler, delay, args, true)
  fake.clearTimeout = clear
  fake.clearInterval = clear
  fake.requestIdleCallback = (callback: IdleRequestCallback) =>
    schedule(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 0, [], false)
  fake.cancelIdleCallback = clear

  let frames = new Map<number, FrameRequestCallback>()
  let nextFrame = 1
  fake.requestAnimationFrame = (callback: FrameRequestCallback) => {
    const id = nextFrame
    nextFrame += 1
    frames.set(id, callback)
    changes += 1
    return id
  }
  fake.cancelAnimationFrame = (id: number) => {
    frames.delete(id)
  }

  performance.now = () => clock
  const NativeDate = Date
  function FilmDate(this: unknown, ...args: unknown[]) {
    if (!new.target) return new NativeDate(epoch + clock).toString()
    return args.length === 0
      ? new NativeDate(epoch + clock)
      : new (NativeDate as unknown as new (...values: unknown[]) => Date)(...args)
  }
  FilmDate.prototype = NativeDate.prototype
  FilmDate.now = () => epoch + clock
  FilmDate.parse = NativeDate.parse
  FilmDate.UTC = NativeDate.UTC
  fake.Date = FilmDate

  const report = (error: unknown) => {
    if (typeof reportError === 'function') reportError(error)
    else
      queueMicrotask(() => {
        throw error
      })
  }

  const tracks = new WeakMap<Animation, Track>()
  const proto = Animation.prototype
  const describe = (name: string) => Object.getOwnPropertyDescriptor(proto, name)
  const currentTime = describe('currentTime')
  const startTime = describe('startTime')
  const playbackRate = describe('playbackRate')
  const nativePause = proto.pause
  const nativePlay = proto.play
  const nativeFinish = proto.finish
  const nativeCancel = proto.cancel
  const setCurrent = (animation: Animation, value: number) =>
    currentTime?.set?.call(animation, value)
  const local = (track: Track, at: number) => track.held ?? (at - track.start) * track.rate
  const endOf = (animation: Animation) => {
    const end = animation.effect?.getComputedTiming().endTime
    return typeof end === 'number' ? end : Number(end ?? 0)
  }

  const track = (animation: Animation, start: number) => {
    const entry: Track = { start, rate: animation.playbackRate, held: null, done: false }
    tracks.set(animation, entry)
    nativePause.call(animation)
    return entry
  }

  // Script-made animations are adopted at creation; CSS animations and
  // transitions are adopted once the work that started them settles.
  const nativeAnimate = Element.prototype.animate
  Element.prototype.animate = function (this: Element, ...args: Parameters<Element['animate']>) {
    const animation = nativeAnimate.apply(this, args)
    track(animation, now())
    setCurrent(animation, 0)
    return animation
  }

  proto.play = function (this: Animation) {
    const entry = tracks.get(this)
    if (!entry) return nativePlay.call(this)
    const at = now()
    let time = local(entry, at)
    if (entry.done || (entry.rate > 0 && time >= endOf(this)) || (entry.rate < 0 && time <= 0)) {
      time = entry.rate < 0 ? endOf(this) : 0
      entry.done = false
      nativePause.call(this)
    }
    entry.held = null
    entry.start = at - time / entry.rate
    setCurrent(this, time)
  }
  proto.pause = function (this: Animation) {
    const entry = tracks.get(this)
    if (entry && entry.held === null && !entry.done) entry.held = local(entry, now())
    nativePause.call(this)
  }
  proto.finish = function (this: Animation) {
    const entry = tracks.get(this)
    if (entry) entry.done = true
    nativeFinish.call(this)
  }
  proto.cancel = function (this: Animation) {
    tracks.delete(this)
    nativeCancel.call(this)
  }
  Object.defineProperty(proto, 'currentTime', {
    configurable: true,
    get(this: Animation) {
      return currentTime?.get?.call(this)
    },
    set(this: Animation, value: number | null) {
      const entry = tracks.get(this)
      if (entry && typeof value === 'number') {
        if (entry.held !== null) entry.held = value
        else entry.start = now() - value / entry.rate
        entry.done = false
      }
      setCurrent(this, value as number)
    },
  })
  // Motion syncs WAAPI start times to its frameloop clock, which is the fake
  // clock and not the document timeline. Tracked animations ignore it.
  Object.defineProperty(proto, 'startTime', {
    configurable: true,
    get(this: Animation) {
      return startTime?.get?.call(this)
    },
    set(this: Animation, value: number | null) {
      if (!tracks.has(this)) startTime?.set?.call(this, value)
    },
  })
  Object.defineProperty(proto, 'playbackRate', {
    configurable: true,
    get(this: Animation) {
      return playbackRate?.get?.call(this)
    },
    set(this: Animation, value: number) {
      const entry = tracks.get(this)
      if (entry && value !== 0) {
        const at = now()
        const time = local(entry, at)
        entry.rate = value
        if (entry.held === null) entry.start = at - time / value
      }
      playbackRate?.set?.call(this, value)
      if (entry && !entry.done) nativePause.call(this)
    },
  })

  const media = new Map<HTMLMediaElement, MediaTrack>()
  const mediaProto = HTMLMediaElement.prototype
  const mediaTime = Object.getOwnPropertyDescriptor(mediaProto, 'currentTime')
  const mediaPaused = Object.getOwnPropertyDescriptor(mediaProto, 'paused')
  const mediaEnded = Object.getOwnPropertyDescriptor(mediaProto, 'ended')
  const nativeMediaPause = mediaProto.pause
  const getMediaTime = (element: HTMLMediaElement) => Number(mediaTime?.get?.call(element) ?? 0)
  const fire = (element: HTMLMediaElement, type: string) =>
    queueMicrotask(() => element.dispatchEvent(new Event(type)))
  const mediaTrack = (element: HTMLMediaElement) => {
    let entry = media.get(element)
    if (!entry) {
      entry = {
        playing: false,
        anchorFilm: now(),
        anchorMedia: getMediaTime(element),
        ended: false,
      }
      media.set(element, entry)
    }
    return entry
  }
  const mediaPosition = (element: HTMLMediaElement, entry: MediaTrack, at: number) => {
    if (!entry.playing) return entry.anchorMedia
    return entry.anchorMedia + ((at - entry.anchorFilm) / 1000) * element.playbackRate
  }

  // Playback is simulated: the element stays natively paused and every step
  // seeks it to film time, so decode speed never leaks into the frames.
  mediaProto.play = function (this: HTMLMediaElement) {
    const entry = mediaTrack(this)
    nativeMediaPause.call(this)
    if (!entry.playing) {
      if (entry.ended) {
        entry.anchorMedia = 0
        entry.ended = false
      } else {
        entry.anchorMedia = getMediaTime(this)
      }
      entry.anchorFilm = now()
      entry.playing = true
      fire(this, 'play')
      fire(this, 'playing')
    }
    return Promise.resolve()
  }
  mediaProto.pause = function (this: HTMLMediaElement) {
    const entry = media.get(this)
    if (entry?.playing) {
      entry.anchorMedia = mediaPosition(this, entry, now())
      entry.playing = false
      fire(this, 'pause')
    }
    nativeMediaPause.call(this)
  }
  Object.defineProperty(mediaProto, 'paused', {
    configurable: true,
    get(this: HTMLMediaElement) {
      const entry = media.get(this)
      return entry ? !entry.playing : mediaPaused?.get?.call(this)
    },
  })
  Object.defineProperty(mediaProto, 'ended', {
    configurable: true,
    get(this: HTMLMediaElement) {
      const entry = media.get(this)
      return entry ? entry.ended : mediaEnded?.get?.call(this)
    },
  })
  Object.defineProperty(mediaProto, 'currentTime', {
    configurable: true,
    get(this: HTMLMediaElement) {
      const entry = media.get(this)
      return entry ? mediaPosition(this, entry, now()) : getMediaTime(this)
    },
    set(this: HTMLMediaElement, value: number) {
      const entry = media.get(this)
      if (!entry) {
        mediaTime?.set?.call(this, value)
        return
      }
      // The next captured frame seeks the picture; the page hears the seek now.
      entry.anchorMedia = value
      entry.anchorFilm = now()
      entry.ended = false
      fire(this, 'seeking')
      fire(this, 'timeupdate')
      fire(this, 'seeked')
    },
  })

  const settle = <T>(promise: Promise<T>, ms: number) =>
    Promise.race([promise, new Promise<void>((resolve) => nativeTimeout(resolve, ms))])
  const once = (element: HTMLMediaElement, events: string[]) =>
    new Promise<void>((resolve) => {
      const done = () => {
        for (const type of events) element.removeEventListener(type, done)
        resolve()
      }
      for (const type of events) element.addEventListener(type, done, { once: true })
    })

  // A filmed element only ever moves by renderer seeks, so every native
  // event it fires (seeking, seeked, timeupdate, ended, and the rest) is an
  // artifact of which frames this page captures. Those stay invisible: pages
  // that capture different frames would otherwise drift apart. The page
  // hears the film clock's own synthetic events instead.
  const seeks = new WeakMap<HTMLMediaElement, () => void>()
  const nativeOnly = [
    'seeking',
    'seeked',
    'timeupdate',
    'ended',
    'play',
    'playing',
    'pause',
    'waiting',
    'canplay',
    'canplaythrough',
  ]
  for (const type of [...nativeOnly, 'error']) {
    window.addEventListener(
      type,
      (event) => {
        const target = event.target
        if (!(target instanceof HTMLMediaElement) || !event.isTrusted) return
        if (type === 'seeked' || type === 'error') {
          seeks.get(target)?.()
          seeks.delete(target)
        }
        if (type !== 'error' && media.has(target)) event.stopImmediatePropagation()
      },
      true
    )
  }
  const seek = (element: HTMLMediaElement, time: number) =>
    settle(
      new Promise<void>((resolve) => {
        seeks.set(element, resolve)
        mediaTime?.set?.call(element, time)
      }),
      5000
    ).then(() => {
      seeks.delete(element)
    })

  const syncVideo = async (element: HTMLVideoElement, at: number, captured: boolean) => {
    // Autoplay starts natively before any script can intervene; adopt it
    // from zero so the first frame does not depend on decode timing.
    let entry = media.get(element)
    if (!entry && !mediaPaused?.get?.call(element)) {
      nativeMediaPause.call(element)
      entry = { playing: true, anchorFilm: clock, anchorMedia: 0, ended: false }
      media.set(element, entry)
    }
    if (!entry) {
      if (captured) await waitForPicture(element)
      return
    }
    const duration = element.duration
    let target = mediaPosition(element, entry, at)
    if (Number.isFinite(duration) && duration > 0) {
      if (element.loop) {
        target %= duration
      } else if (target >= duration) {
        target = duration
        if (entry.playing) {
          entry.playing = false
          entry.anchorMedia = duration
          entry.ended = true
          fire(element, 'pause')
          fire(element, 'ended')
        }
      }
    }
    // The page hears time pass once per frame, identically in every worker.
    if (entry.playing) fire(element, 'timeupdate')
    // Only a captured frame needs the decoded picture.
    if (!captured) return
    await waitForPicture(element)
    // A hair past the frame boundary so float error never lands on the
    // previous decoded frame, but never past the end.
    target = Math.max(0, Math.min(target + 0.0005, duration || Number.POSITIVE_INFINITY))
    if (Math.abs(getMediaTime(element) - target) < 0.0001) return
    await seek(element, target)
  }

  // Decode arrives in real time, so a frame must never be captured before
  // the element has a picture to show.
  const waitForPicture = async (element: HTMLMediaElement) => {
    if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA || !element.currentSrc) return
    await settle(once(element, ['loadeddata', 'error']), 5000)
  }

  let watchSelector: string | null = null
  let mutations = 0
  const observer = new MutationObserver((records) => {
    changes += records.length
    for (const record of records) {
      if (record.type === 'attributes') continue
      const node = record.target
      const element = node instanceof Element ? node : node.parentElement
      if (!watchSelector || element?.closest(watchSelector)) mutations += 1
    }
  })
  observer.observe(document, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
  })

  const syncAnimations = (at: number, anchor: number) => {
    let finished = 0
    let running = 0
    let adopted = 0
    for (const animation of document.getAnimations()) {
      let entry = tracks.get(animation)
      if (!entry) {
        if (animation.playState === 'finished') continue
        const held = animation.playState === 'paused' ? Number(animation.currentTime ?? 0) : null
        entry = track(animation, anchor)
        entry.held = held
        adopted += 1
      }
      if (entry.done) continue
      const end = endOf(animation)
      const time = local(entry, at)
      if ((entry.rate > 0 && time >= end) || (entry.rate < 0 && time <= 0)) {
        entry.done = true
        nativeFinish.call(animation)
        finished += 1
        continue
      }
      setCurrent(animation, Math.max(0, time))
      if (Number.isFinite(end) && entry.held === null) running += 1
    }
    return { finished, running, adopted }
  }

  const frame = () => new Promise<void>((resolve) => nativeFrame(() => resolve()))
  const macrotask = () =>
    new Promise<void>((resolve) => {
      const channel = new MessageChannel()
      channel.port1.onmessage = () => resolve()
      channel.port2.postMessage(0)
    })
  // Lets everything a callback set in motion (React renders and effects,
  // Motion starts, follow-up tasks) run to completion before film time moves.
  const drain = async () => {
    let quiet = 0
    for (let round = 0; round < 64 && quiet < 2; round += 1) {
      const before = changes
      await macrotask()
      quiet = changes === before ? quiet + 1 : 0
    }
  }
  // Adopts CSS animations and transitions the moment the work that started
  // them settles, so they anchor to the exact film time that caused them.
  const adopt = () => {
    for (const animation of document.getAnimations()) {
      if (tracks.has(animation) || animation.playState === 'finished') continue
      const held = animation.playState === 'paused' ? Number(animation.currentTime ?? 0) : null
      const entry = track(animation, clock)
      entry.held = held
      if (held === null) setCurrent(animation, 0)
    }
  }

  // Fonts and images load in real time too, so anything new must finish
  // decoding before the frame that shows it. An image can be complete yet
  // undecoded, and Chromium paints it blank until an off-thread decode
  // lands, so each one is decoded once up front.
  const decoded = new WeakSet<HTMLImageElement>()
  const loadAssets = async () => {
    // Faces load lazily on first use during layout, so lay out first or a
    // newly mounted slide can paint a fallback font for a frame.
    void document.documentElement?.offsetHeight
    if (document.fonts.status === 'loading') await settle(document.fonts.ready, 10000)
    const images = [...document.images].filter((image) => !decoded.has(image) && image.src)
    if (images.length === 0) return 0
    await settle(
      Promise.all(
        images.map((image) =>
          image
            .decode()
            .catch(() => undefined)
            .then(() => decoded.add(image))
        )
      ),
      10000
    )
    return images.length
  }

  const fireTimers = async (target: number) => {
    for (let fired = 0; ; fired += 1) {
      if (fired > 100_000) throw new Error('timers kept firing without film time advancing')
      let next: Timer | undefined
      for (const timer of timers.values()) {
        if (timer.due > target) continue
        if (!next || timer.due < next.due || (timer.due === next.due && timer.id < next.id)) {
          next = timer
        }
      }
      if (!next) return
      clock = Math.max(clock, next.due)
      if (next.interval === null) timers.delete(next.id)
      else next.due += next.interval
      nesting = next.nesting
      try {
        next.callback.apply(window, next.args)
      } catch (error) {
        report(error)
      }
      nesting = 0
      await drain()
      adopt()
    }
  }

  const step = async (captured: boolean): Promise<FilmStep> => {
    const at = clock
    await loadAssets()
    let sync = syncAnimations(at, at)
    const videos = [...document.querySelectorAll('video')]
    await Promise.all(videos.map((video) => syncVideo(video, at, captured)))
    for (const element of media.keys()) if (!element.isConnected) media.delete(element)
    // Finish events dispatch on the next rendering update, and the work they
    // trigger (Motion commits, AnimatePresence unmounts, React renders, the
    // CSS transitions and images those renders bring) must land inside this
    // step, never in the gap before the capture.
    let quiet = 0
    for (let round = 0; round < 16 && quiet < 2; round += 1) {
      if (sync.finished > 0) await frame()
      const before = changes
      await macrotask()
      const images = await loadAssets()
      sync = syncAnimations(at, at)
      const settled = sync.finished === 0 && sync.adopted === 0 && images === 0
      quiet = settled && changes === before ? quiet + 1 : 0
    }
    const observed = mutations
    mutations = 0
    return { time: at, mutations: observed, running: sync.running }
  }

  const runtime: FilmRuntime = {
    async ready() {
      // Load every declared face up front; slides that mount later would
      // otherwise trigger their first font loads mid-film.
      await settle(
        Promise.all([...document.fonts].map((face) => face.load().catch(() => undefined))),
        10000
      )
      await loadAssets()
      // The deck may still be mounting when the load event fires.
      await drain()
      adopt()
    },
    watch(selector) {
      watchSelector = selector
      mutations = 0
    },
    async tick(ms, captured) {
      // Input since the previous tick (a key press) started its animations now.
      adopt()
      const target = clock + Math.max(0, ms)
      await fireTimers(target)
      clock = target
      const batch = frames
      frames = new Map()
      for (const callback of batch.values()) {
        try {
          callback(clock)
        } catch (error) {
          report(error)
        }
      }
      await drain()
      adopt()
      return step(captured)
    },
  }
  ;(window as Window & { __prezzerFilm?: FilmRuntime }).__prezzerFilm = runtime
}

/**
 * Prepares a fresh browser context for deterministic filming: seeds
 * randomness, puts the page on a virtual clock, and takes control of
 * animation and media time. Call it before opening any page in the context.
 */
export async function prepareFilm(context: BrowserContext, options: FilmOptions = {}) {
  const epoch = (options.time ?? new Date('2026-01-01T00:00:00Z')).getTime()
  await context.addInitScript(filmRuntime, { seed: options.seed ?? 0x9e3779b9, epoch })
}

type RuntimeCall = { method: 'ready' } | { method: 'tick'; ms: number; captured: boolean }

const call = <T>(page: Page, request: RuntimeCall): Promise<T> =>
  page.evaluate(async (message: RuntimeCall) => {
    const runtime = (window as Window & { __prezzerFilm?: FilmRuntime }).__prezzerFilm
    if (!runtime) throw new Error('film runtime missing: call prepareFilm before opening the page')
    if (message.method === 'tick') return runtime.tick(message.ms, message.captured)
    return runtime.ready()
  }, request) as Promise<T>

async function screenshot(session: CDPSession, options: CaptureOptions) {
  const format = options.format ?? 'png'
  const result = await session.send('Page.captureScreenshot', {
    format,
    ...(format === 'jpeg' ? { quality: options.quality ?? 95 } : {}),
    optimizeForSpeed: true,
    captureBeyondViewport: false,
  })
  return Uint8Array.fromBase64(result.data)
}

/**
 * Waits for fonts, images, and the page's own startup work, then returns
 * the controller that steps and captures the page at film time zero. Drive
 * it frame by frame: `advance(dt, captured)` and then, when captured,
 * `capture()`. The first frame is `advance(0, captured)`.
 */
export async function startFilm(page: Page, capture: CaptureOptions = {}): Promise<Film> {
  const session = await page.context().newCDPSession(page)
  // A fresh CDP session captures at 1x and resets the page to 1x unless it
  // carries its own metrics override, so mirror the page's metrics onto it.
  const metrics = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    deviceScaleFactor: window.devicePixelRatio,
  }))
  await session.send('Emulation.setDeviceMetricsOverride', { ...metrics, mobile: false })
  // The first raster of a page can differ subtly from later ones, so every
  // page pays one discarded capture before film time starts.
  await screenshot(session, capture)
  await call(page, { method: 'ready' })
  let time = 0
  return {
    page,
    get time() {
      return time
    },
    async advance(ms, captured = true) {
      const step = await call<FilmStep>(page, { method: 'tick', ms, captured })
      time = step.time
      return step
    },
    capture: () => screenshot(session, capture),
    async watch(selector) {
      await page.evaluate((value) => {
        const runtime = (window as Window & { __prezzerFilm?: FilmRuntime }).__prezzerFilm
        runtime?.watch(value)
      }, selector)
    },
  }
}
