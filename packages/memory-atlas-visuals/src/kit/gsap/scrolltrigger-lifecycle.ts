/**
 * gsap/scrolltrigger-lifecycle.ts — keep ScrollTrigger positions correct.
 *
 * Mount once in the app shell. Refreshes ScrollTrigger after fonts load (per-skin
 * fonts shift layout), after window load (hero images), and on skin change
 * (data-theme changes heights). Per-primitive ScrollTriggers are owned by their
 * component's useGSAP scope and die with it — this only handles global refresh.
 */

import { useTheme } from 'next-themes'
import { useEffect } from 'react'
import { visuals } from '../../config'
import { registerGsap, ScrollTrigger } from './setup'

export function useScrollTriggerLifecycle(): void {
  const { theme } = useTheme()

  useEffect(() => {
    if (!visuals.motion.gsap) return
    registerGsap()
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    const onLoad = () => ScrollTrigger.refresh()
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: ScrollTrigger is a module-level GSAP singleton, not reactive state
  useEffect(() => {
    if (!visuals.motion.gsap) return
    // Skin switch → layout/height shift → refresh after the next paint.
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [theme])
}
