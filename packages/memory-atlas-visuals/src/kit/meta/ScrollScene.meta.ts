import type { PrimitiveMeta } from './types'

export const ScrollSceneMeta: PrimitiveMeta = {
  name: 'ScrollScene',
  category: 'motion',
  useWhen:
    'Wrap a section whose content should animate WITH scroll — scrubbed, optionally pinned. The cinematic storytelling block (GSAP ScrollTrigger). Reduced-motion → renders as a static section. Use sparingly: one or two per digest, on a section that rewards a beat.',
  props: {
    children: 'ReactNode — the scene content (a single block: Cards, Diagram, Prose…)',
    pin: 'boolean? — pin the scene while a scrubbed timeline plays (implies scrub); default false. WARNING: pin RESERVES the pin scroll-distance (~80% vh) as empty layout space (a pin-spacer) → leaves a large gap around inline content. Only use for a full-viewport deliberate scene, never an inline diagram/cards in a reading flow.',
    scrub:
      'boolean | number? — link the reveal to scroll progress; DEFAULT false = play once on enter (the reveal completes on its own; nothing stays stuck mid-scroll). Set true only for a deliberate scroll-linked scene.',
    effect: "'fade-through' | 'scale-in' | 'pan'? — default 'scale-in'",
  },
  example: `<ScrollScene effect="scale-in">\n  <Cards>…</Cards>\n</ScrollScene>`,
}
