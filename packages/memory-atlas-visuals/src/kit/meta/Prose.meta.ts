import type { PrimitiveMeta } from './types'

export const ProseMeta: PrimitiveMeta = {
  name: 'Prose',
  category: 'typography',
  useWhen:
    'Wrapping free-form body text to apply --skin-measure width constraint and vertical rhythm.',
  props: {
    children:
      'ReactNode — any text content; headings, paragraphs, lists and blockquotes receive token-driven styles',
  },
  example: `<Prose>
  <p>A skin is not a theme file that swaps hex values.</p>
</Prose>`,
}
