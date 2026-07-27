/**
 * SplitReveal.tsx — reveal text on scroll-enter via GSAP SplitText.
 *
 * Premium default (motion-profile): split into LINES, each wrapped in an
 * overflow-clip MASK, then wipe up from behind the edge (yPercent) with a touch
 * of blur-in. Falls back to y+opacity when splitMask is off. Used for Section
 * titles (opt-in via animateTitle) and inline emphasis.
 *
 * Reduced-motion: the useKitGsap fn never runs → text renders normally.
 * SplitText.revert() on cleanup leaves no orphan span DOM.
 */
import type { ReactNode } from 'react'
import { SplitText } from './gsap/setup'
import { useKitGsap } from './gsap/useKitGsap'
import { useMotion } from './gsap/useMotion'

interface SplitRevealProps {
  children: ReactNode
  /** Override the active skin's default split unit. Omit to follow the personality. */
  splitBy?: 'words' | 'chars' | 'lines'
  className?: string
}

export function SplitReveal({ children, splitBy, className }: SplitRevealProps) {
  const motion = useMotion()
  const unit = splitBy ?? motion.splitUnit
  const scope = useKitGsap<HTMLSpanElement>(
    ({ gsap, scope }) => {
      const target = scope.firstElementChild as HTMLElement
      const masked = motion.splitMask
      const split = SplitText.create(target, { type: unit, mask: masked ? unit : undefined })
      const units = split[unit] as HTMLElement[]
      const vars: gsap.TweenVars = {
        stagger: motion.stagger,
        duration: motion.enterDur,
        ease: motion.enterEase,
        scrollTrigger: {
          trigger: target,
          start: 'top 85%',
          once: true,
          // Heal the deep-link / above-the-fold case: onEnter doesn't fire when the
          // start is already passed at init/refresh → the from-state would stay stuck.
          onRefresh: (self) => {
            if (self.progress > 0) self.animation?.progress(1)
          },
        },
      }
      if (masked) {
        vars.yPercent = motion.enterYPercent
      } else {
        vars.y = motion.enterY
        vars.opacity = 0
      }
      if (motion.enterBlur) vars.filter = `blur(${motion.enterBlur}px)`
      gsap.from(units, vars)
      return () => split.revert()
    },
    [motion, unit],
  )

  return (
    <span ref={scope} className={`skin-split${className ? ` ${className}` : ''}`}>
      <span>{children}</span>
    </span>
  )
}
