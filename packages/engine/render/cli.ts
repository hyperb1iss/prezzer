import { statfs } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { defaultWorkers, type RenderProgress, renderDeck } from './deck'
import { parseTimelineFile, resolveTimeline, type TimelineFile } from './timeline'

interface CliHooks {
  bake: (options: { entry: string; outdir: string; minify: boolean }) => Promise<string | null>
  fail: (message: string) => never
}

const color = (code: string) => (Bun.enableANSIColors ? code : '')
const purple = color('\x1b[38;2;225;53;255m')
const cyan = color('\x1b[38;2;128;255;234m')
const coral = color('\x1b[38;2;255;106;193m')
const green = color('\x1b[38;2;80;250;123m')
const muted = color('\x1b[2m')
const reset = color('\x1b[0m')

/** A source entry still loads its scripts by path; a baked deck carries them inline. */
export function isSourceEntry(html: string): boolean {
  return /<script\b[^>]*\bsrc\s*=\s*["'](?!data:|https?:)[^"']+\.(?:tsx?|jsx?|mjs)["']/i.test(html)
}

const valueFlags = new Set([
  '--out',
  '--frames',
  '--fps',
  '--scale',
  '--hold',
  '--slides',
  '--timeline',
  '--crf',
  '--workers',
  '--channel',
])

export interface RenderArguments {
  entry: string
  flags: Map<string, string>
}

export function parseRenderArguments(args: string[], fail: CliHooks['fail']): RenderArguments {
  const flags = new Map<string, string>()
  let entry: string | undefined
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index] ?? ''
    if (valueFlags.has(argument)) {
      const value = args[index + 1]
      if (value === undefined || value.startsWith('--')) fail(`${argument} needs a value`)
      flags.set(argument, value)
      index += 1
    } else if (argument.startsWith('-')) {
      fail(`unknown option: ${argument}`)
    } else if (entry === undefined) {
      entry = argument
    } else {
      fail(`unexpected argument: ${argument}`)
    }
  }
  if (flags.has('--out') && flags.has('--frames')) fail('--out and --frames are exclusive')
  return { entry: entry ?? 'index.html', flags }
}

