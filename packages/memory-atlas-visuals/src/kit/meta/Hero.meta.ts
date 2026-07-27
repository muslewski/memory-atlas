import type { PrimitiveMeta } from './types'

export const HeroMeta: PrimitiveMeta = {
  name: 'Hero',
  category: 'typography',
  useWhen:
    'Opening a note or article page — sets the title, optional eyebrow label, and a lead hook sentence.',
  props: {
    title: 'string — required; the primary headline',
    hook: 'ReactNode? — the 1–2 sentence stakes line below the title (canonical)',
    summary:
      'ReactNode? — forgiving alias for hook; renders identically (hook wins if both set). Use either, never neither.',
    eyebrow: 'string? — small all-caps label above the title',
    'frontmatter passthrough':
      'source/commit/generated/type/status are accepted and ignored — the provenance strip renders them, not Hero.',
    children: 'ReactNode? — optional inline visual or decorative element',
  },
  example: `<Hero
  eyebrow="Segment 03"
  title="The immersive layer"
  hook="Five coherent atmospheres, one token contract."
/>`,
}
