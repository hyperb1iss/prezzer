import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { launchBrowser, planRender, probeDeck, renderDeck } from './deck'
import { parseTimelineFile, resolveTimeline } from './timeline'

// These tests film the real demo deck, so they need a launchable Chromium
// (bunx playwright-core install --only-shell chromium), ffmpeg on PATH,
// and built engine packages. Missing any one skips them instead of failing.
const engineRoot = resolve(import.meta.dir, '..')
const demoRoot = resolve(engineRoot, '../../examples/demo')
const deck = join(demoRoot, 'dist/index.html')

async function canLaunch() {
  try {
    const browser = await launchBrowser()
    await browser.close()
    return true
  } catch {
    return false
  }
}

const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0
const enginesBuilt = existsSync(join(engineRoot, 'dist/index.js'))
const ready = hasFfmpeg && enginesBuilt && (await canLaunch())
if (!ready) {
  // CI's render job sets this so a broken install fails instead of skipping.
  if (process.env.PREZZER_RENDER_TESTS === 'required') {
    throw new Error(
      'render tests are required here but Chromium, ffmpeg, or built packages are missing'
    )
  }
  console.warn('skipping render tests: they need Chromium, ffmpeg, and built packages')
}

/** Decodes every PNG in a directory into one raw RGB buffer per frame. */
function decodeFrames(directory: string, width: number, height: number): Uint8Array[] {
  const decoded = spawnSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-i',
      join(directory, 'frame-%06d.png'),
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-',
    ],
    { maxBuffer: 1024 ** 3 }
  )
  const size = width * height * 3
  const frames: Uint8Array[] = []
  for (let offset = 0; offset + size <= decoded.stdout.length; offset += size) {
    frames.push(decoded.stdout.subarray(offset, offset + size))
  }
  return frames
}

/** Share of pixels where any channel moved by more than `threshold` levels. */
function changedShare(a: Uint8Array, b: Uint8Array, threshold: number): number {
  let changed = 0
  for (let index = 0; index < a.length; index += 3) {
    const delta = Math.max(
      Math.abs((a[index] ?? 0) - (b[index] ?? 0)),
      Math.abs((a[index + 1] ?? 0) - (b[index + 1] ?? 0)),
      Math.abs((a[index + 2] ?? 0) - (b[index + 2] ?? 0))
    )
    if (delta > threshold) changed += 1
  }
  return changed / (a.length / 3)
}

