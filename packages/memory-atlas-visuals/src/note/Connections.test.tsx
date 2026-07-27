import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import Connections from './Connections'

afterEach(cleanup)

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('Connections', () => {
  it('renders nothing when outbound is empty', () => {
    const { container } = wrap(<Connections outbound={[]} />)
    expect(container.querySelector('[data-testid="connections"]')).toBeNull()
  })

  it('renders nothing when outbound is absent (undefined)', () => {
    // outbound is an optional prop, so omitting it is valid — exercises the absent case.
    const { container } = wrap(<Connections />)
    expect(container.querySelector('[data-testid="connections"]')).toBeNull()
  })

  it('links digest target, source target, and greys missing route', () => {
    const { getByTestId } = wrap(
      <Connections
        outbound={[
          { title: 'A', slug: 'a', illustrated: true, route: '/specs/a' },
          { title: 'B', slug: 'b', illustrated: false, route: '/source/x/b.md' },
          { title: 'C', slug: 'c', illustrated: false, route: null },
        ]}
      />,
    )
    // digest link
    expect(getByTestId('connection-a').getAttribute('href')).toBe('/specs/a')
    // source link
    expect(getByTestId('connection-b').getAttribute('href')).toBe('/source/x/b.md')
    // null route → greyed span, not an anchor
    expect(getByTestId('connection-c').tagName).toBe('SPAN')
    expect(getByTestId('connection-c').hasAttribute('href')).toBe(false)
  })

  it('nav container has data-testid="connections" and aria-label when non-empty', () => {
    const { getByTestId } = wrap(
      <Connections
        outbound={[{ title: 'X', slug: 'x', illustrated: false, route: '/source/x.md' }]}
      />,
    )
    const nav = getByTestId('connections')
    expect(nav.tagName).toBe('NAV')
    expect(nav.getAttribute('aria-label')).toBeTruthy()
  })

  it('renders outbound links for a note that has no illustration', () => {
    render(
      <MemoryRouter>
        <Connections relPath="map/zones/timeline.md" />
      </MemoryRouter>,
    )
    // A zone card has no illustration, but it does have wikilinks — it must still be navigable.
    expect(screen.getByTestId('connections')).toBeTruthy()
  })
})
