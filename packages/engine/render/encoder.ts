import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Receives PNG frames in film order. */
export interface FrameSink {
  write(frame: Uint8Array): Promise<void>
  /** Flush and finish the output */
  close(): Promise<void>
  /** Stop without finishing; the output is incomplete */
  abort(): void
}

export interface VideoOptions {
  out: string
  fps: number
  /** x264 constant rate factor; 18 is visually lossless for slides */
  crf?: number | undefined
}

export class EncoderError extends Error {
  override name = 'EncoderError'
}

/** Throws a clear error when ffmpeg is not on PATH. */
export function assertFfmpeg(): void {
  const probe = spawnSync('ffmpeg', ['-hide_banner', '-version'], { stdio: 'ignore' })
  if (probe.error || probe.status !== 0) {
    throw new EncoderError(
      'prezzer render needs ffmpeg on PATH to write video (brew install ffmpeg, apt install ffmpeg, or winget install ffmpeg); --frames <dir> writes PNGs without it'
    )
  }
}

/**
 * The ffmpeg arguments for an H.264 MP4 from piped PNG frames. Screenshots
 * are full-range sRGB; the scale filter converts with the BT.709 matrix to
 * limited range, and the color flags land in the H.264 VUI so players and
 * ffprobe see bt709 in-stream instead of guessing BT.601.
 */
export function videoArguments({ out, fps, crf = 18 }: VideoOptions): string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'image2pipe',
    '-framerate',
    `${fps}`,
    '-c:v',
    'png',
    '-i',
    'pipe:0',
    '-vf',
    [
      'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int',
      'format=yuv420p',
      // Tag the frames themselves; ffmpeg lets frame properties win over the
      // output flags below, and untagged frames ship as "unknown".
      'setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709:range=tv',
    ].join(','),
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    `${crf}`,
    '-colorspace',
    'bt709',
    '-color_primaries',
    'bt709',
    '-color_trc',
    'bt709',
    '-color_range',
    'tv',
    '-movflags',
    '+faststart',
    out,
  ]
}

/** Pipes frames straight into ffmpeg's stdin; no frame ever touches disk. */
export function openVideoSink(options: VideoOptions): FrameSink {
  const child: ChildProcess = spawn('ffmpeg', videoArguments(options), {
    stdio: ['pipe', 'ignore', 'pipe'],
  })
  const stdin = child.stdin
  if (!stdin) throw new EncoderError('ffmpeg did not open stdin')
  let stderr = ''
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr = `${stderr}${chunk}`.slice(-4000)
  })
  let failure: Error | null = null
  const exited = new Promise<number | null>((resolve) => {
    child.on('error', (error) => {
      failure = error
      resolve(null)
    })
    child.on('exit', (code) => resolve(code))
  })
  stdin.on('error', (error) => {
    failure ??= error
  })
  const describe = (code: number | null) =>
    new EncoderError(
      `ffmpeg exited with ${code ?? 'an error'}: ${stderr.trim() || failure?.message}`
    )

  return {
    async write(frame) {
      if (failure || child.exitCode !== null) throw describe(child.exitCode)
      if (!stdin.write(frame)) {
        await Promise.race([once(stdin, 'drain'), exited])
        if (failure || child.exitCode !== null) throw describe(child.exitCode)
      }
    },
    async close() {
      stdin.end()
      const code = await exited
      if (code !== 0) throw describe(code)
    },
    abort() {
      stdin.destroy()
      child.kill('SIGKILL')
    },
  }
}

/** Writes `frame-000000.png`, `frame-000001.png`, ... into a directory. */
export async function openFrameDirectory(directory: string): Promise<FrameSink> {
  await mkdir(directory, { recursive: true })
  let index = 0
  return {
    async write(frame) {
      await writeFile(join(directory, `frame-${String(index).padStart(6, '0')}.png`), frame)
      index += 1
    },
    async close() {},
    abort() {},
  }
}

/**
 * Accepts frames out of order (parallel workers) and forwards them to the
 * sink in order. A writer more than `window` frames ahead waits, so memory
 * stays bounded no matter how unevenly the workers run.
 */
export function orderedSink(sink: FrameSink, window: number) {
  const pending = new Map<number, Uint8Array>()
  const waiters: Array<{ index: number; resolve: () => void }> = []
  let next = 0
  let draining: Promise<void> = Promise.resolve()
  let failure: unknown = null

  const wake = () => {
    for (let at = waiters.length - 1; at >= 0; at -= 1) {
      const waiter = waiters[at]
      if (waiter && waiter.index < next + window) {
        waiters.splice(at, 1)
        waiter.resolve()
      }
    }
  }

  const drain = async () => {
    for (let frame = pending.get(next); frame; frame = pending.get(next)) {
      pending.delete(next)
      await sink.write(frame)
      next += 1
      wake()
    }
  }

  return {
    /** Resolves once frame `index` may be produced without overrunning the window. */
    async reserve(index: number) {
      if (failure) throw failure
      if (index < next + window) return
      await new Promise<void>((resolve) => waiters.push({ index, resolve }))
      if (failure) throw failure
    },
    async put(index: number, frame: Uint8Array) {
      if (failure) throw failure
      pending.set(index, frame)
      draining = draining.then(drain).catch((error: unknown) => {
        failure = error
        for (const waiter of waiters.splice(0)) waiter.resolve()
      })
      await draining
      if (failure) throw failure
    },
    get written() {
      return next
    },
  }
}
