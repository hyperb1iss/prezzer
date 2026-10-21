import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  type FrameSink,
  openVideoSink,
  orderedSink,
  partialPath,
  sweepStalePartials,
  videoArguments,
} from './encoder'

function memorySink() {
  const frames: number[] = []
  const sink: FrameSink = {
    async write(frame) {
      frames.push(frame[0] ?? -1)
    },
    async close() {},
    async abort() {},
  }
  return { sink, frames }
}

const frame = (index: number) => new Uint8Array([index])

describe('videoArguments', () => {
  test('encodes H.264 yuv420p with bt709 tagged on the frames and the stream', () => {
    const args = videoArguments({ out: 'talk.mp4', fps: 30 })
    const filters = args[args.indexOf('-vf') + 1] ?? ''
    // RGB to YUV must use the BT.709 matrix, or swscale silently picks BT.601.
    expect(filters).toContain('out_color_matrix=bt709')
    expect(filters).toContain('format=yuv420p')
    expect(filters).toContain('setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709')
    expect(args).toContain('libx264')
    expect(args[args.indexOf('-crf') + 1]).toBe('18')
    expect(args[args.indexOf('-framerate') + 1]).toBe('30')
    expect(args.at(-1)).toBe('talk.mp4')
  })

  test('passes a custom quality through', () => {
    const args = videoArguments({ out: 'a.mp4', fps: 60, crf: 12 })
    expect(args[args.indexOf('-crf') + 1]).toBe('12')
  })
})

describe('orderedSink', () => {
  test('forwards frames in film order however the workers deliver them', async () => {
    const { sink, frames } = memorySink()
    const ordered = orderedSink(sink, 8)
    await Promise.all([3, 1, 0, 2, 5, 4].map((index) => ordered.put(index, frame(index))))
    expect(frames).toEqual([0, 1, 2, 3, 4, 5])
    expect(ordered.written).toBe(6)
  })

  test('holds a runaway worker until the frames behind it are written', async () => {
    const { sink, frames } = memorySink()
    const ordered = orderedSink(sink, 2)
    let reserved = false
    const ahead = ordered.reserve(3).then(() => {
      reserved = true
    })
    await Promise.resolve()
    expect(reserved).toBe(false)
    await ordered.put(0, frame(0))
    await ordered.put(1, frame(1))
    await ahead
    expect(reserved).toBe(true)
    expect(frames).toEqual([0, 1])
  })

  test('surfaces a sink failure to every later caller', async () => {
    const failing: FrameSink = {
      async write() {
        throw new Error('disk full')
      },
      async close() {},
      async abort() {},
    }
    const ordered = orderedSink(failing, 4)
    await expect(ordered.put(0, frame(0))).rejects.toThrow('disk full')
    await expect(ordered.reserve(1)).rejects.toThrow('disk full')
  })
})

const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0

describe.skipIf(!hasFfmpeg)('openVideoSink output safety', () => {
  let scratch = ''
  let png = new Uint8Array()

  beforeAll(async () => {
    scratch = await mkdtemp(join(tmpdir(), 'prezzer-encoder-test-'))
    const still = spawnSync('ffmpeg', [
      ...['-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x80ffea:s=64x64'],
      ...['-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-'],
    ])
    png = new Uint8Array(still.stdout)
  })

  afterAll(async () => {
    if (scratch) await rm(scratch, { recursive: true, force: true })
  })

  const previous = 'the last good render'
  const leftovers = async () => (await readdir(scratch)).filter((name) => name.includes('partial'))

  test('encodes beside the output and replaces it only once ffmpeg finishes', async () => {
    const out = join(scratch, 'talk.mp4')
    await writeFile(out, previous)
    const sink = openVideoSink({ out, fps: 15 })
    for (let frame = 0; frame < 3; frame += 1) await sink.write(png)
    // Mid-encode, the previous render is still the file at the output path.
    expect(await readFile(out, 'utf8')).toBe(previous)
    expect(partialPath(out)).toStartWith(join(scratch, '.talk.mp4.'))
    await sink.close()
    const encoded = await readFile(out)
    expect(new TextDecoder().decode(encoded.subarray(4, 8))).toBe('ftyp')
    expect(await leftovers()).toEqual([])
  })

  test('an aborted encode removes its partial file and keeps the previous output', async () => {
    const out = join(scratch, 'aborted.mp4')
    await writeFile(out, previous)
    const sink = openVideoSink({ out, fps: 15 })
    await sink.write(png)
    await sink.abort()
    expect(await readFile(out, 'utf8')).toBe(previous)
    expect(await leftovers()).toEqual([])
  })

  test('a failed encode reports ffmpeg stderr and keeps the previous output', async () => {
    const out = join(scratch, 'failed.mp4')
    await writeFile(out, previous)
    const sink = openVideoSink({ out, fps: 15 })
    const garbage = new TextEncoder().encode('not a png frame')
    // ffmpeg may die mid-stream or only at close; either way the error
    // carries its own diagnostics.
    const failure = await (async () => {
      try {
        for (let attempt = 0; attempt < 50; attempt += 1) await sink.write(garbage)
        await sink.close()
      } catch (error) {
        return error
      }
      return null
    })()
    expect(failure).toBeInstanceOf(Error)
    expect(String(failure)).toContain('ffmpeg exited')
    await sink.abort()
    expect(await readFile(out, 'utf8')).toBe(previous)
    expect(await leftovers()).toEqual([])
  })
})

describe('sweepStalePartials', () => {
  test('removes partials left by dead renders and keeps live ones and real files', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'prezzer-sweep-test-'))
    try {
      // A process that has exited is a dead render's pid.
      const finished = Bun.spawnSync(['true'])
      const dead = finished.pid
      const out = join(scratch, 'talk.mp4')
      await writeFile(out, 'the last good render')
      await writeFile(join(scratch, `.talk.mp4.${dead}.partial.mp4`), 'abandoned')
      await writeFile(join(scratch, `.other.mp4.${dead}.partial.mp4`), 'abandoned too')
      await writeFile(join(scratch, `.talk.mp4.${process.pid}.partial.mp4`), 'still encoding')
      const removed = await sweepStalePartials(out)
      expect(removed.length).toBe(2)
      expect((await readdir(scratch)).sort()).toEqual(
        [`.talk.mp4.${process.pid}.partial.mp4`, 'talk.mp4'].sort()
      )
    } finally {
      await rm(scratch, { recursive: true, force: true })
    }
  })
})
