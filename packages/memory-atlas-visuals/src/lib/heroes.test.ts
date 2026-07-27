import { describe, expect, it } from 'vitest'
import { resolveHero } from './heroes'

// Runs under Vite (vitest), so the asset glob resolves real files in
// syndcast-mind/visuals/files/. 2890762.jpg is the mcp-hardening-program hero.
describe('resolveHero', () => {
  it('resolves a real stock hero path to a bundled URL', () => {
    const url = resolveHero('files/stocks/2890762.jpg')
    expect(typeof url).toBe('string')
    expect(url).toBeTruthy()
  })

  it('tolerates a leading slash', () => {
    expect(resolveHero('/files/stocks/2890762.jpg')).toBeTruthy()
  })

  it('returns null for empty or unknown paths', () => {
    expect(resolveHero(undefined)).toBeNull()
    expect(resolveHero('')).toBeNull()
    expect(resolveHero('files/stocks/does-not-exist.jpg')).toBeNull()
  })
})
