// src/kit/Stagger.tsx — staggered children reveal.
// Static under prefers-reduced-motion OR when motion.framer is off.
import { motion, useReducedMotion } from 'framer-motion'
import { visuals } from '../config'

interface StaggerProps {
  children: React.ReactNode
  /** Delay between each child's animation start, in seconds; default 0.1 */
  gap?: number
}

const containerVariants = (gap: number) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: gap,
    },
  },
})

const childVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export function Stagger({ children, gap = 0.1 }: StaggerProps) {
  const reduce = useReducedMotion() || !visuals.motion.framer
  if (reduce) return <>{children}</>
  return (
    <motion.div
      variants={containerVariants(gap)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10% 0px' }}
    >
      {/* Wrap each direct child so the stagger variant cascades */}
      {Array.isArray(children) ? (
        children.map((child, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static ordered list, identity key not needed
          <motion.div key={i} variants={childVariants}>
            {child}
          </motion.div>
        ))
      ) : (
        <motion.div variants={childVariants}>{children}</motion.div>
      )}
    </motion.div>
  )
}
