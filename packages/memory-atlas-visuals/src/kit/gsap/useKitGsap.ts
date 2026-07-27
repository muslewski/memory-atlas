/**
 * gsap/useKitGsap.ts — the ONE safe entry point for all kit GSAP.
 *
 * Wraps @gsap/react's useGSAP (auto-cleanup on unmount AND SPA route change —
 * kills tweens/ScrollTriggers, reverts SplitText) and gsap.matchMedia() so the
 * animation fn ONLY runs under (prefers-reduced-motion: no-preference). Under
 * reduced-motion the fn never runs, so elements stay in their natural visible
 * state — therefore primitives must set their hidden START state INSIDE `fn`
 * (gsap.from / gsap.set), NEVER in CSS. No GSAP usage exists outside this hook,
 * which makes "forgot the reduced-motion guard" / "leaked a ScrollTrigger across
 * a route change" structurally impossible.
 */

import { useGSAP } from '@gsap/react'
import { type RefObject, useRef } from 'react'
import { visuals } from '../../config'
import { gsap, registerGsap } from './setup'

registerGsap()

type KitCtx = { gsap: typeof gsap; scope: HTMLElement }
// biome-ignore lint/suspicious/noConfusingVoidType: union with void is intentional callback signature
type KitFn = (ctx: KitCtx) => void | (() => void)

export function useKitGsap<T extends HTMLElement = HTMLDivElement>(
  fn: KitFn,
  deps: unknown[] = [],
): RefObject<T | null> {
  const scope = useRef<T>(null)
  useGSAP(
    () => {
      const el = scope.current
      if (!el) return
      if (!visuals.motion.gsap) return // lightweight mode: no GSAP → static visible
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => fn({ gsap, scope: el }))
      // useGSAP's context reverts the matchMedia (+ any SplitText/ScrollTrigger
      // created inside fn) on unmount / route change. No manual cleanup needed.
    },
    { scope, dependencies: deps },
  )
  return scope
}
