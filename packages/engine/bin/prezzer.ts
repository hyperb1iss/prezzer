#!/usr/bin/env bun

import tailwind from 'bun-plugin-tailwind'
import { lstat, mkdir, mkdtemp, readdir, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import prezzerPlugin, { bundlerResolvedAssets } from '../bun-plugin'
import { version } from '../package.json'

const color = (code: string) => (Bun.enableANSIColors ? code : '')
const purple = color('\x1b[38;2;225;53;255m')
const cyan = color('\x1b[38;2;128;255;234m')
const coral = color('\x1b[38;2;255;106;193m')
const green = color('\x1b[38;2;80;250;123m')
const yellow = color('\x1b[38;2;241;250;140m')
const red = color('\x1b[38;2;255;99;99m')
const muted = color('\x1b[2m')
const reset = color('\x1b[0m')

function printHelp() {
  console.log(`${purple}prezzer${reset} ${muted}build cinematic decks with Bun${reset}

${cyan}Usage${reset}
  prezzer <command> [entry] [options]

${cyan}Commands${reset}
  dev      serve the deck with hot reload and public/ assets
  build    bake one self-contained HTML file

${cyan}Options${reset}
  dev
    --port <number>  port to listen on ${muted}(default: $PORT or 1609 — 16:9, like the canvas)${reset}
    --host <name>    bind address ${muted}(default: 127.0.0.1; 0.0.0.0 exposes to your network)${reset}
  build
    --outdir <dir>   output directory ${muted}(default: dist)${reset}
    --no-minify      keep readable output while diagnosing builds
  -v, --version      print the engine version

${cyan}Examples${reset}
  prezzer dev
  prezzer build
  prezzer build talk.html --outdir release`)
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`
}

function fail(message: string): never {
  console.error(`${red}error${reset} ${message}`)
  process.exit(1)
}

async function collectFiles(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = await Promise.all(
      entries.map((entry) => {
        const path = resolve(directory, entry.name)
        return entry.isDirectory() ? collectFiles(path) : [path]
      })
    )
    return files.flat()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function inlinePublicAssets(html: string): Promise<{ html: string; unreferenced: string[] }> {
  const publicRoot = resolve('public')
  const files = await collectFiles(publicRoot)
  const unreferenced: string[] = []
  const replacements = new Map<string, string>()

  for (const path of files) {
    const assetPath = `/${relative(publicRoot, path).replaceAll('\\', '/')}`
    const tokens = new Set([assetPath, encodeURI(assetPath)])
    const matched = [...tokens].filter((token) => html.includes(token))
    if (matched.length === 0) {
      const hidden = basename(path).startsWith('.')
      if (!bundlerResolvedAssets.has(path) && !hidden) unreferenced.push(assetPath)
      continue
    }

    const file = Bun.file(path)
    const dataUri = `data:${file.type || 'application/octet-stream'};base64,${(
      await file.bytes()
    ).toBase64()}`
    for (const token of matched) replacements.set(token, dataUri)
  }

  if (replacements.size > 0) {
    // One pass, longest token first: /a.png must never rewrite the middle
    // of /a.png.license, and inserted base64 must never be rescanned. A
    // query suffix would corrupt a data URI, so it is consumed with the path.
    const alternation = [...replacements.keys()]
      .sort((a, b) => b.length - a.length)
      .map((token) => escapeRegExp(token))
      .join('|')
    html = html.replace(
      new RegExp(`(${alternation})(\\?[\\w.%=&~-]*)?`, 'g'),
      (_match, token: string) => replacements.get(token) as string
    )
  }

  return { html, unreferenced }
}

/** remote stylesheets, scripts, or CSS-loaded assets that keep the artifact network-dependent */
function hasRemoteReferences(html: string): boolean {
  if (/url\(\s*["']?https?:\/\//i.test(html)) return true
  if (/<script[^>]*\ssrc\s*=\s*["']https?:\/\//i.test(html)) return true
  const links = html.matchAll(/<link\b[^>]*>/gi)
  return [...links].some(
    (tag) => /rel\s*=\s*["']?stylesheet/i.test(tag[0]) && /href\s*=\s*["']https?:\/\//i.test(tag[0])
  )
}

function isWithin(parent: string, child: string) {
  const path = relative(parent, child)
  return path !== '' && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path)
}

async function canonicalize(path: string): Promise<string> {
  try {
    return await realpath(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error

    try {
      await lstat(path)
    } catch (lstatError) {
      if ((lstatError as NodeJS.ErrnoException).code !== 'ENOENT') throw lstatError

      const parent = dirname(path)
      if (parent === path) throw error
      return resolve(await canonicalize(parent), basename(path))
    }

    throw error
  }
}

async function dev(args: string[]) {
  let entry = 'index.html'
  // 1609 — 16:9, like the canvas
  const envPort = Number(process.env.BUN_PORT ?? process.env.PORT ?? process.env.NODE_PORT)
  let port = Number.isInteger(envPort) && envPort > 0 ? envPort : 1609
  let hostname = '127.0.0.1'
  let entrySet = false

  let portSet = false

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--port') {
      const value = Number(args[index + 1])
      if (!Number.isInteger(value) || value <= 0) fail('--port needs a positive number')
      port = value
      portSet = true
      index += 1
    } else if (argument === '--host') {
      const value = args[index + 1]
      if (!value || value.startsWith('-')) fail('--host needs a hostname')
      hostname = value
      index += 1
    } else if (argument?.startsWith('-')) {
      fail(`unknown option: ${argument}`)
    } else if (!entrySet && argument) {
      entry = argument
      entrySet = true
    } else if (argument) {
      fail(`unexpected argument: ${argument}`)
    }
  }

  const entryPath = resolve(entry)
  if (!(await Bun.file(entryPath).exists())) fail(`entry not found: ${entry}`)
  const { default: index } = await import(entryPath)

  // The exact '/' route outranks the '/*' directory route, and the
  // directory route rejects non-canonical paths, so public/ is served
  // with ETag/304/Range handling and no traversal surface. Bun opens the
  // directory eagerly, so a deck without public/ skips the route and
  // 404s asset paths instead — a hand-rolled fallback would give up the
  // route's symlink confinement and Range semantics.
  const publicRoot = resolve('public')
  const hasPublicDirectory = await lstat(publicRoot)
    .then((stats) => stats.isDirectory())
    .catch(() => false)

  const notFound = () => new Response('not found', { status: 404 })

  const serve = (candidatePort: number) => {
    const shared = {
      port: candidatePort,
      hostname,
      development: { hmr: true, console: true },
      fetch: notFound,
    }
    return hasPublicDirectory
      ? Bun.serve({ ...shared, routes: { '/': index, '/*': { dir: publicRoot } } })
      : Bun.serve({ ...shared, routes: { '/': index } })
  }

  let server: ReturnType<typeof serve> | undefined
  // When the default port is busy, walk forward like every dev server;
  // an explicit --port is a contract, so that one fails instead.
  const attempts = portSet ? [port] : Array.from({ length: 10 }, (_, step) => port + step)
  for (const candidate of attempts) {
    try {
      server = serve(candidate)
      break
    } catch (error) {
      if ((error as { code?: string }).code !== 'EADDRINUSE') throw error
    }
  }
  if (!server) {
    fail(
      portSet
        ? `port ${port} is already in use — stop the other server or pick another --port`
        : `ports ${port}–${port + attempts.length - 1} are all in use`
    )
  }

  const assetNote = hasPublicDirectory
    ? 'public/ served'
    : 'no public/ yet — restart dev after creating it'
  console.log(
    `${purple}prezzer${reset} ${muted}dev${reset} ${cyan}${entry}${reset} ${muted}→${reset} ${cyan}${server.url}${reset} ${muted}· hot reload on · ${assetNote}${reset}`
  )
}

async function build(args: string[]) {
  let entry = 'index.html'
  let outdir = 'dist'
  let minify = true
  let entrySet = false

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--outdir') {
      outdir = args[index + 1] ?? fail('--outdir needs a directory')
      index += 1
    } else if (argument === '--no-minify') {
      minify = false
    } else if (argument?.startsWith('-')) {
      fail(`unknown option: ${argument}`)
    } else if (!entrySet && argument) {
      entry = argument
      entrySet = true
    } else if (argument) {
      fail(`unexpected argument: ${argument}`)
    }
  }

  const projectRoot = await realpath('.')
  const entryPath = resolve(entry)
  const outputDirectory = resolve(outdir)

  if (!(await Bun.file(entryPath).exists())) fail(`entry not found: ${entry}`)
  const canonicalEntry = await realpath(entryPath)
  const canonicalOutputDirectory = await canonicalize(outputDirectory)
  if (!isWithin(projectRoot, canonicalOutputDirectory)) {
    fail('--outdir must be a directory inside the project')
  }
  if (
    isWithin(canonicalOutputDirectory, canonicalEntry) ||
    canonicalOutputDirectory === canonicalEntry
  ) {
    fail('--outdir cannot contain the deck entry')
  }

  const outputPath = resolve(outputDirectory, basename(entryPath))
  const canonicalOutputPath = await canonicalize(outputPath)
  if (
    !isWithin(canonicalOutputDirectory, canonicalOutputPath) ||
    canonicalOutputPath === canonicalEntry
  ) {
    fail('--outdir cannot overwrite files outside the output directory')
  }
  const stagingDirectory = await mkdtemp(resolve(tmpdir(), 'prezzer-build-'))
  const startedAt = performance.now()
  console.log(`${purple}prezzer${reset} ${muted}baking${reset} ${cyan}${entry}${reset}`)

  try {
    const result = await Bun.build({
      entrypoints: [entryPath],
      outdir: stagingDirectory,
      target: 'browser',
      compile: true,
      minify,
      define: { 'process.env.NODE_ENV': JSON.stringify('production') },
      plugins: [prezzerPlugin, tailwind],
    })

    if (!result.success) {
      for (const log of result.logs) console.error(log)
      process.exitCode = 1
      return
    }

    const stagedOutputPath = resolve(stagingDirectory, basename(entryPath))
    const standalone = result.outputs.find((output) => output.path === stagedOutputPath)
    if (!standalone) {
      console.error(`${red}error${reset} Bun did not emit the standalone deck`)
      process.exitCode = 1
      return
    }

    const { html, unreferenced } = await inlinePublicAssets(await standalone.text())
    await mkdir(outputDirectory, { recursive: true })
    const bytes = await Bun.write(outputPath, html)

    for (const assetPath of unreferenced) {
      console.warn(
        `${yellow}⚠${reset} ${muted}public${assetPath} never appears literally in the output — not inlined; runtime-built paths break offline${reset}`
      )
    }

    const remote = hasRemoteReferences(html)
    if (remote) {
      console.warn(
        `${yellow}⚠${reset} ${muted}the artifact still loads remote stylesheets, scripts, or fonts — offline shows fallbacks; self-host to bake full fidelity${reset}`
      )
    }

    const elapsed = formatDuration(performance.now() - startedAt)
    const displayPath = relative(process.cwd(), outputPath) || outputPath
    const tagline = remote ? 'one file, network fallbacks noted above' : 'one file, works offline'
    console.log(
      `${green}✓${reset} ${cyan}${displayPath}${reset} ${muted}·${reset} ${coral}${formatSize(bytes)}${reset} ${muted}·${reset} ${coral}${elapsed}${reset} ${muted}· ${tagline}${reset}`
    )
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true })
  }
}

const [command, ...args] = Bun.argv.slice(2)

if (!command || command === 'help' || command === '--help' || command === '-h') {
  printHelp()
} else if (command === '--version' || command === '-v' || command === 'version') {
  console.log(version)
} else if (command === 'dev') {
  await dev(args)
} else if (command === 'build') {
  await build(args)
} else {
  fail(`unknown command: ${command}`)
}
