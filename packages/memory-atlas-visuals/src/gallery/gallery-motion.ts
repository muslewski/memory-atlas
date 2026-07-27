/**
 * gallery-motion.ts — pure framer-motion translator for gallery card reflow.
 *
 * Converts a MotionProfile's `layout` block into framer-motion props:
 *   - layoutTransition() → Transition for the `layout` prop (FLIP position tween/spring)
 *   - cardVariants()     → { initial, animate, exit } variant objects for entering/exiting cards
 *
 * Pure module — no React, no framer-motion runtime. Imports framer-motion TYPES only.
 * Reduced-motion rule lives here so Gallery.tsx stays declarative: pass `reduced=true`
 * and both functions collapse to instant (duration: 0, no offset/scale/filter).
 */

import type { LayoutVariantState, MotionProfile } from '../kit/gsap/motion-profile'

/** framer-motion Transition shape (simplified for our use — no full import needed) */
export type GalleryTransition =
  | { type: 'tween'; duration: number; ease: number[] }
  | { type: 'spring'; stiffness: number; damping: number }
  | { duration: 0 }

/** framer-motion variant target (simplified; compatible with TargetAndTransition) */
export interface GalleryVariantState {
  opacity: number
  y?: number
  scale?: number
  filter?: string
}

/**
 * Translate a skin's layout.reflow config into a framer-motion-compatible Transition.
 * reduced=true ⇒ { duration: 0 } (instant).
 */
export function layoutTransition(profile: MotionProfile, reduced: boolean): GalleryTransition {
  if (reduced) return { duration: 0 }

  const { reflow } = profile.layout
  if (reflow.type === 'spring') {
    return {
      type: 'spring',
      stiffness: reflow.stiffness,
      damping: reflow.damping,
    }
  }
  // tween
  return {
    type: 'tween',
    duration: reflow.dur,
    ease: Array.from(reflow.ease),
  }
}

/**
 * Build a variant state object from a LayoutVariantState.
 * blur (px) → `filter: 'blur(Npx)'`. When reduced=true, only opacity is kept.
 */
function buildState(state: LayoutVariantState, reduced: boolean): GalleryVariantState {
  if (reduced) {
    return { opacity: state.opacity ?? 0 }
  }
  const out: GalleryVariantState = { opacity: state.opacity ?? 0 }
  if (state.y !== undefined) out.y = state.y
  if (state.scale !== undefined) out.scale = state.scale
  if (state.blur) out.filter = `blur(${state.blur}px)`
  return out
}

export interface GalleryVariants {
  initial: GalleryVariantState
  animate: GalleryVariantState
  exit: GalleryVariantState
}

/**
 * Build framer-motion { initial, animate, exit } variants for a gallery card.
 * reduced=true ⇒ all three collapse to instant opacity-only, no y/scale/filter.
 */
export function cardVariants(profile: MotionProfile, reduced: boolean): GalleryVariants {
  const { enter, exit } = profile.layout

  const initial = buildState(enter, reduced)
  const exitState = buildState(exit, reduced)

  // Resting state — always opacity:1, y:0, scale:1, no filter
  const animate: GalleryVariantState = { opacity: 1 }
  if (!reduced) {
    // Explicitly reset transforms so framer interpolates from initial
    if (enter.y !== undefined || exit.y !== undefined) animate.y = 0
    if (enter.scale !== undefined || exit.scale !== undefined) animate.scale = 1
    if (enter.blur || exit.blur) animate.filter = 'blur(0px)'
  }

  return { initial, animate, exit: exitState }
}
