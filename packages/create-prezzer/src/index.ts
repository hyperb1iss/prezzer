#!/usr/bin/env bun

import { cp, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, relative, resolve } from 'node:path'

const color = (code: string) => (Bun.enableANSIColors ? code : '')
const purple = color('\x1b[38;2;225;53;255m')
const cyan = color('\x1b[38;2;128;255;234m')
const green = color('\x1b[38;2;80;250;123m')
const red = color('\x1b[38;2;255;99;99m')
const muted = color('\x1b[2m')
const reset = color('\x1b[0m')

interface Options {
  target?: string
  force: boolean
  install: boolean
  git: boolean
  help: boolean
}

function printHelp() {
  console.log(`${purple}create-prezzer${reset} ${muted}a Bun-native presentation in seconds${reset}

${cyan}Usage${reset}
  bun create prezzer <directory> [options]

${cyan}Options${reset}
  --force         write into a non-empty directory
  --no-install    skip bun install
  --no-git        skip git init
  -h, --help      show this help

${cyan}Examples${reset}
  bun create prezzer my-talk
  bun create prezzer . --no-git`)
}

function fail(message: string): never {
  console.error(`${red}error${reset} ${message}`)
  process.exit(1)
}

function parseOptions(args: string[]): Options {
  const options: Options = { force: false, install: true, git: true, help: false }

  for (const argument of args) {
    if (argument === '--force') options.force = true
    else if (argument === '--no-install') options.install = false
    else if (argument === '--no-git') options.git = false
    else if (argument === '--help' || argument === '-h') options.help = true
    else if (argument.startsWith('-')) fail(`unknown option: ${argument}`)
    else if (!options.target) options.target = argument
    else fail(`unexpected argument: ${argument}`)
  }

  return options
}

function packageName(target: string): string {
  const normalized = basename(target)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
  return normalized || 'prezzer-deck'
}

async function directoryEntries(path: string): Promise<string[]> {
  try {
    return await readdir(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

async function renderTemplate(path: string, replacements: Record<string, string>) {
  let contents = await readFile(path, 'utf8')
  for (const [token, value] of Object.entries(replacements)) {
    contents = contents.replaceAll(`{{${token}}}`, value)
  }
  await writeFile(path, contents)
}

async function initializeGit(target: string) {
  const existing = Bun.spawnSync(['git', 'rev-parse', '--is-inside-work-tree'], {
    cwd: target,
    stdout: 'ignore',
    stderr: 'ignore',
  })
  if (existing.exitCode === 0) return

  const initialized = Bun.spawnSync(['git', 'init', '-q'], {
    cwd: target,
    stdout: 'ignore',
    stderr: 'ignore',
  })
  if (initialized.exitCode !== 0) {
    console.warn(`${muted}git not available; skipped repository initialization${reset}`)
  }
}

async function installDependencies(target: string) {
  const process = Bun.spawn(['bun', 'install'], {
    cwd: target,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if ((await process.exited) !== 0) fail('bun install failed')
}

const options = parseOptions(Bun.argv.slice(2))
if (options.help) {
  printHelp()
  process.exit(0)
}
if (!options.target) fail('choose a directory, for example: bun create prezzer my-talk')

const target = resolve(options.target)
const existingEntries = await directoryEntries(target)
if (existingEntries.length > 0 && !options.force) {
  fail(`${target} is not empty; use --force to write anyway (template files overwrite collisions)`)
}

const name = packageName(target)
const template = resolve(import.meta.dir, '../template')
const prezzerVersion = process.env.PREZZER_PACKAGE_SPEC ?? '^0.2.0'

console.log(`${purple}create-prezzer${reset} ${muted}scaffolding${reset} ${cyan}${name}${reset}`)

await mkdir(target, { recursive: true })
await cp(template, target, { recursive: true, force: true })
await rm(resolve(target, 'package.json'), { force: true })
await rename(resolve(target, 'package.template.json'), resolve(target, 'package.json'))
await rm(resolve(target, '.gitignore'), { force: true })
await rename(resolve(target, '_gitignore'), resolve(target, '.gitignore'))
await rm(resolve(target, 'bunfig.toml'), { force: true })
await rename(resolve(target, '_bunfig.toml'), resolve(target, 'bunfig.toml'))

const replacements = {
  name,
  title: name.replaceAll('-', ' '),
  prezzerVersion,
}
await Promise.all(
  ['package.json', 'README.md', 'index.html'].map((file) =>
    renderTemplate(resolve(target, file), replacements)
  )
)
const biomePath = resolve(target, 'biome.json')
const biomeConfig = (await readFile(biomePath, 'utf8')).replace('"root": false', '"root": true')
await writeFile(biomePath, biomeConfig)

if (options.install) await installDependencies(target)
if (options.git) await initializeGit(target)

const displayPath = relative(process.cwd(), target) || '.'
console.log(`
${green}✓${reset} ${purple}${name}${reset} is ready in ${cyan}${displayPath}${reset}
`)
if (displayPath !== '.') console.log(`  ${cyan}cd${reset} ${displayPath}`)
if (!options.install) console.log(`  ${cyan}bun${reset} install`)
console.log(`  ${cyan}bun${reset} dev

${muted}space advances · g grid · n notes · f fullscreen${reset}
${muted}bake the one-file offline deck anytime with${reset} bun run build

${purple}build something electric${reset} ${cyan}⚡${reset}`)
