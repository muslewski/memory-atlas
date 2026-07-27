import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import CommentsIndex from './CommentsIndex'

afterEach(cleanup)
beforeEach(() => {
  // biome-ignore lint/suspicious/noExplicitAny: mock type in test, narrowing not practical
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })) as any)
})

const renderIdx = () =>
  render(
    <MemoryRouter>
      <CommentsIndex />
    </MemoryRouter>,
  )

const sample = [
  {
    file: 'a.md',
    source: 'ideas/x.md',
    route: '/ideas/x',
    created: '2026-01-02T10:00',
    title: 'On X',
    preview: 'about x',
    body: 'about x',
  },
  {
    file: 'b.md',
    source: 'ideas/x.md',
    route: '/ideas/x',
    created: '2026-01-01T10:00',
    title: 'Also X',
    preview: 'more x',
    body: 'more x',
  },
  {
    file: 'c.md',
    source: 'specs/y.md',
    route: '/specs/y',
    created: '2026-01-03T10:00',
    title: 'On Y',
    preview: 'about y',
    body: 'about y',
  },
]

it('shows one card per commented source, linking to its digest, newest first', async () => {
  // biome-ignore lint/suspicious/noExplicitAny: mock type in test, narrowing not practical
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => sample }) as any)
  renderIdx()
  await waitFor(() => expect(screen.getAllByTestId('comments-card').length).toBe(2))
  const links = screen.getAllByTestId('comments-card-link')
  // specs/y has the newest comment (01-03) → first card
  expect(links[0].getAttribute('href')).toBe('/specs/y')
  expect(links.map((c) => c.getAttribute('href'))).toContain('/ideas/x')
  // ideas/x card aggregates both of its comments
  expect(screen.getByText(/2 comments/)).toBeTruthy()
  expect(screen.getByText(/1 comment\b/)).toBeTruthy()
  // the comments themselves are rendered inline
  expect(screen.getByText('On X')).toBeTruthy()
  expect(screen.getByText('Also X')).toBeTruthy()
  expect(screen.getByText('On Y')).toBeTruthy()
})

it('collapses comments beyond the first five behind a show-more toggle', async () => {
  const many = Array.from({ length: 7 }, (_, i) => ({
    file: `n${i}.md`,
    source: 'ideas/z.md',
    route: '/ideas/z',
    created: `2026-02-0${i + 1}T10:00`,
    title: `C${i}`,
    preview: `p${i}`,
    body: `p${i}`,
  }))
  // biome-ignore lint/suspicious/noExplicitAny: mock type in test, narrowing not practical
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => many }) as any)
  renderIdx()
  await waitFor(() => expect(screen.getByTestId('comments-card')).toBeTruthy())
  expect(screen.getAllByTestId('comments-card-item').length).toBe(5)
  fireEvent.click(screen.getByTestId('comments-card-more'))
  await waitFor(() => expect(screen.getAllByTestId('comments-card-item').length).toBe(7))
})

it('filters cards by the search box', async () => {
  // biome-ignore lint/suspicious/noExplicitAny: mock type in test, narrowing not practical
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => sample }) as any)
  renderIdx()
  await waitFor(() => expect(screen.getAllByTestId('comments-card').length).toBe(2))
  fireEvent.change(screen.getByTestId('comments-search'), { target: { value: 'about y' } })
  await waitFor(() => expect(screen.getAllByTestId('comments-card').length).toBe(1))
  expect(screen.getByText('specs/y.md')).toBeTruthy()
})

it('shows an empty state when there are no comments', async () => {
  renderIdx()
  await waitFor(() => expect(screen.getByText(/No comments yet/)).toBeTruthy())
})

it('renders a comment whose source note has no illustration', () => {
  const comments = [
    {
      file: 'a.md',
      source: 'map/zones/timeline.md', // a zone card — no illustration, ever
      route: '/legacy/ignored',
      created: '2026-07-12',
      title: 'On the timeline',
      preview: 'p',
      body: 'b',
    },
  ]
  render(
    <MemoryRouter>
      <CommentsIndex comments={comments} />
    </MemoryRouter>,
  )
  // It must show the note's real title and link to its canonical URL —
  // not fall through to an empty card because the digest manifest has no row.
  expect(screen.getByText('Timeline')).toBeTruthy()
  const headLink = screen.getByTestId('comments-card-link')
  expect(headLink.getAttribute('href')).toBe('/note/map/zones/timeline')
})
