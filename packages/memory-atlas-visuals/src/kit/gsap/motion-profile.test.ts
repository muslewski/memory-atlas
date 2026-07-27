import { describe, expect, it } from 'vitest'
import { MOTION, type MotionProfile, motionFor, PROFILES } from './motion-profile'

const KEYS: (keyof MotionProfile)[] = [
  'splitUnit',
  'splitMask',
  'enterDur',
  'enterEase',
  'enterY',
  'enterYPercent',
  'enterBlur',
  'stagger',
  'heroStagger',
  'scrub',
  'smooth',
  'counterDur',
  'layout',
]

describe('motion-profile', () => {
  it('MOTION exposes the premium (blog) tuning fields', () => {
    expect(MOTION.splitUnit).toBe('lines')
    expect(MOTION.enterDur).toBeGreaterThan(0)
    expect(MOTION.counterDur).toBeGreaterThan(0)
  })

  it('every skin profile is complete (no missing/NaN keys) with positive durations', () => {
    for (const [skin, p] of Object.entries(PROFILES)) {
      for (const k of KEYS) expect(p[k], `${skin}.${k}`).toBeDefined()
      expect(p.enterDur, skin).toBeGreaterThan(0)
      expect(p.counterDur, skin).toBeGreaterThan(0)
      expect(p.smooth, skin).toBeGreaterThan(0)
    }
  })

  it('motionFor falls back to BASE (blog) for unknown/undefined skins', () => {
    expect(motionFor()).toBe(MOTION)
    expect(motionFor('nope')).toBe(MOTION)
    expect(motionFor('blog')).toBe(MOTION)
  })

  it('each skin resolves to its own stable profile reference', () => {
    expect(motionFor('brutalist')).toBe(PROFILES.brutalist)
    expect(motionFor('frontier')).toBe(PROFILES.frontier)
    // distinct personalities — not all the same object
    const refs = new Set(
      ['blog', 'brutalist', 'magazine', 'frontier', 'blueprint'].map((s) => motionFor(s)),
    )
    expect(refs.size).toBe(5)
  })

  describe('personalities are distinct', () => {
    it('brutalist snaps: hard, fast, no blur, words, light momentum', () => {
      const b = PROFILES.brutalist
      expect(b.splitUnit).toBe('words')
      expect(b.splitMask).toBe(false)
      expect(b.enterBlur).toBe(0)
      expect(b.enterDur).toBeLessThan(MOTION.enterDur) // faster than editorial
      expect(b.smooth).toBeLessThan(MOTION.smooth) // barely glides
      expect(b.stagger).toBeLessThan(MOTION.stagger) // near-simultaneous
    })

    it('frontier glides: chars, deepest blur, heaviest momentum, long count', () => {
      const f = PROFILES.frontier
      expect(f.splitUnit).toBe('chars')
      expect(f.enterBlur).toBeGreaterThan(MOTION.enterBlur)
      expect(f.smooth).toBeGreaterThan(MOTION.smooth)
      expect(f.counterDur).toBeGreaterThan(MOTION.counterDur)
    })

    it('magazine struts: overshoot ease, rhythmic (largest) stagger', () => {
      const m = PROFILES.magazine
      expect(m.enterEase).toContain('back')
      expect(m.heroStagger).toBeGreaterThanOrEqual(MOTION.heroStagger)
    })

    it('blueprint drafts: crisp (no blur), measured symmetric ease', () => {
      const d = PROFILES.blueprint
      expect(d.enterBlur).toBe(0)
      expect(d.enterEase).toContain('inOut')
    })
  })

  describe('layout block (Task 1)', () => {
    it('every skin profile has a complete layout block', () => {
      const skins = ['blog', 'brutalist', 'magazine', 'frontier', 'blueprint']
      for (const skin of skins) {
        const p = skin === 'blog' ? MOTION : PROFILES[skin]
        expect(p.layout, `${skin}.layout`).toBeDefined()
        expect(p.layout.reflow, `${skin}.layout.reflow`).toBeDefined()
        expect(p.layout.enter, `${skin}.layout.enter`).toBeDefined()
        expect(p.layout.exit, `${skin}.layout.exit`).toBeDefined()
        expect(typeof p.layout.stagger, `${skin}.layout.stagger`).toBe('number')
      }
    })

    it('reflow type matches spec per skin (tween vs spring)', () => {
      expect(MOTION.layout.reflow.type).toBe('tween') // blog
      expect(PROFILES.brutalist.layout.reflow.type).toBe('tween')
      expect(PROFILES.magazine.layout.reflow.type).toBe('tween')
      expect(PROFILES.frontier.layout.reflow.type).toBe('spring')
      expect(PROFILES.blueprint.layout.reflow.type).toBe('tween')
    })

    it('brutalist layout.stagger is 0 (near-simultaneous)', () => {
      expect(PROFILES.brutalist.layout.stagger).toBe(0)
    })

    it('frontier layout reflow is spring with stiffness + damping', () => {
      const r = PROFILES.frontier.layout.reflow
      expect(r.type).toBe('spring')
      if (r.type === 'spring') {
        expect(r.stiffness).toBeGreaterThan(0)
        expect(r.damping).toBeGreaterThan(0)
      }
    })

    it('magazine tween ease overshoots (back-ease control point)', () => {
      const r = PROFILES.magazine.layout.reflow
      expect(r.type).toBe('tween')
      if (r.type === 'tween') {
        // A cubic-bezier back-overshoot has at least one control point outside [0,1]
        const [, y1, , y2] = r.ease
        expect(Math.max(y1, y2)).toBeGreaterThan(1)
      }
    })

    it('duration ordering: brutalist < blog < magazine', () => {
      const brut = PROFILES.brutalist.layout.reflow
      const blog = MOTION.layout.reflow
      const mag = PROFILES.magazine.layout.reflow
      if (brut.type === 'tween' && blog.type === 'tween' && mag.type === 'tween') {
        expect(brut.dur).toBeLessThan(blog.dur)
        expect(blog.dur).toBeLessThan(mag.dur)
      }
    })

    it('frontier enter has scale < 1', () => {
      const enter = PROFILES.frontier.layout.enter
      expect(enter.scale).toBeDefined()
      // biome-ignore lint/style/noNonNullAssertion: guaranteed by preceding expect().toBeTruthy()
      expect(enter.scale!).toBeLessThan(1)
    })

    it('frontier enter has blur set', () => {
      const enter = PROFILES.frontier.layout.enter
      expect(enter.blur).toBeDefined()
      // biome-ignore lint/style/noNonNullAssertion: guaranteed by preceding expect().toBeTruthy()
      expect(enter.blur!).toBeGreaterThan(0)
    })
  })
})
