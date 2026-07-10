#!/usr/bin/env bun

import tailwind from 'bun-plugin-tailwind'
import type { BunPlugin } from 'bun'
import { lstat, mkdir, mkdtemp, readdir, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import prezzerPlugin from '../bun-plugin'

const color = (code: string) => (Bun.enableANSIColors ? code : '')
const purple = color('\x1b[38;2;225;53;255m')
const cyan = color('\x1b[38;2;128;255;234m')
const coral = color('\x1b[38;2;255;106;193m')
const green = color('\x1b[38;2;80;250;123m')
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
    --port <number>  port to listen on ${muted}(default: $PORT or 3000)${reset}
  build
    --outdir <dir>   output directory ${muted}(default: dist)${reset}
    --no-minify      keep readable output while diagnosing builds

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

const publicAssetsPlugin: BunPlugin = {
  name: 'prezzer-public-assets',
  setup(builder) {
    builder.onResolve({ filter: /^\// }, async ({ path }) => {
      if (await Bun.file(path).exists()) return undefined
      const projectPath = path.startsWith(process.cwd())
        ? relative(process.cwd(), path)
        : path.slice(1)
      const publicPath = resolve('public', projectPath)
      return (await Bun.file(publicPath).exists()) ? { path: publicPath } : undefined
    })
  },
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

async function inlinePublicAssets(html: string): Promise<string> {
  const publicRoot = resolve('public')
  const files = await collectFiles(publicRoot)

  for (const path of files) {
    const assetPath = `/${relative(publicRoot, path).replaceAll('\\', '/')}`
    if (!html.includes(assetPath)) continue

    const file = Bun.file(path)
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
    html = html.replaceAll(
      assetPath,
      `data:${file.type || 'application/octet-stream'};base64,${base64}`
    )
  }

  return html
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
  let port: number | undefined
  let entrySet = false

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--port') {
      const value = Number(args[index + 1])
      if (!Number.isInteger(value) || value <= 0) fail('--port needs a positive number')
      port = value
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

  const publicRoot = resolve('public')
  const server = Bun.serve({
    port,
    routes: { '/': index },
    development: { hmr: true, console: true },
    async fetch(request) {
      let pathname: string
      try {
        pathname = decodeURIComponent(new URL(request.url).pathname)
      } catch {
        return new Response('bad request', { status: 400 })
      }
      const assetPath = resolve(publicRoot, pathname.slice(1))
      if (isWithin(publicRoot, assetPath)) {
        const asset = Bun.file(assetPath)
        if (await asset.exists()) return new Response(asset)
      }
      return new Response('not found', { status: 404 })
    },
  })

  console.log(
    `${purple}prezzer${reset} ${muted}dev${reset} ${cyan}${entry}${reset} ${muted}→${reset} ${cyan}${server.url}${reset} ${muted}· hot reload on · public/ served${reset}`
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
      plugins: [publicAssetsPlugin, prezzerPlugin, tailwind],
    })

    if (!result.success) {
      for (const log of result.logs) console.error(log)
      process.exitCode = 1
      return
    }

    const stagedOutputPath = resolve(stagingDirectory, basename(entryPath))
    const standalone = result.outputs.find((output) => output.path === stagedOutputPath)
    if (!standalone) fail('Bun did not emit the standalone deck')

    const html = await inlinePublicAssets(await standalone.text())
    await mkdir(outputDirectory, { recursive: true })
    const bytes = await Bun.write(outputPath, html)

    const elapsed = formatDuration(performance.now() - startedAt)
    const displayPath = relative(process.cwd(), outputPath) || outputPath
    console.log(
      `${green}✓${reset} ${cyan}${displayPath}${reset} ${muted}·${reset} ${coral}${formatSize(bytes)}${reset} ${muted}·${reset} ${coral}${elapsed}${reset} ${muted}· one file, works offline${reset}`
    )
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true })
  }
}

const [command, ...args] = Bun.argv.slice(2)

if (!command || command === 'help' || command === '--help' || command === '-h') {
  printHelp()
} else if (command === 'dev') {
  await dev(args)
} else if (command === 'build') {
  await build(args)
} else {
  fail(`unknown command: ${command}`)
}
