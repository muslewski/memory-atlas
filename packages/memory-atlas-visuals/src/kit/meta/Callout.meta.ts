import type { PrimitiveMeta } from './types'

export const CalloutMeta: PrimitiveMeta = {
  name: 'Callout',
  category: 'data',
  useWhen:
    'Drawing attention to a notable aside, warning, best-practice, or cautionary note inline with prose.',
  props: {
    variant:
      "'info'|'warn'|'key-insight'|'pitfall'|'in-practice' — controls accent colour, default label, AND a default gutter icon (info/triangle-alert/lightbulb/octagon-alert/wrench); defaults to info",
    title: 'string? — override the auto-generated label',
    icon: 'string? — override the variant default gutter icon (any lucide kebab name)',
    children: 'ReactNode — callout body',
  },
  example: `<Callout variant="key-insight">\n  Selectors must return stable references — never project objects inside useShallow.\n</Callout>`,
}
