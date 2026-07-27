import { describe, expect, it } from 'vitest'
import { noteSourceFromPath } from './useNoteSource'

describe('noteSourceFromPath', () => {
  it('resolves the note source from a /note/ URL', () => {
    expect(noteSourceFromPath('/note/map/zones/timeline')).toBe('map/zones/timeline.md')
  })
  it('handles a deeply nested /note/ path', () => {
    expect(noteSourceFromPath('/note/specs/2026-07-12-vellum-notes-ia')).toBe(
      'specs/2026-07-12-vellum-notes-ia.md',
    )
  })
  it('handles root-level note under /note/', () => {
    expect(noteSourceFromPath('/note/BACKLOG')).toBe('BACKLOG.md')
  })
  it('strips .md if present in /note/ (defensive)', () => {
    expect(noteSourceFromPath('/note/map/zones/timeline.md')).toBe('map/zones/timeline.md')
  })
  it('returns null for non-note paths with insufficient segments', () => {
    expect(noteSourceFromPath('/')).toBe(null)
    expect(noteSourceFromPath('/comments')).toBe(null)
  })
  it('still resolves legacy two-segment illustrated routes via manifest', () => {
    // BACKLOG is illustrated, legacy route would have been /backlog/BACKLOG
    expect(noteSourceFromPath('/backlog/BACKLOG')).toBe('BACKLOG.md')
  })
  it('returns null for unknown legacy route', () => {
    expect(noteSourceFromPath('/no/such')).toBe(null)
  })
  it('tolerates a /source/ prefix by stripping (legacy tolerance)', () => {
    expect(noteSourceFromPath('/source/backlog/BACKLOG')).toBe('BACKLOG.md')
  })
})
