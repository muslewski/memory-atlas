import { describe, expect, it } from 'vitest'
import { availableModuleKeys, missingModuleHint, routeToModuleKey } from './mdx'

// These run under Vite (vitest), so import.meta.glob resolves exactly as it
// does in the dev server and the production build. A wrong glob base => empty map.
describe('mdx glob loader', () => {
  it('discovers the sibling .mdx digests (glob base must resolve above app/)', () => {
    expect(availableModuleKeys().length).toBeGreaterThan(0)
  })

  it('routeToModuleKey reproduces a real default-tree key (lookup parity)', () => {
    const keys = availableModuleKeys()
    // The default tree is the base/fallback; every route resolves a default key.
    const sample = keys.find((k) => k.includes('/illustrated/default/'))
    expect(sample, 'a illustrated/default/ key must exist').toBeTruthy()
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by preceding expect().toBeTruthy()
    const m = sample!.match(/illustrated\/default\/([^/]+)\/([^/]+)\.mdx$/)
    expect(m).toBeTruthy()
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by preceding expect().toBeTruthy()
    const [, folder, slug] = m!
    // The key the loader builds for a route MUST equal an actual glob key,
    // otherwise modules[key] is undefined and the note 404s at runtime.
    expect(routeToModuleKey(folder, slug)).toBe(sample)
  })

  it('routeToModuleKey: default tree when no skin, illustrated/<skin>/ when given one', () => {
    expect(routeToModuleKey('ideas', 'x')).toBe('../../../illustrated/default/ideas/x.mdx')
    expect(routeToModuleKey('ideas', 'x', 'magazine')).toBe(
      '../../../illustrated/magazine/ideas/x.mdx',
    )
  })
})

describe('missingModuleHint', () => {
  // Reaching this message means the route IS in the manifest (IllustratedView found the
  // entry) but the .mdx is absent from the boot-time import.meta.glob snapshot —
  // i.e. a digest added after the dev server started. The hint must name the route
  // and tell the reader to restart, not just say "not found".
  it('names the route and tells the user to restart the dev server', () => {
    const msg = missingModuleHint('ideas', '2026-06-24-channel-mind-previewable-brain')
    expect(msg).toContain('/ideas/2026-06-24-channel-mind-previewable-brain')
    expect(msg.toLowerCase()).toContain('restart')
  })

  it('explains WHY (added since boot / outside app/), not just WHAT', () => {
    const msg = missingModuleHint('tech-debt', 'x').toLowerCase()
    expect(msg).toMatch(/manifest|added|boot|outside app/)
  })
})
