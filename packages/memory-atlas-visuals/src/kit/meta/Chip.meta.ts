import type { PrimitiveMeta } from './types'

export const ChipMeta: PrimitiveMeta = {
  name: 'Chip',
  category: 'data',
  useWhen:
    'Inline status or classification badge; use tone to signal semantic meaning at a glance.',
  props: {
    tone: "'program'|'debt'|'idea'|'done'|'next'|'risk'|'neutral' — controls colour palette; defaults to neutral",
    children: 'ReactNode — short label text',
  },
  example: `<Chip tone="done">Shipped</Chip>  <Chip tone="risk">Breaking change</Chip>`,
}
