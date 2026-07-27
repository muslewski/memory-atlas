import type { PrimitiveMeta } from './types'

export const SplitRevealMeta: PrimitiveMeta = {
  name: 'SplitReveal',
  category: 'motion',
  useWhen:
    'Reveal a short headline or emphasis line word-by-word (GSAP SplitText) on scroll-enter. For Section titles prefer Section animateTitle. Reduced-motion-safe (renders plain text). GSAP — see the gsap-* skills for idioms.',
  props: {
    children: 'ReactNode — the text to split + reveal',
    splitBy: "'words' | 'chars'? — split unit; default 'words' (from motion-profile)",
    className: 'string? — extra class for positioning',
  },
  example: `<SplitReveal>Idea → Render in one loop</SplitReveal>`,
}
