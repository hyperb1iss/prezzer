import { afterEach, describe, expect, test } from 'bun:test'
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

  test('rewrites a hand-typed hash that clamps to the deck', async () => {
    render(<Deck slides={deckWith(EmptySlide)} showProgressRail={false} />)
    await waitFor(() => expect(window.location.hash).toBe('#1'))

    history.replaceState(null, '', '#9')
    window.dispatchEvent(new Event('hashchange'))

    await waitFor(() => expect(window.location.hash).toBe('#2'))
    expect(screen.getByRole('region', { name: 'second' })).toBeTruthy()
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
