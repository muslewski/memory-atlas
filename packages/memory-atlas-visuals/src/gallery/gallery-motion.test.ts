import { describe, expect, it } from 'vitest'
import { MOTION, PROFILES } from '../kit/gsap/motion-profile'
import { cardVariants, type GalleryTransition, layoutTransition } from './gallery-motion'

// ── layoutTransition ─────────────────────────────────────────────────────────

describe('layoutTransition', () => {
  it('tween skin produces duration + ease in result', () => {
    const t = layoutTransition(MOTION, false) // blog = tween
    expect('type' in t && t.type).toBe('tween')
    if ('duration' in t) {
      expect(typeof t.duration).toBe('number')
      expect('ease' in t && t.ease).toBeDefined()
    }
  })

  it('spring skin produces type:spring + stiffness + damping', () => {
    const t = layoutTransition(PROFILES.frontier, false)
    expect('type' in t && t.type).toBe('spring')
    if ('stiffness' in t) {
      expect(t.stiffness).toBeGreaterThan(0)
      expect(t.damping).toBeGreaterThan(0)
    }
  })

  it('reduced=true collapses both tween and spring to duration:0', () => {
    const tweenReduced = layoutTransition(MOTION, true) as { duration: number }
    expect(tweenReduced.duration).toBe(0)

    const springReduced = layoutTransition(PROFILES.frontier, true) as { duration: number }
    expect(springReduced.duration).toBe(0)
  })

  it('magazine transition has the back-overshoot ease array', () => {
    const t = layoutTransition(PROFILES.magazine, false)
    if ('ease' in t) {
      const ease = t.ease
      expect(Array.isArray(ease)).toBe(true)
      // back-overshoot: at least one y control point > 1
      const [, y1, , y2] = ease
      expect(Math.max(y1, y2)).toBeGreaterThan(1)
    }
  })

  it('blueprint has shorter duration than magazine', () => {
    const bp = layoutTransition(PROFILES.blueprint, false) as GalleryTransition
    const mag = layoutTransition(PROFILES.magazine, false) as GalleryTransition
    if ('duration' in bp && 'duration' in mag) {
      expect(bp.duration).toBeLessThan(mag.duration)
    }
  })
})

// ── cardVariants ─────────────────────────────────────────────────────────────

describe('cardVariants', () => {
  it('returns initial, animate, exit keys', () => {
    const v = cardVariants(MOTION, false)
    expect(v.initial).toBeDefined()
    expect(v.animate).toBeDefined()
    expect(v.exit).toBeDefined()
  })

  it('animate state has opacity: 1 (resting)', () => {
    const v = cardVariants(MOTION, false)
    expect(v.animate.opacity).toBe(1)
  })

  it('blog initial carries y offset from layout.enter', () => {
    const v = cardVariants(MOTION, false)
    expect(v.initial.opacity).toBe(0)
    expect(typeof v.initial.y).toBe('number')
    expect(v.initial.y).not.toBe(0)
  })

  it('blog exit carries y offset from layout.exit', () => {
    const v = cardVariants(MOTION, false)
    expect(v.exit.opacity).toBe(0)
    expect(typeof v.exit.y).toBe('number')
  })

  it('frontier initial carries scale < 1', () => {
    const v = cardVariants(PROFILES.frontier, false)
    expect(v.initial.scale).toBeLessThan(1)
  })

  it('frontier initial carries filter: blur(Npx)', () => {
    const v = cardVariants(PROFILES.frontier, false)
    expect(typeof v.initial.filter).toBe('string')
    expect(v.initial.filter as string).toMatch(/blur\(\d+(\.\d+)?px\)/)
  })

  it('magazine exit carries scale (not y)', () => {
    const v = cardVariants(PROFILES.magazine, false)
    expect(v.exit.scale).toBeDefined()
  })

  it('brutalist initial: opacity 0, no y, no scale, no filter', () => {
    const v = cardVariants(PROFILES.brutalist, false)
    expect(v.initial.opacity).toBe(0)
    expect(v.initial.y).toBeUndefined()
    expect(v.initial.scale).toBeUndefined()
    expect(v.initial.filter).toBeUndefined()
  })

  // reduced-motion collapse
  it('reduced=true: initial has no y / scale / filter (opacity only)', () => {
    const v = cardVariants(MOTION, true)
    expect(v.initial.y).toBeUndefined()
    expect(v.initial.scale).toBeUndefined()
    expect(v.initial.filter).toBeUndefined()
  })

  it('reduced=true: exit has no y / scale / filter (opacity only)', () => {
    const v = cardVariants(MOTION, true)
    expect(v.exit.y).toBeUndefined()
    expect(v.exit.scale).toBeUndefined()
    expect(v.exit.filter).toBeUndefined()
  })

  it('reduced=true frontier: initial has no scale, no filter', () => {
    const v = cardVariants(PROFILES.frontier, true)
    expect(v.initial.scale).toBeUndefined()
    expect(v.initial.filter).toBeUndefined()
  })
})
