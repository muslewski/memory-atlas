/**
 * gsap/setup.ts — register GSAP + plugins exactly once.
 *
 * All GSAP plugins are free (3.13+, post-Webflow): import from the public `gsap`
 * package, no auth token / private registry. Re-exports gsap + the plugins so kit
 * code imports from here, never from `gsap` directly.
 */

import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollSmoother } from 'gsap/ScrollSmoother'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

let registered = false

export function registerGsap(): void {
  if (registered) return
  gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother, SplitText)
  registered = true
  // Dev-only seam for verifying ScrollTrigger lifecycle (orphan check across nav).
  if (import.meta.env.DEV) {
    ;(globalThis as unknown as { __ST?: typeof ScrollTrigger }).__ST = ScrollTrigger
  }
}

export { gsap, ScrollSmoother, ScrollTrigger, SplitText }
