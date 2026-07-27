import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Takeaways } from './Takeaways'

// This app has no global testing-library cleanup; unmount between renders so
// data-testid queries don't see elements accumulated from prior tests.
afterEach(cleanup)

describe('Takeaways related links', () => {
  it('renders a {href,title} item as a real clickable link', () => {
    const { getByTestId } = render(
      <Takeaways related={[{ href: '/specs', title: 'More specs' }]}>
        <li>x</li>
      </Takeaways>,
    )
    const link = getByTestId('related-link')
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/specs')
  })

  it('renders a link-shaped bare string as a real link', () => {
    const { getByTestId } = render(
      <Takeaways related={['/source/map/zones/blueprints.md']}>
        <li>x</li>
      </Takeaways>,
    )
    expect(getByTestId('related-link').getAttribute('href')).toBe('/source/map/zones/blueprints.md')
  })

  it('renders a bare descriptive string as a non-link label, not a dead # anchor', () => {
    const { getByTestId, queryByTestId } = render(
      <Takeaways related={['building-blocks · blueprints · specialists (zones)']}>
        <li>x</li>
      </Takeaways>,
    )
    const label = getByTestId('related-label')
    expect(label.tagName).toBe('SPAN')
    expect(label.hasAttribute('href')).toBe(false)
    // and it is NOT a fake link
    expect(queryByTestId('related-link')).toBeNull()
  })
})
