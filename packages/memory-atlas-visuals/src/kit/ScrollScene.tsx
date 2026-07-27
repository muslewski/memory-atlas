/**
 * ScrollScene.tsx — a section whose content reveals as it enters the viewport.
 *
 * DEFAULT = play-once on enter (the reveal completes on its own and stays — an
 * "appearance" animation, like the other kit primitives). This is deliberate:
 * scrubbing a reveal across a tall element's full scroll extent leaves it stuck
 * half-animated until you scroll past it (the bug this fixes).
 *
 * `scrub` (opt-in) links the reveal to scroll progress for a deliberate
 * scroll-linked scene; `pin` holds the scene while a scrubbed timeline plays.
 * When scrubbed, completion is TOP-relative ('top 40%') so it finishes shortly
 * after entry regardless of element height — never tied to the element's bottom.
 *
 * Reduced-motion: the useKitGsap fn never runs → renders as a normal static
 * section. The ScrollTrigger is owned by the useGSAP scope (killed on nav).
 */
import type { ReactNode } from 'react'
import { useKitGsap } from './gsap/useKitGsap'
import { useMotion } from './gsap/useMotion'

type Effect = 'fade-through' | 'scale-in' | 'pan'

interface ScrollSceneProps {
  children: ReactNode
  /** Pin the scene while a scrubbed timeline plays (implies scrub). Default false. */
  pin?: boolean
  /** Link the reveal to scroll progress. Default false = play once on enter (nothing
   *  stays stuck mid-animation). Set true (or a number for scrub smoothing) only for a
   *  deliberate scroll-linked scene. */
  scrub?: boolean | number
  effect?: Effect
}

export function ScrollScene({
  children,
  pin = false,
  scrub = false,
  effect = 'scale-in',
}: ScrollSceneProps) {
  const motion = useMotion()
  const scope = useKitGsap<HTMLDivElement>(
    ({ gsap, scope }) => {
      const inner = scope.firstElementChild as HTMLElement
      const from =
        effect === 'fade-through'
          ? { opacity: 0, y: 40 }
          : effect === 'pan'
            ? { xPercent: -8, opacity: 0 }
            : { scale: 0.92, opacity: 0 } // scale-in
      const scrubbed = pin || scrub !== false
      gsap.from(inner, {
        ...from,
        ease: scrubbed ? 'none' : motion.enterEase,
        duration: scrubbed ? undefined : motion.enterDur,
        // Promote only WHILE animating, then release — no permanent layer per scene.
        onStart: () => {
          inner.style.willChange = 'transform, opacity'
        },
        onComplete: () => {
          inner.style.willChange = ''
        },
        scrollTrigger: scrubbed
          ? {
              trigger: scope,
              start: 'top 80%',
              // TOP-relative completion — finishes ~40% vh after entry, NOT at the
              // element's bottom (which leaves tall blocks half-scrubbed until passed).
              end: pin ? '+=80%' : 'top 40%',
              scrub: typeof scrub === 'number' ? scrub : motion.scrub,
              pin,
            }
          : {
              // Default: appearance plays once on enter and stays complete.
              trigger: scope,
              start: 'top 85%',
              toggleActions: 'play none none none',
              // Heal the deep-link / above-the-fold case: ScrollTrigger does NOT fire
              // onEnter when its start is already scrolled past at init/refresh, so the
              // from(opacity:0) state would stay stuck (invisible cards until manual
              // refresh). If we're already past the start, complete the tween.
              onRefresh: (self) => {
                if (self.progress > 0) self.animation?.progress(1)
              },
            },
      })
    },
    [pin, scrub, effect, motion],
  )

  return (
    <div ref={scope} className="skin-scrollscene">
      <div className="skin-scrollscene-inner">{children}</div>
    </div>
  )
}
