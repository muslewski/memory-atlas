/**
 * Counter.tsx — animate a number from 0 → its value on scroll-enter, preserving
 * a symbol prefix and any suffix ("~55", "100%", "18.45s", "~$0.50").
 *
 * Letter-led strings ("h264+aac") parse to NaN and render unchanged — so the
 * Metric `count` opt-in is always safe. Reduced-motion: the gsap fn never runs,
 * so the element keeps its rendered final value.
 */
import { decimalsOf, formatCounter, parseCounter } from './counter-format'
import { useKitGsap } from './gsap/useKitGsap'
import { useMotion } from './gsap/useMotion'

export { decimalsOf, formatCounter, parseCounter }

export function Counter({ children }: { children: string }) {
  const raw = String(children)
  const { prefix, value, suffix } = parseCounter(raw)
  const decimals = decimalsOf(raw)
  const motion = useMotion()

  const scope = useKitGsap<HTMLSpanElement>(
    ({ gsap, scope }) => {
      if (Number.isNaN(value)) return
      scope.textContent = formatCounter(prefix, 0, suffix, decimals) // no-flash start
      const obj = { v: 0 }
      gsap.to(obj, {
        v: value,
        duration: motion.counterDur,
        ease: 'power1.out',
        snap: decimals === 0 ? { v: 1 } : undefined,
        scrollTrigger: { trigger: scope, start: 'top 90%', once: true },
        onUpdate: () => {
          scope.textContent = formatCounter(prefix, obj.v, suffix, decimals)
        },
      })
    },
    [motion],
  )

  return <span ref={scope}>{raw}</span>
}
