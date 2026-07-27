/**
 * gsap/useMotion.ts — resolve the active skin's motion personality (v2).
 *
 * Reads the live skin from next-themes (`data-theme`) and returns its MotionProfile.
 * The returned object is a module-level constant (one per skin), so it's referentially
 * stable across renders and safe to pass straight into a useGSAP dependency array — a
 * primitive re-runs its animation exactly when the skin changes, never otherwise.
 *
 * Pre-hydration `theme` is undefined → motionFor falls back to BASE (blog), the
 * same reference the blog skin resolves to, so there's no first-paint re-run.
 */
import { useTheme } from 'next-themes'
import { type MotionProfile, motionFor } from './motion-profile'

export function useMotion(): MotionProfile {
  const { theme } = useTheme()
  return motionFor(theme)
}
