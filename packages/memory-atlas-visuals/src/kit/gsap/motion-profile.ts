/**
 * gsap/motion-profile.ts — per-skin motion personalities (v2).
 *
 * Every GSAP primitive reads its tuning from here via `motionFor(skin)` (and the
 * `useMotion()` hook) — no primitive inlines a magic number — so motion CHARACTER
 * is config, not code. v2 gives each of the 5 skins a distinct personality:
 *
 *   blog       — breathes : slow masked LINE wipes, expo.out, blur-in, heavy glide
 *   brutalist  — snaps    : hard fast WORD pops, no blur/mask, tight stagger, light smooth
 *   frontier   — glides   : CHAR assemble, deep blur, long durations, heavy momentum
 *   magazine   — struts   : line wipes with a back-ease pop, rhythmic stagger
 *   blueprint  — drafts   : crisp measured line wipes, power2.inOut, zero blur
 *   tor        — types    : CHAR teletype decrypt, steps ease, zero blur/mask
 *
 * Reduced-motion never runs the animation fns, so personality is purely additive —
 * every skin degrades to the same static, fully-visible page.
 *
 * Profiles are module-level constants → stable references, safe to use directly as
 * useGSAP dependencies (a primitive re-runs its animation exactly when the skin
 * changes, never on an unrelated render).
 */

/**
 * LayoutMotion — per-skin reflow personality for framer-motion FLIP animations.
 *
 * Uses framer-motion shapes (NOT GSAP string eases).
 * `reflow` drives the card-position layout transition (the FLIP); it is a tween or
 * spring. `enter`/`exit` are the card's appear/disappear variants. `stagger` is the
 * per-card delay step (s).
 *
 * Rule: blur is a px value; gallery-motion.ts converts it to `filter: blur(Npx)`.
 */
export type LayoutEase = [number, number, number, number]

export type LayoutReflow =
  | { type: 'tween'; dur: number; ease: LayoutEase }
  | { type: 'spring'; stiffness: number; damping: number }

export interface LayoutVariantState {
  opacity?: number
  y?: number
  scale?: number
  /** px blur for filter: blur(Npx) — undefined / 0 → no filter */
  blur?: number
}

export interface LayoutMotion {
  /** Position reflow transition — tween (dur+ease) or spring (stiffness+damping). */
  reflow: LayoutReflow
  /** Initial (hidden) state for entering cards. */
  enter: LayoutVariantState
  /** Exit state for leaving cards. */
  exit: LayoutVariantState
  /** Per-card enter stagger delay step (s). */
  stagger: number
}

export interface MotionProfile {
  /** Default SplitText unit for headline reveals. 'lines' + mask = the premium wipe. */
  splitUnit: 'words' | 'chars' | 'lines'
  /** Wrap each split unit in an overflow-clip mask so it wipes up from behind an edge. */
  splitMask: boolean
  /** Enter-tween duration (s). */
  enterDur: number
  /** Enter-tween ease. */
  enterEase: string
  /** Enter-tween Y offset (px) for non-masked reveals. */
  enterY: number
  /** Masked reveals rise this % of their own height from behind the clip edge. */
  enterYPercent: number
  /** Blur-in amount (px); 0 disables. A filter, not a token — never animates colour. */
  enterBlur: number
  /** Stagger between split units / siblings (s). */
  stagger: number
  /** Stagger for the Hero entrance title lines (s). */
  heroStagger: number
  /** ScrollScene scrub smoothing (s). */
  scrub: number
  /** ScrollSmoother momentum (s); higher = heavier glide. reduced-motion = native. */
  smooth: number
  /** Counter count-up duration (s). */
  counterDur: number
  /** Framer-motion FLIP reflow personality (layout prop + AnimatePresence variants). */
  layout: LayoutMotion
}

/**
 * BASE = blog ("breathes") — the proven MVP profile (the house feel). Every other
 * skin is a partial override on top, so unset keys inherit this premium default.
 */
const BASE: MotionProfile = {
  splitUnit: 'lines',
  splitMask: true,
  enterDur: 0.9,
  enterEase: 'expo.out',
  enterY: 40,
  enterYPercent: 110,
  enterBlur: 8,
  stagger: 0.08,
  heroStagger: 0.14,
  scrub: 0.8,
  smooth: 1.2,
  counterDur: 1.4,
  // blog: breathes — ease-out tween, gentle 8px↑ enter, 6px↓ exit
  layout: {
    reflow: { type: 'tween', dur: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }, // ease-out
    enter: { opacity: 0, y: 8 },
    exit: { opacity: 0, y: -6 },
    stagger: 0.02,
  },
}

