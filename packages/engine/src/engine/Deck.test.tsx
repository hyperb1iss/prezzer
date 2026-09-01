import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useImperativeHandle, useRef, useState } from 'react'
import type { SlideDef } from '../types'
import { Beat } from './Beat'
import { Deck } from './Deck'
import { useDenyMode } from './DeckContext'
import type { DeckWidgetHandle } from '../widgets/registry'
import { useWidgetRegistration } from '../widgets/registry'

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

function ImperativeWidget() {
  const ref = useWidgetRegistration()
  const startedRef = useRef(false)
  const [started, setStarted] = useState(false)

  useImperativeHandle(
    ref,
    (): DeckWidgetHandle => ({
      start: () => {
        startedRef.current = true
        setStarted(true)
      },
      isStarted: () => startedRef.current,
    })
  )

  return <p>{started ? 'widget started' : 'widget idle'}</p>
}

function DenyState() {
  const denied = useDenyMode()
  return <p>{denied ? 'denied' : 'allowed'}</p>
}

function InteractiveDemo() {
  const denied = useDenyMode()
  return (
    <div>
      <p>{denied ? 'denied' : 'allowed'}</p>
      <div data-prezzer-interactive>
        <span>demo surface</span>
      </div>
    </div>
  )
}

function BeatState() {
  return (
    <Beat at={1}>
      <button type="button">revealed action</button>
    </Beat>
  )
}

function EmptySlide() {
  return <p>next slide</p>
}

function deckWith(component: SlideDef['component'], beats = 1): SlideDef[] {
  return [
    { id: 'S1', title: 'first', component, beats },
    { id: 'S2', title: 'second', component: EmptySlide },
  ]
}

