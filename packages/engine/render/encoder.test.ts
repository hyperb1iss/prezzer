import { describe, expect, test } from 'bun:test'
import { type FrameSink, orderedSink, videoArguments } from './encoder'

function memorySink() {
  const frames: number[] = []
  const sink: FrameSink = {
    async write(frame) {
      frames.push(frame[0] ?? -1)
    },
    async close() {},
    abort() {},
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
      abort() {},
    }
    const ordered = orderedSink(failing, 4)
    await expect(ordered.put(0, frame(0))).rejects.toThrow('disk full')
    await expect(ordered.reserve(1)).rejects.toThrow('disk full')
  })
})
