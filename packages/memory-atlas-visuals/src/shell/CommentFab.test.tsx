import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import CommentFab from './CommentFab'

// Mock the source resolver so the test doesn't depend on the real manifest.
vi.mock('./useNoteSource', () => ({ useNoteSource: () => mockSource }))
let mockSource: string | null = 'ideas/community-library.md'

afterEach(cleanup)

beforeEach(() => {
  mockSource = 'ideas/community-library.md'
  // biome-ignore lint/suspicious/noExplicitAny: mock type in test, narrowing not practical
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })) as any)
  Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => {}) } })
})

const renderFab = () =>
  render(
    <MemoryRouter>
      <CommentFab />
    </MemoryRouter>,
  )

// biome-ignore lint/suspicious/noExplicitAny: mock type in test, narrowing not practical
const mkEntries = (n: number): any[] =>
  Array.from({ length: n }, (_, i) => ({
    file: `note${i}.md`,
    created: `2026-01-${String(i + 1).padStart(2, '0')}T10:00`,
    title: `Note ${i}`,
    preview: `body ${i}`,
    body: `full body ${i}`,
  }))

// === Round-1 tests ===

it('renders nothing when there is no source (gallery route)', () => {
  mockSource = null
  renderFab()
  expect(screen.queryByTestId('comment-fab')).toBeNull()
})

it('renders the button on a note route', () => {
  renderFab()
  expect(screen.getByTestId('comment-fab')).toBeTruthy()
})

it('Save posts the note (without forcing a clipboard copy)', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => [] }) // initial GET
    .mockResolvedValueOnce({ ok: true, json: async () => ({ path: 'raw-prompts/x.md' }) }) // POST
    .mockResolvedValueOnce({ ok: true, json: async () => [] }) // refresh GET
  // biome-ignore lint/suspicious/noExplicitAny: mock type in test, narrowing not practical
  vi.stubGlobal('fetch', fetchMock as any)
  renderFab()
  fireEvent.click(screen.getByTestId('comment-fab'))
  fireEvent.click(screen.getByTestId('comment-new')) // list → editor
  fireEvent.change(screen.getByTestId('comment-textarea'), { target: { value: 'my thought' } })
  fireEvent.click(screen.getByTestId('comment-save'))
  await waitFor(() => {
    const post = fetchMock.mock.calls.find((c) => c[1]?.method === 'POST')
    expect(post).toBeTruthy()
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by preceding expect().toBeTruthy()
    expect(JSON.parse(post![1].body)).toMatchObject({
      source: 'ideas/community-library.md',
      body: 'my thought',
    })
  })
  // Save succeeded → it does NOT auto-copy (copy is now a separate button)
  expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
})

it('Copy prompt copies the formatted prompt to the clipboard', async () => {
  renderFab()
  fireEvent.click(screen.getByTestId('comment-fab'))
  fireEvent.click(screen.getByTestId('comment-new'))
  fireEvent.change(screen.getByTestId('comment-textarea'), { target: { value: 'my thought' } })
  fireEvent.click(screen.getByTestId('comment-copy'))
  await waitFor(() => {
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'Written while looking at: @syndcast-mind/ideas/community-library.md\n\nmy thought',
    )
  })
})

// === List ⇄ editor master-detail tests ===

it('lists many notes and filters them by search query', async () => {
  vi.stubGlobal(
    'fetch',
    // biome-ignore lint/suspicious/noExplicitAny: mock type in test, narrowing not practical
    vi.fn().mockResolvedValue({ ok: true, json: async () => mkEntries(8) }) as any,
  )
  renderFab()
  await waitFor(() => expect(screen.getAllByTestId('comment-entry').length).toBe(8))
  fireEvent.change(screen.getByTestId('comment-search'), { target: { value: 'Note 3' } })
  await waitFor(() => expect(screen.getAllByTestId('comment-entry').length).toBe(1))
  expect(screen.getByText('Note 3')).toBeTruthy()
})

