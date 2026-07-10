import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { Deck, type SlideDef } from 'prezzer'
import { Starfield } from 'prezzer/chrome'

afterEach(cleanup)

function PublishedSlide() {
  return (
    <div>
      <Starfield count={4} />
      package exports share one deck context
    </div>
  )
}

const slides: SlideDef[] = [
  {
    id: 'S1',
    title: 'published package',
    component: PublishedSlide,
  },
]

describe('published package exports', () => {
  test('compose root and chrome entrypoints without duplicating context', () => {
    render(<Deck slides={slides} showProgressRail={false} />)

    expect(screen.getByRole('region', { name: 'published package' })).toBeTruthy()
    expect(screen.getByText('package exports share one deck context')).toBeTruthy()
  })
})
