import { describe, expect, it } from 'vitest'
import { noteHref, relPathFromNoteParam, resolveLegacyPathname } from './note-route'

describe('noteHref', () => {
  it('strips the .md extension', () => {
    expect(noteHref('specs/2026-07-12-foo.md')).toBe('/note/specs/2026-07-12-foo')
  })
  it('handles a deeply nested note', () => {
    expect(noteHref('map/zones/timeline.md')).toBe('/note/map/zones/timeline')
  })
  it('handles a root-level note', () => {
    expect(noteHref('BACKLOG.md')).toBe('/note/BACKLOG')
  })
})

describe('relPathFromNoteParam', () => {
  it('round-trips noteHref', () => {
    expect(relPathFromNoteParam('specs/2026-07-12-foo')).toBe('specs/2026-07-12-foo.md')
    expect(relPathFromNoteParam('map/zones/timeline')).toBe('map/zones/timeline.md')
  })
})

describe('resolveLegacyPathname', () => {
  const notes = [
    {
      relPath: 'specs/2026-07-27-project-multi-timeline-mvp-design.md',
      illustratedRoute: '/specs/2026-07-27-project-multi-timeline-mvp-design',
    },
    { relPath: 'map/zones/agent-spine.md', illustratedRoute: null },
    { relPath: 'ideas/foo.md', illustratedRoute: '/ideas/foo' },
  ]

  it('matches illustratedRoute exactly', () => {
    expect(resolveLegacyPathname('/specs/2026-07-27-project-multi-timeline-mvp-design', notes)).toBe(
      '/note/specs/2026-07-27-project-multi-timeline-mvp-design',
    )
  })

  it('falls back to vault relPath when illustratedRoute is null', () => {
    expect(resolveLegacyPathname('/map/zones/agent-spine', notes)).toBe('/note/map/zones/agent-spine')
  })

  it('strips a trailing slash', () => {
    expect(resolveLegacyPathname('/ideas/foo/', notes)).toBe('/note/ideas/foo')
  })

  it('returns null for unknown paths (never invent a home redirect)', () => {
    expect(resolveLegacyPathname('/specs/does-not-exist', notes)).toBeNull()
    expect(resolveLegacyPathname('/totally/missing', notes)).toBeNull()
  })

  it('rejects path traversal', () => {
    expect(resolveLegacyPathname('/../secrets', notes)).toBeNull()
  })
})
