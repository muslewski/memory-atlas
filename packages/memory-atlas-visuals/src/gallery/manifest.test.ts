import { describe, expect, it } from 'vitest'
import manifest from './manifest.json'

// manifest.json has `entries: []` when no .mdx exist yet, which TS infers as
// `never[]`; cast to the entry shape (same pattern as Gallery.tsx/IllustratedView.tsx).
type ManifestEntry = { route: string; freshness: 'fresh' | 'stale' | 'missing' }
const entries = manifest.entries as ManifestEntry[]

describe('manifest shape', () => {
  it('has a generated timestamp string', () => {
    expect(typeof manifest.generated).toBe('string')
    expect(manifest.generated.length).toBeGreaterThan(0)
  })

  it('has an entries array', () => {
    expect(Array.isArray(entries)).toBe(true)
  })

  it('each entry has route and freshness', () => {
    for (const entry of entries) {
      expect(typeof entry.route).toBe('string')
      expect(['fresh', 'stale', 'missing']).toContain(entry.freshness)
    }
  })
})
