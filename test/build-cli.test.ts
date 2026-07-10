import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

const created: string[] = []

afterEach(async () => {
  await Promise.all(created.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('prezzer build', () => {
  test('inlines public assets referenced from runtime code', async () => {
    const project = await mkdtemp(resolve(tmpdir(), 'prezzer-build-test-'))
    created.push(project)
    await mkdir(resolve(project, 'public'))
    await writeFile(
      resolve(project, 'index.html'),
      '<body><script type="module" src="./main.ts"></script></body>'
    )
    await writeFile(
      resolve(project, 'main.ts'),
      'document.body.innerHTML = `<img src="/pixel.svg" alt="pixel">`'
    )
    await writeFile(
      resolve(project, 'public/pixel.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><path fill="#e135ff" d="M0 0h1v1H0z"/></svg>'
    )

    const process = Bun.spawn(
      ['bun', resolve(import.meta.dir, '../packages/engine/bin/prezzer.ts'), 'build'],
      {
        cwd: project,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    )

    expect(await process.exited).toBe(0)
    const html = await Bun.file(resolve(project, 'dist/index.html')).text()
    expect(html).not.toContain('/pixel.svg')
    expect(html).toContain('data:image/svg+xml;base64,')
  })
})
