import type { PrimitiveMeta } from './types'

export const StickyTOCMeta: PrimitiveMeta = {
  name: 'StickyTOC',
  category: 'orientation',
  useWhen:
    'Documents with multiple named sections where readers benefit from a persistent, active-highlighted navigation sidebar.',
  props: {
    items:
      '{id:string,label:string}[]? — explicit TOC entries; if omitted, derived from section[id] elements in the document on mount',
  },
  example: `<StickyTOC />\n// Or with explicit items:\n<StickyTOC items={[\n  { id: 'intro', label: 'Introduction' },\n  { id: 'usage', label: 'Usage' },\n]} />`,
}
