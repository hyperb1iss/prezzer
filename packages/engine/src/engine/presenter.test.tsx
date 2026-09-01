import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SlideDef } from '../types'
import { Deck } from './Deck'
import type { PresenterMessage } from './presenterBridge'
import { PresenterView } from './PresenterView'

interface FakeWindow {
  closed: boolean
  posted: PresenterMessage[]
  postMessage: (message: unknown) => void
}

function fakeWindow(): FakeWindow {
  const posted: PresenterMessage[] = []
  return {
    closed: false,
    posted,
    postMessage: (message: unknown) => {
      posted.push(message as PresenterMessage)
    },
  }
}

function setOpener(opener: FakeWindow | null) {
  Object.defineProperty(window, 'opener', { value: opener, configurable: true })
}

afterEach(() => {
  cleanup()
  setOpener(null)
  window.location.hash = ''
})

function NoteSlide() {
  return <p>slide body</p>
}

const slides: SlideDef[] = [
  { id: 'S1', title: 'opening', notes: ['say hello'], component: NoteSlide, beats: 2 },
  { id: 'S2', title: 'closing', component: NoteSlide },
]

describe('PresenterView', () => {
  test('introduces itself to the audience window and forwards keys as commands', () => {
    const audience = fakeWindow()
    setOpener(audience)
    render(<PresenterView slides={slides} />)

    expect(audience.posted[0]).toEqual({ prezzer: 'hello' })

    fireEvent.keyDown(window, { key: ' ' })
    expect(audience.posted).toContainEqual({ prezzer: 'command', action: 'next' })

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(audience.posted).toContainEqual({ prezzer: 'command', action: 'prev' })

    fireEvent.keyDown(window, { key: 'd' })
    expect(audience.posted).toContainEqual({ prezzer: 'command', action: 'toggleDeny' })
  })

  test('applies state messages from the audience window', async () => {
    const audience = fakeWindow()
    setOpener(audience)
    render(<PresenterView slides={slides} />)

    expect(screen.getByText('○ waiting for the deck window')).toBeTruthy()

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          prezzer: 'state',
          nav: { slideIndex: 1, beat: 0, direction: 1 },
          denyMode: false,
        } satisfies PresenterMessage,
        source: audience as never,
      })
    )

    await waitFor(() => expect(screen.getByText('● synced')).toBeTruthy())
    expect(screen.getByText('slide 2/2')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'closing' })).toBeTruthy()
  })

  test('ignores state from windows other than the opener', () => {
    const audience = fakeWindow()
    setOpener(audience)
    render(<PresenterView slides={slides} />)

    const impostor = fakeWindow()
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          prezzer: 'state',
          nav: { slideIndex: 1, beat: 0, direction: 1 },
          denyMode: false,
        } satisfies PresenterMessage,
        source: impostor as never,
      })
    )

    expect(screen.getByText('○ waiting for the deck window')).toBeTruthy()
  })

  test('shows current notes and the upcoming slide title', () => {
    const audience = fakeWindow()
    setOpener(audience)
    render(<PresenterView slides={slides} />)

    expect(screen.getByText('say hello')).toBeTruthy()
    expect(screen.getByText('closing')).toBeTruthy()
  })
})

describe('presenter audience', () => {
  test('answers a hello with state and applies commands from that window', async () => {
    render(<Deck slides={slides} showProgressRail={false} />)

    const presenter = fakeWindow()
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { prezzer: 'hello' } satisfies PresenterMessage,
        source: presenter as never,
      })
    )

    await waitFor(() => {
      const state = presenter.posted.find((message) => message.prezzer === 'state')
      expect(state).toBeTruthy()
    })

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { prezzer: 'command', action: 'nextSlide' } satisfies PresenterMessage,
        source: presenter as never,
      })
    )
    await waitFor(() => expect(window.location.hash).toBe('#2'))

    const states = presenter.posted.filter(
      (message): message is Extract<PresenterMessage, { prezzer: 'state' }> =>
        message.prezzer === 'state'
    )
    expect(states.at(-1)?.nav.slideIndex).toBe(1)
  })

  test('ignores commands from windows it never adopted', async () => {
    render(<Deck slides={slides} showProgressRail={false} />)
    await waitFor(() => expect(window.location.hash).toBe('#1'))

    const impostor = fakeWindow()
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { prezzer: 'command', action: 'nextSlide' } satisfies PresenterMessage,
        source: impostor as never,
      })
    )

    expect(window.location.hash).toBe('#1')
  })
})
