import { describe, expect, it } from 'vitest'
import { collectStaleRows } from './check-stale'

describe('check-stale scan', () => {
  it('sees the real digests (not 0) across skin trees', () => {
    const rows = collectStaleRows()
    expect(rows.length).toBeGreaterThan(0) // regression guard: the old flat walk returned 0
    expect(rows.every((r) => ['fresh', 'stale', 'missing'].includes(r.freshness))).toBe(true)
  })
})
