import type { PrimitiveMeta } from './types'

export const SectionMeta: PrimitiveMeta = {
  name: 'Section',
  category: 'typography',
  useWhen:
    'Dividing a long note into named blocks with optional fractional markers (e.g. "02 / 07").',
  props: {
    id: 'string? — anchor id for deep-linking',
    title: 'string? — section heading text',
    marker: 'string? — fractional label like "02 / 07" shown beside the title',
    icon: 'string? — any lucide kebab name; renders before the title to anchor the section. Choose by the section topic (e.g. "shield-check", "database", "list-checks").',
    animateTitle:
      'boolean? — reveal the title word-by-word on scroll-enter (GSAP SplitReveal). Use on a marquee section or two, not every section.',
    children: 'ReactNode — section body content',
  },
  example: `<Section marker="02 / 07" title="Token contract" icon="shield-check">
  Content goes here.
</Section>`,
}