describe.skipIf(!ready)('prezzer render', () => {
  let scratch = ''

  beforeAll(async () => {
    scratch = await mkdtemp(join(tmpdir(), 'prezzer-render-test-'))
    const bake = spawnSync('bun', [join(engineRoot, 'bin/prezzer.ts'), 'build'], {
      cwd: demoRoot,
      encoding: 'utf8',
    })
    if (bake.status !== 0) throw new Error(`demo bake failed: ${bake.stderr}`)
  })

  afterAll(async () => {
    if (scratch) await rm(scratch, { recursive: true, force: true })
  })

  test('films identical frames on every run and with any number of workers', async () => {
    // Slide 4 reveals beats; slide 5 is a push widget that runs on its own timers.
    // Slide 5 holds long enough for its widget to mount before the advance.
    const timeline = resolveTimeline(
      parseTimelineFile({ fps: 15, scale: 0.5, hold: 0.4, slides: '4-5', holds: { '5': 1.2 } })
    )
    const solo = join(scratch, 'solo')
    const parallel = join(scratch, 'parallel')
    const first = await renderDeck({ file: deck, timeline, frames: solo, workers: 1 })
    const second = await renderDeck({ file: deck, timeline, frames: parallel, workers: 3 })

    expect(second.frames).toBe(first.frames)
    expect((await readdir(solo)).length).toBe(first.frames)
    const a = decodeFrames(solo, first.width, first.height)
    const b = decodeFrames(parallel, second.width, second.height)
    expect(a.length).toBe(first.frames)
    expect(b.length).toBe(first.frames)
    // Animation state is exact, but GPU raster is not: blurred glows wobble a
    // few levels and text on an animating layer can antialias differently.
    // That noise stays well under 1% of pixels in a frame, while a real
    // timing divergence moves whole slides (measured at 2% to 56%).
    const visible = a
      .map((frame, index) => ({ index, share: changedShare(frame, b[index] as Uint8Array, 32) }))
      .filter(({ share }) => share >= 0.01)
    expect(visible).toEqual([])
    // And the film actually moves: transitions, beats, and the widget.
    const distinct = new Set(a.map((frame) => Bun.hash(frame))).size
    expect(distinct).toBeGreaterThan(a.length / 2)
  }, 240_000)

  test('lets a push widget claim the advance and finish before the deck moves', async () => {
    const browser = await launchBrowser()
    try {
      const url = pathToFileURL(deck).href
      const shape = await probeDeck(browser, url)
      expect(shape).toMatchObject({ width: 1920, height: 1080 })
      expect(shape.beats).toEqual([1, 4, 4, 4, 1, 1, 1, 4, 4, 1])
      const timeline = resolveTimeline({ fps: 15, scale: 0.5, hold: 0.5, slides: '5' })
      const plan = await planRender(browser, url, shape, timeline)
      // The only press inside slide 5 starts the bake replay; the hash holds.
      expect(plan.presses).toEqual([{ frame: 8, hash: '#5' }])
      // Three replay lines land 700 ms apart, then the slide must stay quiet
      // for 1.5 s, then the beat's hold plays out.
      expect(plan.frames).toBeGreaterThanOrEqual(8 + Math.round((2.1 + 1.5 + 0.5) * 15))
      expect(plan.frames).toBeLessThan(8 + 30 * 15)
    } finally {
      await browser.close()
    }
  }, 120_000)

  test('an interrupted render leaves the previous output and no partial file', async () => {
    const timeline = resolveTimeline({ fps: 15, scale: 0.5, hold: 1, slides: '1' })
    const out = join(scratch, 'interrupted.mp4')
    await writeFile(out, 'the last good render')
    const interrupt = new AbortController()
    const render = renderDeck({
      file: deck,
      timeline,
      out,
      workers: 1,
      signal: interrupt.signal,
      // Interrupt once filming has written a few frames into the encoder.
      onProgress: ({ phase, frame }) => {
        if (phase === 'film' && frame === 5) interrupt.abort()
      },
    })
    await expect(render).rejects.toThrow('interrupted')
    expect(await readFile(out, 'utf8')).toBe('the last good render')
    expect((await readdir(scratch)).filter((name) => name.includes('partial'))).toEqual([])
  }, 120_000)

  test('refuses a frame directory that already holds files', async () => {
    const timeline = resolveTimeline({ fps: 15, scale: 0.5, hold: 1, slides: '1' })
    const frames = join(scratch, 'stale')
    await rm(frames, { recursive: true, force: true })
    await Bun.write(join(frames, 'frame-000099.png'), 'stale')
    await expect(renderDeck({ file: deck, timeline, frames, workers: 1 })).rejects.toThrow(
      'not empty'
    )
  })

  test('writes an H.264 MP4 tagged bt709 in-stream', async () => {
    const timeline = resolveTimeline({ fps: 15, scale: 0.5, hold: 1, slides: '1' })
    const out = join(scratch, 'title.mp4')
    const result = await renderDeck({ file: deck, timeline, out, workers: 1 })
    expect(result).toMatchObject({ frames: 15, width: 960, height: 540, output: out })

    const probe = spawnSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-count_frames',
        '-show_streams',
        '-of',
        'json',
        out,
      ],
      { encoding: 'utf8' }
    )
    const [stream] = JSON.parse(probe.stdout).streams
    expect(stream).toMatchObject({
      codec_name: 'h264',
      pix_fmt: 'yuv420p',
      width: 960,
      height: 540,
      r_frame_rate: '15/1',
      nb_read_frames: '15',
      color_range: 'tv',
      color_space: 'bt709',
      color_transfer: 'bt709',
      color_primaries: 'bt709',
    })
  }, 120_000)
})
