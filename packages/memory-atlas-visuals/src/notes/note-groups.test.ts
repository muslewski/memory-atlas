import { describe, expect, it } from 'vitest'
import { groupOf, prettyGroup, sortGroups } from './note-groups'

describe('groupOf', () => {
  it('uses the top-level folder', () => {
    expect(groupOf('specs/2026-06-24-x.md')).toBe('specs')
    expect(groupOf('tech-debt/y.md')).toBe('tech-debt')
  })
  it('splits map/* one level deeper', () => {
    expect(groupOf('map/zones/auth.md')).toBe('map/zones')
    expect(groupOf('map/decisions/0060-x.md')).toBe('map/decisions')
  })
  it('groups a brand-new folder automatically (no hardcoded list)', () => {
    expect(groupOf('brand-new-folder/note.md')).toBe('brand-new-folder')
  })
  it('handles a root-level note', () => {
    expect(groupOf('README.md')).toBe('(root)')
  })
})

describe('prettyGroup', () => {
  it('humanizes known and unknown groups', () => {
    expect(prettyGroup('map/zones')).toBe('Map · Zones')
    expect(prettyGroup('tech-debt')).toBe('Tech Debt')
    expect(prettyGroup('brand-new-folder')).toBe('Brand New Folder')
  })
})

describe('sortGroups', () => {
  it('orders priority groups first, then the rest alphabetically — never dropping any', () => {
    const out = sortGroups(['zzz', 'specs', 'map/zones', 'tech-debt'])
    expect(out[0]).toBe('map/zones')
    expect(out).toContain('zzz') // unlisted groups are kept
    expect(out.length).toBe(4)
  })
})