const profile = (over: Partial<MotionProfile>): MotionProfile => ({ ...BASE, ...over })

/** Per-skin personalities. Keys are the `data-theme` skin ids (see theme/skins.ts). */
export const PROFILES: Record<string, MotionProfile> = {
  // breathes — calm, personal blog voice; the default/house feel.
  blog: BASE,

  // snaps — raw, high-contrast: words pop in hard and fast, no soft wipe or haze,
  // near-simultaneous stagger, barely-there momentum.
  brutalist: profile({
    splitUnit: 'words',
    splitMask: false,
    enterDur: 0.3,
    enterEase: 'power4.out',
    enterY: 28,
    enterBlur: 0,
    stagger: 0.025,
    heroStagger: 0.04,
    scrub: 0.2,
    smooth: 0.5,
    counterDur: 0.7,
    // brutalist: snaps — hard linear tween, no offset, simultaneous
    layout: {
      reflow: { type: 'tween', dur: 0.16, ease: [0.4, 0.0, 0.6, 1.0] }, // near-linear hard
      enter: { opacity: 0 },
      exit: { opacity: 0 },
      stagger: 0,
    },
  }),

  // struts — serif magazine cadence: line wipes with a touch of overshoot pop and
  // a deliberate, rhythmic stagger between lines.
  magazine: profile({
    enterDur: 0.7,
    enterEase: 'back.out(1.3)',
    enterYPercent: 120,
    enterBlur: 4,
    stagger: 0.12,
    heroStagger: 0.18,
    scrub: 0.6,
    smooth: 1.0,
    counterDur: 1.2,
    // magazine: struts — back-overshoot tween, 10px↑ enter, scale .98 exit
    layout: {
      reflow: { type: 'tween', dur: 0.42, ease: [0.34, 1.56, 0.64, 1.0] }, // back-overshoot
      enter: { opacity: 0, y: 10 },
      exit: { opacity: 0, scale: 0.98 },
      stagger: 0.04,
    },
  }),

  // glides — dark, neon, glow: characters assemble out of a deep holographic blur,
  // long durations, heaviest momentum scroll.
  frontier: profile({
    splitUnit: 'chars',
    enterDur: 1.15,
    enterEase: 'power2.out',
    enterYPercent: 80,
    enterBlur: 12,
    stagger: 0.035,
    heroStagger: 0.03,
    scrub: 1.3,
    smooth: 2.0,
    counterDur: 2.0,
    // frontier: glides — soft spring, scale + blur enter/exit
    layout: {
      reflow: { type: 'spring', stiffness: 120, damping: 20 },
      enter: { opacity: 0, scale: 0.92, blur: 6 },
      exit: { opacity: 0, scale: 0.94, blur: 4 },
      stagger: 0.045,
    },
  }),

  // drafts — navy schematic precision: crisp measured line wipes, symmetric ease,
  // zero blur (drafting is sharp), tight light momentum.
  blueprint: profile({
    enterDur: 0.6,
    enterEase: 'power2.inOut',
    enterY: 32,
    enterYPercent: 100,
    enterBlur: 0,
    stagger: 0.06,
    heroStagger: 0.1,
    scrub: 0.5,
    smooth: 0.9,
    counterDur: 1.0,
    // blueprint: drafts — symmetric ease-in-out tween, 6px↑ enter, 6px↓ exit, no blur
    layout: {
      reflow: { type: 'tween', dur: 0.3, ease: [0.42, 0.0, 0.58, 1.0] }, // ease-in-out
      enter: { opacity: 0, y: 6 },
      exit: { opacity: 0, y: -6 },
      stagger: 0.03,
    },
  }),

  // types — leaked-dossier decrypt: characters clack in like a teletype, zero blur
  // (paper is sharp), even mechanical stagger, light momentum. The stepped ease reads
  // as a typewriter. Reduced-motion never runs the fn → same static page as every skin.
  tor: profile({
    splitUnit: 'chars',
    splitMask: false,
    enterDur: 0.4,
    enterEase: 'steps(8)',
    enterY: 0,
    enterBlur: 0,
    stagger: 0.018,
    heroStagger: 0.02,
    scrub: 0.4,
    smooth: 0.7,
    counterDur: 0.9,
  }),
}

/** Default (skin-agnostic / pre-hydration) profile === blog (the house feel). */
export const MOTION: MotionProfile = BASE

/** Resolve a skin's profile; unknown / undefined → BASE (blog). Stable ref per skin. */
export function motionFor(skin?: string): MotionProfile {
  return (skin && PROFILES[skin]) || BASE
}
