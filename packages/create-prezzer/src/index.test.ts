import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

const created: string[] = []

afterEach(async () => {
  await Promise.all(created.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('create-prezzer', () => {
  test('default package spec tracks the engine version', async () => {
    const source = await readFile(resolve(import.meta.dir, 'index.ts'), 'utf8')
    const fallback = /PREZZER_PACKAGE_SPEC \?\? '\^([^']+)'/.exec(source)?.[1]
    const engine = await Bun.file(resolve(import.meta.dir, '../../engine/package.json')).json()
    expect(fallback).toBe(engine.version)
  })

  test('renders a ready-to-install deck without template residue', async () => {
    const parent = await mkdtemp(resolve(tmpdir(), 'create-prezzer-test-'))
    const target = resolve(parent, 'Electric Story')
    created.push(parent)

    const process = Bun.spawn(
      ['bun', resolve(import.meta.dir, 'index.ts'), target, '--no-install', '--no-git'],
      {
        env: { ...Bun.env, PREZZER_PACKAGE_SPEC: 'file:../prezzer.tgz' },
        stdout: 'pipe',
        stderr: 'pipe',
      }
    )

    expect(await process.exited).toBe(0)

    const manifest = await Bun.file(resolve(target, 'package.json')).json()
    expect(manifest.name).toBe('electric-story')
    expect(manifest.dependencies.prezzer).toBe('file:../prezzer.tgz')
    expect(await Bun.file(resolve(target, '.gitignore')).exists()).toBe(true)
    expect(await Bun.file(resolve(target, 'bunfig.toml')).exists()).toBe(true)
    expect(await Bun.file(resolve(target, 'package.template.json')).exists()).toBe(false)
    expect(await Bun.file(resolve(target, '_bunfig.toml')).exists()).toBe(false)
    expect(await readFile(resolve(target, 'biome.json'), 'utf8')).toContain('"root": true')
  })
})
