/**
 * gsap/scroll-smoother.ts — momentum smooth-scroll for the whole gallery.
 *
 * Mount once in the app shell (inside the router). Creates ScrollSmoother over
 * #smooth-wrapper / #smooth-content, gated by matchMedia so reduced-motion gets
 * plain native scroll (the wrapper/content stay untouched divs — ScrollSmoother
 * only styles them when it's created). `effects: true` powers data-speed/data-lag
 * depth parallax. On SPA route change we jump to top + refresh triggers.
 */

import { useGSAP } from '@gsap/react'
import { useTheme } from 'next-themes'
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { visuals } from '../../config'
import { MOTION, motionFor } from './motion-profile'
import { gsap, registerGsap, ScrollSmoother, ScrollTrigger } from './setup'

export function useScrollSmootherLifecycle(): void {
  const { pathname } = useLocation()
  const { theme } = useTheme()

  useGSAP(() => {
    if (!visuals.motion.gsap) return // lightweight mode: native scroll, no smoother
    if (visuals.motion.smooth === false) return // smooth off: native scroll, reveals still run
    registerGsap()
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const smoother = ScrollSmoother.create({
        wrapper: '#smooth-wrapper',
        content: '#smooth-content',
        // A config number fixes the momentum (overrides per-skin); true → base value.
        smooth: typeof visuals.motion.smooth === 'number' ? visuals.motion.smooth : MOTION.smooth,
        // effects OFF: nothing uses data-speed/data-lag anymore (hero parallax was
        // removed as glitchy). `true` would run a per-frame effects ticker for zero
        // elements — pure overhead on every scroll frame.
        effects: false,
        // Don't let opening UI chrome hijack the scroll position. ScrollSmoother's
        // focusin handler scrolls any newly-focused element to center; when a Radix
        // menu/popover opens it focuses its content (portaled to body, outside the
        // smooth content), which jumped the page toward the top. Return false to skip
        // the auto-scroll for focus inside the nav / portaled poppers / the TOC layer;
        // real in-content focus (undefined) still scrolls into view as before.
        onFocusIn: (_self, e) => {
          const t = e.target as HTMLElement | null
          if (t?.closest?.('nav, #toc-layer, [data-radix-popper-content-wrapper], [role="menu"]')) {
            return false
          }
        },
        // normalizeScroll intentionally OFF: it intercepts wheel/touch (incl. trackpad
        // pinch = ctrl+wheel) over #smooth-content, stealing the gesture from the inline
        // Excalidraw embed. Without it, pinch/zoom reaches the diagram and smooth scroll
        // still works. (The fullscreen modal is portaled outside #smooth-content anyway.)
      })
      return () => smoother.kill()
    })
  }, [])

  // Per-skin momentum (v2): brutalist barely glides, frontier glides heavily. The
  // instance .smooth() setter updates the live value with NO recreate (no scroll jump).
  // On a REAL skin switch we also return to the top with a soft crossfade — each skin
  // re-voices the content so heights differ; staying mid-page reads as a jump. We
  // guard against next-themes' initial undefined→default resolve (NOT a user switch)
  // by acting only on a transition between two known, different skins.
  const prevTheme = useRef<string | undefined>(undefined)
  useEffect(() => {
    const s = ScrollSmoother.get()
    // Per-skin momentum only when smooth is left to `true`; a config number is fixed.
    if (theme && typeof visuals.motion.smooth !== 'number') s?.smooth(motionFor(theme).smooth)
    const prev = prevTheme.current
    prevTheme.current = theme
    if (!prev || !theme || prev === theme) return // initial resolve / no real change

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      if (s) s.scrollTo(0, false)
      else window.scrollTo(0, 0)
      return
    }
    const content = document.getElementById('smooth-content')
    content?.classList.add('is-skin-switching')
    if (s) s.scrollTo(0, true)
    else window.scrollTo({ top: 0, behavior: 'smooth' })
    const id = window.setTimeout(() => content?.classList.remove('is-skin-switching'), 460)
    return () => window.clearTimeout(id)
  }, [theme])

  // SPA route change: top of the new page + recompute trigger positions.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ScrollSmoother and ScrollTrigger are module-level GSAP singletons, not reactive state
  useEffect(() => {
    const s = ScrollSmoother.get()
    if (s) s.scrollTo(0, false)
    else window.scrollTo(0, 0)
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 200)
    return () => window.clearTimeout(id)
  }, [pathname])
}
