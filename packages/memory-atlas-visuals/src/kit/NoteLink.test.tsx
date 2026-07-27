import { cleanup, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NoteLink } from './NoteLink'
import { type OutboundLink, OutboundProvider, resolveNoteLink } from './outbound'

afterEach(cleanup)

const OUT: OutboundLink[] = [
  {
    title: 'Skills v1',
    slug: '2026-06-23-syndcast-skills-v1-design',
    illustrated: true,
    route: '/specs/2026-06-23-syndcast-skills-v1-design',
  },
  {
    title: 'Blueprints',
    slug: 'blueprints',
    illustrated: false,
    route: '/source/map/zones/blueprints.md',
  },
  { title: 'Ghost', slug: 'ghost-note', illustrated: false, route: null },
]

const wrap = (to: string, variant?: 'inline' | 'button') =>
  render(
    <MemoryRouter>
      <OutboundProvider value={OUT}>
        <NoteLink to={to} variant={variant}>
          label
        </NoteLink>
      </OutboundProvider>
    </MemoryRouter>,
  )

describe('resolveNoteLink', () => {
  it('exact slug hit', () => {
    expect(resolveNoteLink('blueprints', OUT)?.slug).toBe('blueprints')
  })
  it('date-prefix-insensitive hit', () => {
    expect(resolveNoteLink('syndcast-skills-v1-design', OUT)?.slug).toBe(
      '2026-06-23-syndcast-skills-v1-design',
    )
  })
  it('strips |alias and #heading before matching', () => {
    expect(resolveNoteLink('blueprints|the blueprints#intro', OUT)?.slug).toBe('blueprints')
  })
  it('miss → null', () => {
    expect(resolveNoteLink('not-a-real-note', OUT)).toBeNull()
  })
})

describe('NoteLink', () => {
  it('resolved + route → a real <Link>', () => {
    const { getByTestId } = wrap('2026-06-23-syndcast-skills-v1-design', 'button')
    const el = getByTestId('notelink-2026-06-23-syndcast-skills-v1-design')
    expect(el.tagName).toBe('A')
    expect(el.getAttribute('href')).toBe('/specs/2026-06-23-syndcast-skills-v1-design')
    expect(el.className).toContain('skin-notelink--button')
  })

  it('resolved + null route → greyed span, no href', () => {
    const { getByTestId } = wrap('ghost-note')
    const el = getByTestId('notelink-ghost-note')
    expect(el.tagName).toBe('SPAN')
    expect(el.hasAttribute('href')).toBe(false)
    expect(el.className).toContain('skin-notelink--missing')
  })

  it('unknown slug (not a source connection) → plain text, no anchor, no # link', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container, queryByTestId } = wrap('invented-edge')
    expect(container.querySelector('a')).toBeNull()
    expect(queryByTestId('notelink-invented-edge')).toBeNull()
    const span = container.querySelector('.skin-notelink--plain')
    expect(span?.tagName).toBe('SPAN')
    expect(span?.textContent).toBe('label')
    warn.mockRestore()
  })
})
