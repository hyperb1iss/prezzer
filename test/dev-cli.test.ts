import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

const created: string[] = []
const processes: ReturnType<typeof Bun.spawn>[] = []

afterEach(async () => {
  for (const process of processes.splice(0)) {
    process.kill()
    await process.exited
  }
  await Promise.all(created.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

// The happy-dom preload replaces global fetch with a browser-flavored one
// that preflights and enforces same-origin; Bun.fetch is the native client.
async function waitForServer(
  url: string,
  child: ReturnType<typeof Bun.spawn>,
  attempts = 100
): Promise<Response> {
  let lastError = ''
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await Bun.fetch(url)
    } catch (error) {
      lastError = (error as Error).message
      await Bun.sleep(100)
    }
  }
  child.kill()
  await child.exited
  const stderr = await new Response(child.stderr as ReadableStream).text()
  const stdout = await new Response(child.stdout as ReadableStream).text()
  throw new Error(
    `server never came up at ${url}: ${lastError}\nchild stdout: ${stdout}\nchild stderr: ${stderr}`
  )
}

describe('prezzer dev', () => {
  test('serves a deck that has no public directory', async () => {
    const project = await mkdtemp(resolve(tmpdir(), 'prezzer-dev-test-'))
    created.push(project)
    await writeFile(
      resolve(project, 'index.html'),
      '<body><script type="module" src="./main.ts"></script></body>'
    )
    await writeFile(resolve(project, 'main.ts'), 'document.body.textContent = "hello"')

    const port = 20000 + Math.floor(Math.random() * 20000)
    const process = Bun.spawn(
      [
        'bun',
        resolve(import.meta.dir, '../packages/engine/bin/prezzer.ts'),
        'dev',
        '--port',
        String(port),
      ],
      { cwd: project, stdout: 'pipe', stderr: 'pipe' }
    )
    processes.push(process)

    const root = await waitForServer(`http://127.0.0.1:${port}/`, process)
    expect(root.status).toBe(200)
    expect(root.headers.get('content-type')).toContain('text/html')

    const miss = await Bun.fetch(`http://127.0.0.1:${port}/nope.png`)
    expect(miss.status).toBe(404)
  }, 30000)
})
