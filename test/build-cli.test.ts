import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
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

  test('inlines overlapping asset paths without corrupting the longer one', async () => {
    const project = await mkdtemp(resolve(tmpdir(), 'prezzer-build-test-'))
    created.push(project)
    await mkdir(resolve(project, 'public'))
    await writeFile(
      resolve(project, 'index.html'),
      '<body><script type="module" src="./main.ts"></script></body>'
    )
    await writeFile(
      resolve(project, 'main.ts'),
      'document.body.innerHTML = `<img src="/a.png" alt="a"><a href="/a.png.license">license</a>`'
    )
    await writeFile(resolve(project, 'public/a.png'), 'not-really-a-png')
    await writeFile(resolve(project, 'public/a.png.license'), 'MIT')

    const process = Bun.spawn(
      ['bun', resolve(import.meta.dir, '../packages/engine/bin/prezzer.ts'), 'build'],
      { cwd: project, stdout: 'pipe', stderr: 'pipe' }
    )

    expect(await process.exited).toBe(0)
    const html = await Bun.file(resolve(project, 'dist/index.html')).text()
    expect(html).not.toContain('/a.png')
    expect(html).not.toContain('.license`')
    expect(html).toContain(
      `data:image/png;base64,${Buffer.from('not-really-a-png').toString('base64')}`
    )
    expect(html).toContain(Buffer.from('MIT').toString('base64'))
  })

  test('consumes query strings instead of appending them to data URIs', async () => {
    const project = await mkdtemp(resolve(tmpdir(), 'prezzer-build-test-'))
    created.push(project)
    await mkdir(resolve(project, 'public'))
    await writeFile(
      resolve(project, 'index.html'),
      '<body><script type="module" src="./main.ts"></script></body>'
    )
    await writeFile(
      resolve(project, 'main.ts'),
      'document.body.innerHTML = `<img src="/pixel.svg?v=2" alt="pixel">`'
    )
    await writeFile(
      resolve(project, 'public/pixel.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
    )

    const process = Bun.spawn(
      ['bun', resolve(import.meta.dir, '../packages/engine/bin/prezzer.ts'), 'build'],
      { cwd: project, stdout: 'pipe', stderr: 'pipe' }
    )

    expect(await process.exited).toBe(0)
    const html = await Bun.file(resolve(project, 'dist/index.html')).text()
    expect(html).toContain('data:image/svg+xml;base64,')
    expect(html).not.toContain('?v=2')
  })

  test('matches URL-encoded references and skips dotfile warnings', async () => {
    const project = await mkdtemp(resolve(tmpdir(), 'prezzer-build-test-'))
    created.push(project)
    await mkdir(resolve(project, 'public'))
    await writeFile(
      resolve(project, 'index.html'),
      '<body><img src="/my%20file.png" alt="spaced"><script type="module" src="./main.ts"></script></body>'
    )
    await writeFile(resolve(project, 'main.ts'), 'export {}')
    await writeFile(resolve(project, 'public/my file.png'), 'spaced-bytes')
    await writeFile(resolve(project, 'public/.DS_Store'), 'junk')

    const process = Bun.spawn(
      ['bun', resolve(import.meta.dir, '../packages/engine/bin/prezzer.ts'), 'build'],
      { cwd: project, stdout: 'pipe', stderr: 'pipe' }
    )

    expect(await process.exited).toBe(0)
    const stderr = await new Response(process.stderr).text()
    expect(stderr).not.toContain('my file.png')
    expect(stderr).not.toContain('.DS_Store')
    const html = await Bun.file(resolve(project, 'dist/index.html')).text()
    expect(html).not.toContain('/my%20file.png')
    expect(html).toContain(
      `data:image/png;base64,${Buffer.from('spaced-bytes').toString('base64')}`
    )
  })

  test('warns when remote stylesheets keep the artifact network-dependent', async () => {
    const project = await mkdtemp(resolve(tmpdir(), 'prezzer-build-test-'))
    created.push(project)
    await writeFile(
      resolve(project, 'index.html'),
      '<head><link rel="stylesheet" href="https://fonts.example.com/css"></head><body><script type="module" src="./main.ts"></script></body>'
    )
    await writeFile(resolve(project, 'main.ts'), 'export {}')

    const process = Bun.spawn(
      ['bun', resolve(import.meta.dir, '../packages/engine/bin/prezzer.ts'), 'build'],
      { cwd: project, stdout: 'pipe', stderr: 'pipe' }
    )

    expect(await process.exited).toBe(0)
    expect(await new Response(process.stderr).text()).toContain('remote stylesheets')
    expect(await new Response(process.stdout).text()).toContain('network fallbacks')
  })

  test('bakes a markdown deck through the plugin pipeline', async () => {
    const project = await mkdtemp(resolve(tmpdir(), 'prezzer-build-test-'))
    created.push(project)
    await writeFile(
      resolve(project, 'index.html'),
      '<body><script type="module" src="./main.ts"></script></body>'
    )
    await writeFile(
      resolve(project, 'main.ts'),
      "import slides from './slides.md'\ndocument.body.textContent = slides.map((s) => s.id).join(',')"
    )
    await writeFile(
      resolve(project, 'slides.md'),
      '# baked from markdown\n\n<!-- beat -->\n\nthe reveal\n\n---\n\n## second slide\n'
    )

    const process = Bun.spawn(
      ['bun', resolve(import.meta.dir, '../packages/engine/bin/prezzer.ts'), 'build'],
      { cwd: project, stdout: 'pipe', stderr: 'pipe' }
    )

    expect(await process.exited).toBe(0)
    const html = await Bun.file(resolve(project, 'dist/index.html')).text()
    expect(html).toContain('baked from markdown')
    expect(html).toContain('second slide')
  })

  test('builds browser code for production', async () => {
    const project = await mkdtemp(resolve(tmpdir(), 'prezzer-build-test-'))
    created.push(project)
    await writeFile(
      resolve(project, 'index.html'),
      '<body><script type="module" src="./main.ts"></script></body>'
    )
    await writeFile(
      resolve(project, 'main.ts'),
      'document.body.dataset.mode = process.env.NODE_ENV ?? "missing"'
    )

    const process = Bun.spawn(
      [
        'bun',
        resolve(import.meta.dir, '../packages/engine/bin/prezzer.ts'),
        'build',
        '--no-minify',
      ],
      { cwd: project, stdout: 'pipe', stderr: 'pipe' }
    )

    expect(await process.exited).toBe(0)
    const html = await Bun.file(resolve(project, 'dist/index.html')).text()
    expect(html).toContain('document.body.dataset.mode = "production"')
  })

  test('rejects output paths that could destroy project files', async () => {
    const project = await mkdtemp(resolve(tmpdir(), 'prezzer-build-test-'))
    created.push(project)
    const entry = resolve(project, 'index.html')
    const source = resolve(project, 'main.ts')
    await writeFile(entry, '<body><script type="module" src="./main.ts"></script></body>')
    await writeFile(source, 'document.body.textContent = "still here"')

    for (const outdir of ['.', '..']) {
      const process = Bun.spawn(
        [
          'bun',
          resolve(import.meta.dir, '../packages/engine/bin/prezzer.ts'),
          'build',
          '--outdir',
          outdir,
        ],
        { cwd: project, stdout: 'pipe', stderr: 'pipe' }
      )

      expect(await process.exited).toBe(1)
      expect(await new Response(process.stderr).text()).toContain(
        '--outdir must be a directory inside the project'
      )
      expect(await readFile(entry, 'utf8')).toContain('main.ts')
      expect(await readFile(source, 'utf8')).toContain('still here')
    }
  })

  test('rejects an output directory containing the deck entry', async () => {
    const project = await mkdtemp(resolve(tmpdir(), 'prezzer-build-test-'))
    created.push(project)
    await mkdir(resolve(project, 'slides'))
    const entry = resolve(project, 'slides/index.html')
    await writeFile(entry, '<body>safe</body>')

    const process = Bun.spawn(
      [
        'bun',
        resolve(import.meta.dir, '../packages/engine/bin/prezzer.ts'),
        'build',
        'slides/index.html',
        '--outdir',
        'slides',
      ],
      { cwd: project, stdout: 'pipe', stderr: 'pipe' }
    )

    expect(await process.exited).toBe(1)
    expect(await new Response(process.stderr).text()).toContain(
      '--outdir cannot contain the deck entry'
    )
    expect(await readFile(entry, 'utf8')).toBe('<body>safe</body>')
  })

  test('rejects output directories that escape through symlinks', async () => {
    const parent = await mkdtemp(resolve(tmpdir(), 'prezzer-build-test-'))
    created.push(parent)
    const project = resolve(parent, 'deck')
    await mkdir(project)
    const parentEntry = resolve(parent, 'index.html')
    const projectEntry = resolve(project, 'index.html')
    await writeFile(parentEntry, '<body>parent stays safe</body>')
    await writeFile(projectEntry, '<body>deck stays safe</body>')
    await symlink('..', resolve(project, 'escape'))
    await symlink('.', resolve(project, 'alias'))

    for (const outdir of ['escape', 'alias']) {
      const process = Bun.spawn(
        [
          'bun',
          resolve(import.meta.dir, '../packages/engine/bin/prezzer.ts'),
          'build',
          '--outdir',
          outdir,
        ],
        { cwd: project, stdout: 'pipe', stderr: 'pipe' }
      )

      expect(await process.exited).toBe(1)
      expect(await new Response(process.stderr).text()).toContain(
        '--outdir must be a directory inside the project'
      )
      expect(await readFile(parentEntry, 'utf8')).toBe('<body>parent stays safe</body>')
      expect(await readFile(projectEntry, 'utf8')).toBe('<body>deck stays safe</body>')
    }
  })

  test('rejects an output file symlinked to the deck entry', async () => {
    const project = await mkdtemp(resolve(tmpdir(), 'prezzer-build-test-'))
    created.push(project)
    const entry = resolve(project, 'index.html')
    await writeFile(entry, '<body>deck stays safe</body>')
    await mkdir(resolve(project, 'dist'))
    await symlink('../index.html', resolve(project, 'dist/index.html'))

    const process = Bun.spawn(
      ['bun', resolve(import.meta.dir, '../packages/engine/bin/prezzer.ts'), 'build'],
      { cwd: project, stdout: 'pipe', stderr: 'pipe' }
    )

    expect(await process.exited).toBe(1)
    expect(await new Response(process.stderr).text()).toContain(
      '--outdir cannot overwrite files outside the output directory'
    )
    expect(await readFile(entry, 'utf8')).toBe('<body>deck stays safe</body>')
  })
})
