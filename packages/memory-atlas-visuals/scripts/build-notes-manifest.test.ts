import { describe, expect, it } from 'vitest'
import { buildNotesManifest } from './build-notes-manifest'

const files = ['map/zones/auth.md', 'specs/2026-06-24-x.md', 'visuals/app/should-be-excluded.md']
const read = (rel: string) =>
  rel === 'map/zones/auth.md'
    ? '---\ntitle: Auth\ntype: zone\n---\n# Auth\n'
    : rel === 'specs/2026-06-24-x.md'
      ? '# Heading Title\nbody'
      : 'x'
const digestEntries = [{ source: 'map/zones/auth.md', route: '/auth' }]
const vaultRelPaths = files.filter((f) => !f.startsWith('visuals/app/'))

describe('buildNotesManifest', () => {
  const { notes } = buildNotesManifest({
    files,
    read,
    digestEntries,
    generated: '2026-06-24',
    vaultRelPaths,
  })

  it('excludes visuals/app/**', () => {
    expect(notes.find((n) => n.relPath.startsWith('visuals/app/'))).toBeUndefined()
  })
  it('takes title from frontmatter, then first H1, then filename', () => {
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by preceding test fixture
    expect(notes.find((n) => n.relPath === 'map/zones/auth.md')!.title).toBe('Auth')
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by preceding test fixture
    expect(notes.find((n) => n.relPath === 'specs/2026-06-24-x.md')!.title).toBe('Heading Title')
  })
  it('derives the group dynamically', () => {
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by preceding test fixture
    expect(notes.find((n) => n.relPath === 'map/zones/auth.md')!.group).toBe('map/zones')
  })
  it('flags illustrated + illustratedRoute by matching a digest source', () => {
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by preceding test fixture
    const auth = notes.find((n) => n.relPath === 'map/zones/auth.md')!
    expect(auth.illustrated).toBe(true)
    expect(auth.illustratedRoute).toBe('/auth')
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by preceding test fixture
    expect(notes.find((n) => n.relPath === 'specs/2026-06-24-x.md')!.illustrated).toBe(false)
  })

  it('emits outbound (empty for fixtures with no wikilinks)', () => {
    const auth = notes.find((n) => n.relPath === 'map/zones/auth.md')
    expect(auth).toBeDefined()
    expect(Array.isArray(auth?.outbound)).toBe(true)
    expect(auth?.outbound).toEqual([])
    expect(notes.find((n) => n.relPath === 'specs/2026-06-24-x.md')?.outbound).toEqual([])
  })
})
