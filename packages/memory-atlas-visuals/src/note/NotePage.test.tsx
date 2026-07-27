import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import NotePage from './NotePage'

// __VAULT_DIR__ stub (vite define) so IllustratedView can render in the two illustrated tests
// without crashing buildSourceLink. Non-illustrated test exercises the no-toggle path.
;(globalThis as Record<string, unknown>).__VAULT_DIR__ = '/stub/vault-root'

afterEach(cleanup)

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/note/*" element={<NotePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('NotePage', () => {
  it('shows no view toggle for a note with no illustration', async () => {
    renderAt('/note/archive/2026-03-14-constants-centralization-design')
    expect(await screen.findByTestId('note-body')).toBeTruthy()
    expect(screen.queryByTestId('view-toggle')).toBeNull()
  })

  it('offers the toggle for an illustrated note, and defaults to illustrated', async () => {
    renderAt('/note/BACKLOG')
    expect(await screen.findByTestId('view-toggle')).toBeTruthy()
    expect(screen.getByTestId('view-toggle').getAttribute('data-view')).toBe('illustrated')
  })

  it('?view=source opens the source view of an illustrated note', async () => {
    renderAt('/note/BACKLOG?view=source')
    expect(await screen.findByTestId('note-body')).toBeTruthy()
    expect(screen.getByTestId('view-toggle').getAttribute('data-view')).toBe('source')
  })
})
