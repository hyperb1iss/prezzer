import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Browser, Page } from 'playwright-core'
import { launchBrowser } from './deck'
import { type Film, prepareFilm, startFilm } from './film'

// Needs a launchable Chromium (bunx playwright-core install --only-shell
// chromium); without one these tests skip instead of failing.
async function canLaunch() {
  try {
    const browser = await launchBrowser()
    await browser.close()
    return true
  } catch {
    return false
  }
}
const ready = await canLaunch()

const epoch = new Date('2030-01-02T03:04:05Z')
type Probe = Window & Record<string, unknown>

describe.skipIf(!ready)('film runtime', () => {
  let browser: Browser
  beforeAll(async () => {
    browser = await launchBrowser()
  })
  afterAll(async () => {
    await browser?.close()
  })

  async function open(): Promise<{ page: Page; film: Film }> {
    const context = await browser.newContext({ viewport: { width: 320, height: 180 } })
    await prepareFilm(context, { time: epoch })
    const page = await context.newPage()
    await page.goto('data:text/html,<body></body>')
    return { page, film: await startFilm(page) }
  }

  test('keeps the timer nesting clamp across awaited zero-delay sleeps', async () => {
    const { page, film } = await open()
    await page.evaluate(() => {
      const probe = window as unknown as Probe
      probe.hops = 0
      void (async () => {
        for (;;) {
          await new Promise((resolve) => setTimeout(resolve, 0))
          probe.hops = Number(probe.hops) + 1
        }
      })()
    })
    // Without the clamp this loop never lets film time move and the step throws.
    await film.advance(100, false)
    const hops = await page.evaluate(() => Number((window as unknown as Probe).hops))
    // Five nested zero-delay hops run at once, then each waits the 4 ms clamp.
    expect(hops).toBeGreaterThanOrEqual(5 + 100 / 4 - 2)
    expect(hops).toBeLessThanOrEqual(5 + 100 / 4 + 2)
    await page.context().close()
  })

  test('runs reversed and re-rated animations on film time, not the wall clock', async () => {
    const { page, film } = await open()
    await page.evaluate(() => {
      const element = document.body.appendChild(document.createElement('div'))
      ;(window as unknown as Probe).fade = element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000,
        fill: 'both',
      })
    })
    const time = () =>
      page.evaluate(() => Number(((window as unknown as Probe).fade as Animation).currentTime))
    await film.advance(400, false)
    expect(await time()).toBe(400)

    await page.evaluate(() => ((window as unknown as Probe).fade as Animation).reverse())
    // Real time passing between frames must not move the animation.
    await Bun.sleep(150)
    await film.advance(100, false)
    expect(await time()).toBe(300)

    await page.evaluate(() =>
      ((window as unknown as Probe).fade as Animation).updatePlaybackRate(-2)
    )
    await Bun.sleep(150)
    await film.advance(100, false)
    expect(await time()).toBe(100)
    await page.context().close()
  })

  test('serves film time through Date, including Date subclasses', async () => {
    const { page, film } = await open()
    await film.advance(250, false)
    const seen = await page.evaluate(() => {
      class Stamp extends Date {}
      const stamp = new Stamp()
      return {
        subclass: stamp instanceof Stamp,
        date: stamp instanceof Date,
        stamp: stamp.getTime(),
        now: Date.now(),
        parsed: new Date('2001-02-03T04:05:06Z').getTime(),
        called: typeof Date(),
      }
    })
    expect(seen).toEqual({
      subclass: true,
      date: true,
      stamp: epoch.getTime() + 250,
      now: epoch.getTime() + 250,
      parsed: Date.UTC(2001, 1, 3, 4, 5, 6),
      called: 'string',
    })
    await page.context().close()
  })
})
