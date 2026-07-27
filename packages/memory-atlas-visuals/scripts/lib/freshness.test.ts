import { describe, expect, it } from 'vitest'
import { computeFreshness, hash12 } from './freshness'

describe('hash12', () => {
  it('is stable + 12 hex chars', () => {
    expect(hash12('abc')).toBe(hash12('abc'))
    expect(hash12('abc')).toMatch(/^[0-9a-f]{12}$/)
  })
})

describe('computeFreshness', () => {
  it('missing when bytes are null', () => {
    expect(computeFreshness('deadbeef', null)).toBe('missing')
  })
  it('fresh when hash matches', () => {
    expect(computeFreshness(hash12('x'), 'x')).toBe('fresh')
  })
  it('stale when hash differs', () => {
    expect(computeFreshness('0000', 'x')).toBe('stale')
  })
  it('missing (not stale) when storedHash is empty', () => {
    expect(computeFreshness('', 'x')).toBe('missing')
  })
})
