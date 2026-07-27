import type { PrimitiveMeta } from './types'

export const ConceptMeta: PrimitiveMeta = {
  name: 'Concept',
  category: 'orientation',
  useWhen:
    'Marking a defined term inline so readers can link directly to it and hover to copy a deep-link to that specific concept.',
  props: {
    id: 'string — anchor id; used as the fragment in the copied URL',
    children: 'ReactNode — the term text to display inline',
  },
  example: `<p>The <Concept id="token-contract">token contract</Concept> governs all skin overrides.</p>`,
}
