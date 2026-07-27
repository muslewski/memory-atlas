import { describe, expect, it } from 'vitest'
import visuals from '../../visuals.config'
import { defineVisuals } from './defineVisuals'

describe('defineVisuals', () => {
  it('returns full defaults for empty input', () => {
    const c = defineVisuals()
    expect(c.skins.length).toBe(6) // all defined skins (blog/brutalist/magazine/frontier/blueprint/tor)
    expect(c.defaultSkin).toBe('blog')
    expect(c.motion).toEqual({ gsap: true, framer: true, smooth: true })
    expect(c.content.mode).toBe('single')
    expect(c.content.shareDiagram).toBe(true)
    expect(c.features).toEqual({ hero: true, diagram: true })
    expect(c.prompts.base).toMatch(/digest/i)
    expect(c.prompts.perSkin.brutalist?.voice).toMatch(/meat/i)
    expect(c.prompts.perSkin.blog?.voice).toMatch(/first person/i)
    expect(c.prompts.perSkin.frontier?.voice).toMatch(/edge/i)
  })

  it('merges nested objects shallowly without dropping siblings', () => {
    const c = defineVisuals({ motion: { gsap: false }, content: { mode: 'many' } })
    expect(c.motion).toEqual({ gsap: false, framer: true, smooth: true })
    expect(c.content.mode).toBe('many')
  })

  it('passes motion.smooth through (number = fixed momentum, false = off)', () => {
    expect(defineVisuals({ motion: { smooth: 0.8 } }).motion).toEqual({
      gsap: true,
      framer: true,
      smooth: 0.8,
    })
    expect(defineVisuals({ motion: { smooth: false } }).motion.smooth).toBe(false)
  })

  it('falls back defaultSkin to skins[0] when the requested default is disabled', () => {
    const c = defineVisuals({ skins: ['brutalist', 'frontier'] })
    expect(c.defaultSkin).toBe('brutalist')
  })

  it('keeps an explicit defaultSkin that is in the enabled set', () => {
    const c = defineVisuals({ skins: ['blog', 'frontier'], defaultSkin: 'frontier' })
    expect(c.defaultSkin).toBe('frontier')
  })

  it('exposes each default voice on .voice with empty favour/avoid', () => {
    const v = defineVisuals()
    expect(v.prompts.perSkin.blog?.voice).toMatch(/personal blog/i)
    expect(v.prompts.perSkin.blog?.favour).toEqual([])
    expect(v.prompts.perSkin.blog?.avoid).toEqual([])
  })

  it('deep-merges a partial descriptor field-by-field (favour overridden, voice + avoid kept)', () => {
    const c = defineVisuals({ prompts: { perSkin: { brutalist: { favour: ['Callout'] } } } })
    // favour overridden by input…
    expect(c.prompts.perSkin.brutalist?.favour).toEqual(['Callout'])
    // …but voice + avoid fall back to the default descriptor
    expect(c.prompts.perSkin.brutalist?.voice).toMatch(/meat/i)
    expect(c.prompts.perSkin.brutalist?.avoid).toEqual([])
    // a sibling skin with no override keeps its default descriptor
    expect(c.prompts.perSkin.magazine?.voice).toMatch(/magazine/i)
  })

  it('overriding only voice keeps it as a full descriptor', () => {
    const c = defineVisuals({ prompts: { perSkin: { brutalist: { voice: 'custom' } } } })
    expect(c.prompts.perSkin.brutalist?.voice).toBe('custom')
    expect(c.prompts.perSkin.brutalist?.favour).toEqual([])
  })
})

describe('active-skin allowlist (visuals.config)', () => {
  it('enables blog + tor + brutalist, default blog', () => {
    expect(visuals.skins).toEqual(['blog', 'tor', 'brutalist'])
    expect(visuals.defaultSkin).toBe('blog')
  })

  it('ships a tor descriptor with voice + favour/avoid bias', () => {
    expect(visuals.prompts.perSkin.tor?.voice).toMatch(/dossier|redact|classif/i)
    expect(visuals.prompts.perSkin.tor?.favour.length).toBeGreaterThan(0)
    expect(visuals.prompts.perSkin.tor?.avoid.length).toBeGreaterThan(0)
  })
})
