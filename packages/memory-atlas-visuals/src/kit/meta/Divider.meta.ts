import type { PrimitiveMeta } from './types'

export const DividerMeta: PrimitiveMeta = {
  name: 'Divider',
  category: 'typography',
  useWhen:
    'Separating content blocks with a full-width rule; optionally labelled with a short string.',
  props: {
    label: 'string? — optional centred text label; omitting it renders a clean full-width rule',
  },
  example: `<Divider label="continued" />`,
}
