import type { PrimitiveMeta } from './types'

export const ReadingModeMeta: PrimitiveMeta = {
  name: 'ReadingMode',
  category: 'structure',
  useWhen:
    'Mount once in the layout shell to give readers a Skim/Deep toggle — Skim hides any element marked data-reading-detail',
  props: {
    // No props — self-contained widget that reads/writes localStorage + html attribute
  },
  example: `{/* In layout shell, once per page */}
<ReadingMode />

{/* In note content, mark supplementary blocks */}
<p data-reading-detail>Deep-mode only elaboration goes here.</p>`,
}
