import { describe, expect, it } from 'vitest'
import {
  availableTypes,
  type FilterableEntry,
  FRESHNESS_VALUES,
  filterEntries,
  matchesQuery,
  normalizeType,
} from './gallery-filter'

const e = (over: Partial<FilterableEntry>): FilterableEntry => ({
  title: 'Untitled',
  folder: 'specs',
  type: 'spec',
  status: 'approved',
  freshness: 'fresh',
  illustrated: false,
  ...over,
})

describe('matchesQuery', () => {
  it('empty / whitespace query matches everything', () => {
    expect(matchesQuery(e({}), '')).toBe(true)
    expect(matchesQuery(e({}), '   ')).toBe(true)
  })
  it('is case-insensitive and AND-combines terms', () => {
    const entry = e({ title: 'Gallery Search Design', folder: 'specs', type: 'spec' })
    expect(matchesQuery(entry, 'gallery design')).toBe(true)
    expect(matchesQuery(entry, 'gallery missing')).toBe(false)
  })
  it('searches title, folder, type, and status', () => {
    const entry = e({ title: 'Foo', folder: 'tech-debt', type: 'debt', status: 'open' })
    expect(matchesQuery(entry, 'tech-debt')).toBe(true)
    expect(matchesQuery(entry, 'debt')).toBe(true)
    expect(matchesQuery(entry, 'open')).toBe(true)
  })
  it('tolerates null type/status', () => {
    expect(matchesQuery(e({ type: null, status: null }), 'untitled')).toBe(true)
  })
})

describe('filterEntries', () => {
  const entries: FilterableEntry[] = [
    e({ title: 'A', type: 'spec', freshness: 'fresh' }),
    e({ title: 'B', type: 'idea', freshness: 'stale' }),
    e({ title: 'C', type: 'spec', freshness: 'missing' }),
  ]
  const none = {
    q: '',
    types: new Set<string>(),
    freshness: new Set<string>(),
    illustrated: null as boolean | null,
  }

  it('no constraints returns all', () => {
    expect(filterEntries(entries, none)).toHaveLength(3)
  })
  it('type set is OR within the group', () => {
    const r = filterEntries(entries, { ...none, types: new Set(['spec']) })
    expect(r.map((x) => x.title)).toEqual(['A', 'C'])
  })
  it('freshness set is OR within the group', () => {
    const r = filterEntries(entries, { ...none, freshness: new Set(['stale', 'missing']) })
    expect(r.map((x) => x.title)).toEqual(['B', 'C'])
  })
  it('query AND type AND freshness across groups', () => {
    const r = filterEntries(entries, {
      q: 'c',
      types: new Set(['spec']),
      freshness: new Set(['missing']),
      illustrated: null,
    })
    expect(r.map((x) => x.title)).toEqual(['C'])
  })
  it('no match returns empty', () => {
    expect(filterEntries(entries, { ...none, q: 'zzz' })).toHaveLength(0)
  })
  it('illustrated filters only when set (reuses same mechanism)', () => {
    const mixed = [
      e({ title: 'V1', illustrated: true }),
      e({ title: 'V2', illustrated: true }),
      e({ title: 'N1', illustrated: false }),
    ]
    expect(filterEntries(mixed, { ...none, illustrated: true }).map((x) => x.title)).toEqual([
      'V1',
      'V2',
    ])
    expect(filterEntries(mixed, { ...none, illustrated: false }).map((x) => x.title)).toEqual([
      'N1',
    ])
    expect(filterEntries(mixed, { ...none, illustrated: null })).toHaveLength(3)
  })
})

describe('normalizeType', () => {
  it('folds the two spellings of tech-debt into one', () => {
    expect(normalizeType('debt')).toBe('tech-debt')
    expect(normalizeType('tech-debt')).toBe('tech-debt')
  })
  it('leaves every other type alone', () => {
    expect(normalizeType('spec')).toBe('spec')
    expect(normalizeType(null)).toBe(null)
  })
})

describe('availableTypes', () => {
  it('returns distinct non-null types in first-seen order', () => {
    const r = availableTypes([
      e({ type: 'spec' }),
      e({ type: 'idea' }),
      e({ type: 'spec' }),
      e({ type: null }),
    ])
    expect(r).toEqual(['spec', 'idea'])
  })
  it('yields one chip for the two tech-debt spellings', () => {
    const entries = [
      { title: 'a', folder: 'x', type: 'debt', status: null, freshness: null },
      { title: 'b', folder: 'x', type: 'tech-debt', status: null, freshness: null },
      { title: 'c', folder: 'x', type: 'spec', status: null, freshness: null },
    ]
    expect(availableTypes(entries)).toEqual(['tech-debt', 'spec'])
  })
})

describe('FRESHNESS_VALUES', () => {
  it('is the fixed triple', () => {
    expect(FRESHNESS_VALUES).toEqual(['fresh', 'stale', 'missing'])
  })
})
