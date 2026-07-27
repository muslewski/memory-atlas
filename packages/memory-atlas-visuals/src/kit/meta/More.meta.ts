import type { PrimitiveMeta } from './types'

export const MoreMeta: PrimitiveMeta = {
  name: 'More',
  category: 'structure',
  useWhen:
    'A section has supplementary detail that most readers can skip — collapse it behind a disclosure trigger',
  props: {
    summary: 'string — label shown on the trigger button (always visible)',
    children: 'ReactNode — the expanded content (hidden until opened)',
  },
  example: `<More summary="Implementation notes">
  <p>Radix Collapsible under the hood — fully accessible, keyboard-navigable.</p>
</More>`,
}
