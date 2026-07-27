/**
 * ReadingProgress — fixed top bar; width tracks page scroll progress.
 *
 * Strategy:
 *   1. CSS-native: `animation-timeline: scroll(root)` where supported.
 *      The bar grows from 0 → 100% via a @keyframes scaleX animation.
 *   2. JS fallback: a `scroll` event listener sets a CSS custom property
 *      `--_progress` on the bar element for browsers without scroll-driven
 *      animations.
 * Reduced-motion: animation is suppressed entirely via the CSS media query;
 * the JS path also honours it by skipping the rAF update when the media
 * query matches.
 */

'use client'

import { useEffect, useRef } from 'react'

export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    // Check if the browser supports scroll-driven animations.
    // If it does, the CSS `animation-timeline` path handles everything;
    // no JS listener needed.
    const supportsScrollTimeline =
      'animationTimeline' in document.documentElement.style ||
      CSS.supports('animation-timeline', 'scroll()')

    if (supportsScrollTimeline) return

    // Reduced-motion guard for the JS path.
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    function updateProgress() {
      if (reducedMotion.matches) return
      const scrolled = window.scrollY
      const total = document.documentElement.scrollHeight - window.innerHeight
      const pct = total > 0 ? Math.min(scrolled / total, 1) : 0
      // biome-ignore lint/style/noNonNullAssertion: bar is guaranteed non-null — the enclosing useEffect returns early at line 24 if barRef.current is null
      bar!.style.setProperty('--_progress', String(pct))
    }

    window.addEventListener('scroll', updateProgress, { passive: true })
    updateProgress()

    return () => {
      window.removeEventListener('scroll', updateProgress)
    }
  }, [])

  return <div ref={barRef} className="skin-reading-progress" aria-hidden="true" />
}
