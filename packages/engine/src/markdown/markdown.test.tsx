import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Deck } from '../engine/Deck'
import { markdownSlides } from './index'

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

const slides = markdownSlides([
  {
    id: 'M1',
    title: 'markdown slide',
    beats: 2,
    notes: ['spoken note'],
    chunks: ['<h1>from markdown</h1>', '<p>the reveal</p>'],
  },
])

describe('markdownSlides', () => {
  test('renders chunk HTML inside the deck', () => {
    render(<Deck slides={slides} showProgressRail={false} />)
    expect(screen.getByRole('heading', { name: 'from markdown' })).toBeTruthy()
  })

  test('gates later chunks behind beats', () => {
    render(<Deck slides={slides} showProgressRail={false} />)

    const reveal = screen.getByText('the reveal')
    expect(reveal.closest('[inert]')).toBeTruthy()

    fireEvent.keyDown(window, { key: ' ' })
    expect(reveal.closest('[inert]')).toBeNull()
  })

  test('carries slide metadata through to the deck', () => {
    render(<Deck slides={slides} showProgressRail={false} />)
    expect(screen.getByRole('region', { name: 'markdown slide' })).toBeTruthy()
  })
})
