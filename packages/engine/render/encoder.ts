import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'

/** Receives PNG frames in film order. */
export interface FrameSink {
  write(frame: Uint8Array): Promise<void>
  /** Flush and finish the output */
  close(): Promise<void>
  /** Stop without finishing and remove anything partial */
  abort(): Promise<void>
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

/**
 * The sibling file an encode writes before it is complete. It keeps the
 * output's extension so ffmpeg still picks the container from it, and it
 * stays hidden until a finished encode renames it over the output.
 */
export function partialPath(out: string): string {
  return join(dirname(out), `.${basename(out)}.${process.pid}.partial${extname(out)}`)
}

/**
 * Pipes frames straight into ffmpeg's stdin; no frame ever touches disk.
 * The encode writes a sibling partial file and renames it over `out` only
 * once ffmpeg finishes cleanly, so a failed or interrupted render leaves
 * the previous output untouched.
 */
export function openVideoSink(options: VideoOptions): FrameSink {
  const partial = partialPath(options.out)
  const child: ChildProcess = spawn('ffmpeg', videoArguments({ ...options, out: partial }), {
    stdio: ['pipe', 'ignore', 'pipe'],
  })
  const stdin = child.stdin
  if (!stdin) throw new EncoderError('ffmpeg did not open stdin')
  let stderr = ''
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr = `${stderr}${chunk}`.slice(-4000)
  })
  let failure: Error | null = null
  // close, not exit: close waits for stderr to drain, so errors arrive whole.
  const closed = new Promise<number | null>((resolve) => {
    child.on('error', (error) => {
      failure = error
      resolve(null)
    })
    child.on('close', (code) => resolve(code))
  })
  stdin.on('error', (error) => {
    failure ??= error
  })
  let finished = false
  const describe = async () => {
    const code = await Promise.race([closed, new Promise<null>((r) => setTimeout(r, 2000, null))])
    return new EncoderError(
      `ffmpeg exited with ${code ?? 'an error'}: ${stderr.trim() || failure?.message}`
    )
  }
  const discard = async () => {
    finished = true
    stdin.destroy()
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
    await closed
    await rm(partial, { force: true })
  }

  return {
    async write(frame) {
      if (failure || child.exitCode !== null) throw await describe()
      if (!stdin.write(frame)) {
        await Promise.race([once(stdin, 'drain'), closed])
        if (failure || child.exitCode !== null) throw await describe()
      }
    },
    async close() {
      stdin.end()
      const code = await closed
      if (code !== 0) {
        const error = await describe()
        await discard()
        throw error
      }
      finished = true
      await rename(partial, options.out)
    },
    async abort() {
      if (!finished) await discard()
    },
  }
}

/**
 * Writes `frame-000000.png`, `frame-000001.png`, ... into a directory. An
 * aborted sequence removes the frames it wrote and nothing else.
 */
export async function openFrameDirectory(directory: string): Promise<FrameSink> {
  await mkdir(directory, { recursive: true })
  const written: string[] = []
  return {
    async write(frame) {
      const path = join(directory, `frame-${String(written.length).padStart(6, '0')}.png`)
      await writeFile(path, frame)
      written.push(path)
    },
    async close() {},
    async abort() {
      await Promise.all(written.map((path) => rm(path, { force: true })))
    },
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