describe('Deck', () => {
  test('lets an imperative widget claim the first advance', async () => {
    render(<Deck slides={deckWith(ImperativeWidget)} showProgressRail={false} />)

    expect(screen.getByText('widget idle')).toBeTruthy()
    fireEvent.keyDown(window, { key: ' ' })
    expect(screen.getByText('widget started')).toBeTruthy()
    expect(window.location.hash).toBe('#1')

    fireEvent.keyDown(window, { key: ' ' })
    await waitFor(() => expect(window.location.hash).toBe('#2'))
  })

  test('leaves browser and app shortcuts alone', () => {
    render(<Deck slides={deckWith(DenyState)} showProgressRail={false} />)

    fireEvent.keyDown(window, { key: 'd', metaKey: true })
    expect(screen.getByText('allowed')).toBeTruthy()

    fireEvent.keyDown(window, { key: 'd' })
    expect(screen.getByText('denied')).toBeTruthy()
  })

  test('keeps hands off surfaces marked data-prezzer-interactive', () => {
    render(<Deck slides={deckWith(InteractiveDemo)} showProgressRail={false} />)

    fireEvent.keyDown(screen.getByText('demo surface'), { key: 'd' })
    expect(screen.getByText('allowed')).toBeTruthy()

    fireEvent.keyDown(window, { key: 'd' })
    expect(screen.getByText('denied')).toBeTruthy()
  })

  test('keeps unrevealed beats out of the accessibility tree', () => {
    render(<Deck slides={deckWith(BeatState, 2)} showProgressRail={false} />)

    const action = screen.getByRole('button', { hidden: true, name: 'revealed action' })
    expect(action.closest('[inert]')).toBeTruthy()

    fireEvent.keyDown(window, { key: ' ' })
    expect(action.closest('[inert]')).toBeNull()
  })

  test('renders an actionable empty state', () => {
    render(<Deck slides={[]} />)
    expect(screen.getByText('add your first slide to begin')).toBeTruthy()
  })

  // Overlay exits take several seconds under happy-dom (AnimatePresence
  // exit completion, not real animation time), so overlay-closing tests
  // carry explicit timeouts and generous waitFor windows.
  const overlayExit = { timeout: 8000 }

  test('opens the shortcut help overlay on ? and closes it on escape', async () => {
    render(<Deck slides={deckWith(EmptySlide)} showProgressRail={false} />)

    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByRole('dialog', { name: 'keyboard' })).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), overlayExit)
  }, 15000)

  test('keeps grid and help mutually exclusive', async () => {
    render(<Deck slides={deckWith(EmptySlide)} showProgressRail={false} />)

    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByRole('dialog', { name: 'keyboard' })).toBeTruthy()

    fireEvent.keyDown(window, { key: 'g' })
    await waitFor(
      () => expect(screen.queryByRole('dialog', { name: 'keyboard' })).toBeNull(),
      overlayExit
    )
    expect(screen.getByRole('dialog', { name: 'Slide overview' })).toBeTruthy()
  }, 15000)

  test('warns in dev when a Beat sits past the declared beat count', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const Overdeclared = () => (
        <Beat at={3}>
          <p>unreachable</p>
        </Beat>
      )
      render(<Deck slides={deckWith(Overdeclared, 2)} showProgressRail={false} />)
      const beatWarnings = warn.mock.calls.filter((call) =>
        String(call[0]).includes('can never reveal')
      )
      expect(beatWarnings.length).toBe(1)
      expect(String(beatWarnings[0]?.[0])).toContain('beats: 4')
    } finally {
      warn.mockRestore()
    }
  })

  test('swallows deck keys while a modal is open', async () => {
    render(<Deck slides={deckWith(EmptySlide)} showProgressRail={false} />)
    await waitFor(() => expect(window.location.hash).toBe('#1'))

    fireEvent.keyDown(window, { key: 'g' })
    expect(screen.getByRole('dialog', { name: 'Slide overview' })).toBeTruthy()

    fireEvent.keyDown(window, { key: ' ' })
    fireEvent.keyDown(window, { key: 'End' })
    expect(window.location.hash).toBe('#1')
    expect(screen.getByRole('dialog', { name: 'Slide overview' })).toBeTruthy()

    fireEvent.keyDown(window, { key: '?' })
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'keyboard' })).toBeTruthy(), {
      timeout: 8000,
    })

    fireEvent.keyDown(window, { key: 'n' })
    expect(document.querySelector('.prezzer-speaker-notes')).toBeNull()
  }, 15000)

  test('grid typeahead jumps to a typed slide number', async () => {
    render(<Deck slides={deckWith(EmptySlide)} showProgressRail={false} />)

    fireEvent.keyDown(window, { key: 'g' })
    const grid = screen.getByRole('dialog', { name: 'Slide overview' })

    fireEvent.keyDown(grid, { key: '2' })
    fireEvent.keyDown(grid, { key: 'Enter' })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), overlayExit)
    await waitFor(() => expect(screen.getByRole('region', { name: 'second' })).toBeTruthy(), {
      timeout: 4000,
    })
  }, 15000)

  test('grid arrows move focus across slide cards', () => {
    render(<Deck slides={deckWith(EmptySlide)} showProgressRail={false} />)

    fireEvent.keyDown(window, { key: 'g' })
    const grid = screen.getByRole('dialog', { name: 'Slide overview' })

    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    const cards = screen.getAllByRole('button')
    expect(document.activeElement).toBe(cards[1] as HTMLElement)
  })

  test('grid escape still works after focus moves to a card', async () => {
    render(<Deck slides={deckWith(EmptySlide)} showProgressRail={false} />)

    fireEvent.keyDown(window, { key: 'g' })
    const grid = screen.getByRole('dialog', { name: 'Slide overview' })

    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    const focused = document.activeElement as HTMLElement
    fireEvent.keyDown(focused, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), overlayExit)
  }, 15000)

  test('grid leaves modified keystrokes to the browser', () => {
    render(<Deck slides={deckWith(EmptySlide)} showProgressRail={false} />)

    fireEvent.keyDown(window, { key: 'g' })
    const grid = screen.getByRole('dialog', { name: 'Slide overview' })
    const dialogFocus = document.activeElement

    fireEvent.keyDown(grid, { key: 'ArrowRight', metaKey: true })
    expect(document.activeElement).toBe(dialogFocus as HTMLElement)
  })

  test('beat audit re-arms when a live deck replaces the slide', async () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const OverdeclaredA = () => (
        <Beat at={2}>
          <p>unreachable a</p>
        </Beat>
      )
      const OverdeclaredB = () => (
        <Beat at={3}>
          <p>unreachable b</p>
        </Beat>
      )
      const { rerender } = render(
        <Deck
          slides={[{ id: 'A', title: 'a', component: OverdeclaredA, beats: 1 }]}
          showProgressRail={false}
        />
      )
      rerender(
        <Deck
          slides={[{ id: 'B', title: 'b', component: OverdeclaredB, beats: 1 }]}
          showProgressRail={false}
        />
      )
      await waitFor(() => {
        const beatWarnings = warn.mock.calls.filter((call) =>
          String(call[0]).includes('can never reveal')
        )
        expect(beatWarnings.length).toBe(2)
      })
    } finally {
      warn.mockRestore()
    }
  })

  test('mirrors position without growing browser history', async () => {
    render(<Deck slides={deckWith(BeatState, 2)} showProgressRail={false} />)
    await waitFor(() => expect(window.location.hash).toBe('#1'))
    const entries = history.length

    fireEvent.keyDown(window, { key: ' ' })
    await waitFor(() => expect(window.location.hash).toBe('#1.1'))
    fireEvent.keyDown(window, { key: ' ' })
    await waitFor(() => expect(window.location.hash).toBe('#2'))

    expect(history.length).toBe(entries)
  })

  test('preserves host history.state while mirroring the hash', async () => {
    history.replaceState({ hostRouter: 'kept' }, '', window.location.href)
    render(<Deck slides={deckWith(EmptySlide)} showProgressRail={false} />)

    fireEvent.keyDown(window, { key: 'End' })
    await waitFor(() => expect(window.location.hash).toBe('#2'))
    expect((history.state as { hostRouter?: string })?.hostRouter).toBe('kept')
  })

  test('rewrites a hand-typed hash that clamps to the deck', async () => {
    render(<Deck slides={deckWith(EmptySlide)} showProgressRail={false} />)
    await waitFor(() => expect(window.location.hash).toBe('#1'))

    history.replaceState(null, '', '#9')
    window.dispatchEvent(new Event('hashchange'))

    await waitFor(() => expect(window.location.hash).toBe('#2'))
    await waitFor(() => expect(screen.getByRole('region', { name: 'second' })).toBeTruthy(), {
      timeout: 4000,
    })
  })

  test('leaves the URL alone when hashSync is off', async () => {
    render(<Deck slides={deckWith(EmptySlide)} hashSync={false} showProgressRail={false} />)

    fireEvent.keyDown(window, { key: 'End' })
    await waitFor(() => expect(screen.getByRole('region', { name: 'second' })).toBeTruthy())
    expect(window.location.hash).toBe('')
  })

  test('clamps navigation when a live deck removes slides', async () => {
    const slides = deckWith(EmptySlide)
    const { rerender } = render(<Deck slides={slides} showProgressRail={false} />)

    fireEvent.keyDown(window, { key: 'End' })
    await waitFor(() => expect(window.location.hash).toBe('#2'))

    rerender(<Deck slides={slides.slice(0, 1)} showProgressRail={false} />)
    await waitFor(() => expect(window.location.hash).toBe('#1'))
    expect(screen.getByRole('region', { name: 'first' })).toBeTruthy()
  })
})