function number(flags: Map<string, string>, flag: string, fail: CliHooks['fail']) {
  const raw = flags.get(flag)
  if (raw === undefined) return undefined
  const value = Number(raw)
  if (!Number.isFinite(value)) fail(`${flag} needs a number, got ${raw}`)
  return value
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

/**
 * A live status line on a terminal; elsewhere (an agent, a CI log) a plain
 * line every few seconds, so a long render visibly advances without
 * flooding the log.
 */
function progressLine() {
  const live = process.stderr.isTTY
  let last = 0
  let startedAt = 0
  let phase: RenderProgress['phase'] | null = null
  return {
    update(progress: RenderProgress) {
      const now = performance.now()
      const changed = progress.phase !== phase
      const finished = progress.phase === 'film' && progress.frame === progress.frames
      if (!changed && !finished && now - last < (live ? 100 : 5000)) return
      last = now
      phase = progress.phase
      if (progress.phase === 'plan') {
        const text = `planning · ${progress.frame} frames`
        process.stderr.write(live ? `\r\x1b[2K${muted}${text}${reset}` : `prezzer ${text}\n`)
        return
      }
      startedAt ||= now
      // A rate needs a second of filming behind it before it means anything.
      const elapsed = (now - startedAt) / 1000
      const rate = elapsed >= 1 ? progress.frame / elapsed : 0
      const eta = rate > 0 ? Math.round((progress.frames - progress.frame) / rate) : 0
      const pace = rate > 0 ? ` · ${rate.toFixed(1)} fps · ${eta}s left` : ''
      process.stderr.write(
        live
          ? `\r\x1b[2K${purple}filming${reset} ${cyan}${progress.frame}/${progress.frames}${reset}${muted}${pace}${reset}`
          : `prezzer filming ${progress.frame}/${progress.frames}${pace}\n`
      )
    },
    done() {
      if (live) process.stderr.write('\r\x1b[2K')
    },
  }
}

/** `prezzer render [deck] [options]` */
export async function render(args: string[], { bake, fail }: CliHooks) {
  const { entry, flags } = parseRenderArguments(args, fail)
  const entryPath = resolve(entry)
  const source = Bun.file(entryPath)
  if (!(await source.exists())) fail(`deck not found: ${entry}`)

  let built = entryPath
  if (isSourceEntry(await source.text())) {
    const baked = await bake({ entry, outdir: 'dist', minify: true })
    if (!baked) {
      process.exitCode = 1
      return
    }
    built = baked
  }

  let file: TimelineFile = {}
  const timelinePath = flags.get('--timeline')
  if (timelinePath) {
    const handle = Bun.file(resolve(timelinePath))
    if (!(await handle.exists())) fail(`timeline not found: ${timelinePath}`)
    try {
      file = parseTimelineFile(await handle.json())
    } catch (error) {
      fail(`${timelinePath}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const timeline = (() => {
    try {
      return resolveTimeline(file, {
        fps: number(flags, '--fps', fail),
        scale: number(flags, '--scale', fail),
        hold: number(flags, '--hold', fail),
        slides: flags.get('--slides'),
      })
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error))
    }
  })()

  const workers = number(flags, '--workers', fail) ?? defaultWorkers()
  if (!Number.isInteger(workers) || workers < 1) fail('--workers needs a whole number above zero')
  const crf = number(flags, '--crf', fail)
  if (crf !== undefined && (crf < 0 || crf > 51)) fail('--crf must be between 0 and 51')

  const frames = flags.get('--frames')
  const out = flags.get('--out') ?? join(dirname(built), `${basename(built, extname(built))}.mp4`)
  if (frames) {
    // A PNG sequence is roughly a megabyte per 1080p frame; refuse to fill the disk.
    const free = await statfs(dirname(resolve(frames))).then(
      (stats) => stats.bavail * stats.bsize,
      () => Number.POSITIVE_INFINITY
    )
    if (free < 2 * 1024 ** 3) fail(`only ${formatSize(free)} free next to ${frames}`)
  }

  const display = (path: string) => {
    const near = relative(process.cwd(), path)
    return near && !near.startsWith('..') ? near : path
  }
  console.log(
    `${purple}prezzer${reset} ${muted}filming${reset} ${cyan}${display(built)}${reset} ${muted}at ${timeline.fps} fps · scale ${timeline.scale} · ${workers} worker${workers === 1 ? '' : 's'}${reset}`
  )
  const progress = progressLine()
  // Ctrl+C or a kill stops the render cleanly: the partial output is
  // removed and the previous file at --out survives.
  const interrupt = new AbortController()
  const onSignal = () => interrupt.abort()
  process.once('SIGINT', onSignal)
  process.once('SIGTERM', onSignal)
  try {
    const result = await renderDeck({
      file: built,
      timeline,
      out: frames ? undefined : resolve(out),
      frames: frames ? resolve(frames) : undefined,
      crf,
      workers,
      channel: flags.get('--channel'),
      onProgress: progress.update,
      signal: interrupt.signal,
    })
    progress.done()
    const size = frames
      ? ''
      : ` ${muted}·${reset} ${coral}${formatSize(Bun.file(result.output).size)}${reset}`
    const rate = result.frames / (result.elapsedMs / 1000)
    console.log(
      `${green}✓${reset} ${cyan}${display(result.output)}${reset} ${muted}·${reset} ${coral}${result.seconds.toFixed(1)}s${reset} ${muted}· ${result.frames} frames · ${result.width}x${result.height} · ${rate.toFixed(1)} fps rendered${reset}${size}`
    )
  } catch (error) {
    progress.done()
    if (interrupt.signal.aborted) {
      console.error(`${muted}${error instanceof Error ? error.message : String(error)}${reset}`)
      process.exit(130)
    }
    fail(error instanceof Error ? error.message : String(error))
  } finally {
    process.off('SIGINT', onSignal)
    process.off('SIGTERM', onSignal)
  }
}
