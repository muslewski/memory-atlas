import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import Gallery from './Gallery'

afterEach(cleanup)

const renderGal = () =>
  render(
    <MemoryRouter>
      <Gallery />
    </MemoryRouter>,
  )

describe('Gallery (vault-wide)', () => {
  it('indexes the whole vault, not just the digests', () => {
    renderGal()
    // A plan has no digest and must still appear.
    expect(screen.getAllByTestId('gallery-card').length).toBeGreaterThan(100)
  })

  it('filters to digest-backed notes when the visual chip is active', () => {
    renderGal()
    fireEvent.click(screen.getByTestId('filter-illustrated'))
    const cards = screen.getAllByTestId('gallery-card')
    expect(cards.length).toBeLessThan(100)
    expect(cards.every((c) => c.querySelector('[data-testid="visual-badge"]'))).toBe(true)
  })
})
