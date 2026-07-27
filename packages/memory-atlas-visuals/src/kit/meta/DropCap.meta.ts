import type { PrimitiveMeta } from './types'

export const DropCapMeta: PrimitiveMeta = {
  name: 'DropCap',
  category: 'typography',
  useWhen: 'Opening a long-form piece with an editorial drop-capital on the first paragraph.',
  props: {
    children:
      'ReactNode — wraps a paragraph; the CSS ::first-letter pseudo-element is applied to the first <p>',
  },
  example: `<DropCap>
  <p>A skin is not a theme file — it is an atmosphere.</p>
</DropCap>`,
}
