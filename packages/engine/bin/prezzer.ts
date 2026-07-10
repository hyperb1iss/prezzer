#!/usr/bin/env bun

import tailwind from 'bun-plugin-tailwind'
import type { BunPlugin } from 'bun'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { basename, relative, resolve } from 'node:path'
import prezzerPlugin from '../bun-plugin'

const purple = '\x1b[38;2;225;53;255m'
const cyan = '\x1b[38;2;128;255;234m'
const red = '\x1b[38;2;255;99;99m'
const muted = '\x1b[2m'
const reset = '\x1b[0m'

function printHelp() {
  console.log(`${purple}prezzer${reset} ${muted}build cinematic decks with Bun${reset}

${cyan}Usage${reset}
  prezzer build [entry] [--outdir <dir>] [--no-minify]

${cyan}Commands${reset}
  build    emit one self-contained HTML file

${cyan}Examples${reset}
  prezzer build
  prezzer build talk.html --outdir release`)
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

  if (!(await Bun.file(entry).exists())) fail(`entry not found: ${entry}`)

  const outputPath = resolve(outdir, basename(entry))
  await rm(outdir, { recursive: true, force: true })

  const result = await Bun.build({
    entrypoints: [entry],
    outdir,
    target: 'browser',
    compile: true,
    minify,
    plugins: [publicAssetsPlugin, prezzerPlugin, tailwind],
  })

  if (!result.success) {
    for (const log of result.logs) console.error(log)
    process.exit(1)
  }

  const standalone = result.outputs.find((output) => output.path === outputPath)
  if (!standalone) fail('Bun did not emit the standalone deck')

  const html = await inlinePublicAssets(await standalone.text())
  await rm(outdir, { recursive: true, force: true })
  await mkdir(outdir, { recursive: true })
  await Bun.write(outputPath, html)

  console.log(`${purple}prezzer${reset} built ${cyan}${outputPath}${reset}`)
}

const [command, ...args] = Bun.argv.slice(2)

if (!command || command === 'help' || command === '--help' || command === '-h') {
  printHelp()
} else if (command === 'build') {
  await build(args)
} else {
  fail(`unknown command: ${command}`)
}
