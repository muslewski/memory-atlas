// src/kit/Reveal.tsx — fade + rise on enter-view.
// Static (no animation) under prefers-reduced-motion OR when motion.framer is off.
import { motion, useReducedMotion } from 'framer-motion'
import { visuals } from '../config'

interface RevealProps {
  children: React.ReactNode
  /** Vertical offset in px to animate from; default 16 */
  y?: number
}

export function Reveal({ children, y = 16 }: RevealProps) {
  const reduce = useReducedMotion() || !visuals.motion.framer
  if (reduce) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
