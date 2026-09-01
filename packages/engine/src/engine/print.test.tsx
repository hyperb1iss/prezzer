import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { Beat } from './Beat'
import { PrintView } from './PrintView'

afterEach(cleanup)

function Revealing() {
  return (
    <div>
      <p>always visible</p>
      <Beat at={1}>
        <p>beat one</p>
      </Beat>
      <Beat at={2}>
        <p>beat two</p>
      </Beat>
    </div>
  )
}

function Closing() {
  return <p>closing body</p>
}

describe('PrintView', () => {
  test('renders one page per slide with every beat revealed', () => {
    render(
      <PrintView
        slides={[
          { id: 'S1', title: 'reveals', component: Revealing, beats: 3 },
          { id: 'S2', title: 'closing', component: Closing, badge: 'GA' },
        ]}
      />
    )

    expect(screen.getByRole('region', { name: 'reveals' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'closing' })).toBeTruthy()

    for (const text of ['beat one', 'beat two']) {
      expect(screen.getByText(text).closest('[inert]')).toBeNull()
    }
    expect(screen.getByText('GA')).toBeTruthy()
  })

  test('keeps beats hidden on a page whose slide reveals none', () => {
    render(<PrintView slides={[{ id: 'S1', title: 'reveals', component: Revealing, beats: 1 }]} />)
    expect(screen.getByText('beat one').closest('[inert]')).toBeTruthy()
  })
})
