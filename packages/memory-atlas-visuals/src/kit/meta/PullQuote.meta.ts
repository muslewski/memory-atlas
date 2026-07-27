import type { PrimitiveMeta } from './types'

export const PullQuoteMeta: PrimitiveMeta = {
  name: 'PullQuote',
  category: 'typography',
  useWhen:
    'Surfacing a key insight or memorable phrase with typographic weight, distinct from an inline blockquote.',
  props: {
    children:
      'ReactNode — the quote text; displayed in a large display-font italic with an accent left-border',
  },
  example: `<PullQuote>
  Radius, border weight, typeface personality, and shadow depth all move together.
</PullQuote>`,
}