it('clicking a note opens the editor with its body', async () => {
  const entries = [
    {
      file: 'note1.md',
      created: '2026-01-01T10:00',
      title: 'My Prompt Title',
      preview: 'b',
      body: 'My full prompt body text here',
    },
  ]
  // biome-ignore lint/suspicious/noExplicitAny: mock type in test, narrowing not practical
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => entries }) as any)
  renderFab()
  await waitFor(() => expect(screen.getByTestId('comment-entry')).toBeTruthy())
  // No editor in list view
  expect(screen.queryByTestId('comment-textarea')).toBeNull()
  fireEvent.click(screen.getByTestId('comment-entry'))
  await waitFor(() =>
    expect((screen.getByTestId('comment-textarea') as HTMLTextAreaElement).value).toBe(
      'My full prompt body text here',
    ),
  )
})

it('editing a note PUTs {file, body} and refreshes the list', async () => {
  const entries = [
    {
      file: 'note1.md',
      created: '2026-01-01T10:00',
      title: 'My Prompt',
      preview: 'Original body',
      body: 'Original body',
    },
  ]
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => entries }) // initial GET
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // PUT
    .mockResolvedValueOnce({ ok: true, json: async () => entries }) // refresh GET
  // biome-ignore lint/suspicious/noExplicitAny: mock type in test, narrowing not practical
  vi.stubGlobal('fetch', fetchMock as any)
  renderFab()
  await waitFor(() => expect(screen.getByTestId('comment-entry')).toBeTruthy())
  fireEvent.click(screen.getByTestId('comment-entry'))
  await waitFor(() =>
    expect((screen.getByTestId('comment-textarea') as HTMLTextAreaElement).value).toBe(
      'Original body',
    ),
  )
  fireEvent.change(screen.getByTestId('comment-textarea'), { target: { value: 'Updated body' } })
  fireEvent.click(screen.getByTestId('comment-save'))
  await waitFor(() => {
    const put = fetchMock.mock.calls.find((c) => c[1]?.method === 'PUT')
    expect(put).toBeTruthy()
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by preceding expect().toBeTruthy()
    expect(JSON.parse(put![1].body)).toMatchObject({ file: 'note1.md', body: 'Updated body' })
    const gets = fetchMock.mock.calls.filter((c) => String(c[0]).includes('raw-prompts?source='))
    expect(gets.length).toBeGreaterThanOrEqual(2)
  })
})

it('deep-links ?comment=<file> straight into that note’s editor', async () => {
  const entries = [
    {
      file: 'note1.md',
      created: '2026-01-01T10:00',
      title: 'Deep',
      preview: 'b',
      body: 'Deep body text',
    },
  ]
  // biome-ignore lint/suspicious/noExplicitAny: mock type in test, narrowing not practical
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => entries }) as any)
  render(
    <MemoryRouter initialEntries={['/ideas/x?comment=note1.md']}>
      <CommentFab />
    </MemoryRouter>,
  )
  // Drawer opens straight in editor with the targeted note loaded (skips the list).
  await waitFor(() =>
    expect((screen.getByTestId('comment-textarea') as HTMLTextAreaElement).value).toBe(
      'Deep body text',
    ),
  )
})

it('deleting from the list: inline confirm then DELETE and refresh', async () => {
  const entries = [
    {
      file: 'note1.md',
      created: '2026-01-01T10:00',
      title: 'My Prompt',
      preview: 'x',
      body: 'Body to delete',
    },
  ]
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => entries }) // initial GET
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // DELETE
    .mockResolvedValueOnce({ ok: true, json: async () => [] }) // refresh GET
  // biome-ignore lint/suspicious/noExplicitAny: mock type in test, narrowing not practical
  vi.stubGlobal('fetch', fetchMock as any)
  renderFab()
  await waitFor(() => expect(screen.getByTestId('comment-entry')).toBeTruthy())
  fireEvent.click(screen.getByTestId('comment-delete'))
  await waitFor(() => expect(screen.getByTestId('comment-delete-confirm')).toBeTruthy())
  fireEvent.click(screen.getByTestId('comment-delete-confirm'))
  await waitFor(() => {
    const del = fetchMock.mock.calls.find((c) => c[1]?.method === 'DELETE')
    expect(del).toBeTruthy()
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by preceding expect().toBeTruthy()
    expect(String(del![0])).toContain('file=note1.md')
    const gets = fetchMock.mock.calls.filter((c) => String(c[0]).includes('raw-prompts?source='))
    expect(gets.length).toBeGreaterThanOrEqual(2)
  })
})
