import type { PrimitiveMeta } from './types'

export const GistMeta: PrimitiveMeta = {
  name: 'Gist',
  category: 'data',
  useWhen:
    'Surfacing the distilled takeaway of a section; wraps a <ul> of key points under a bulb icon.',
  props: {
    children: 'ReactNode — typically a <ul> of concise bullet points (canonical)',
    items:
      'optional ReactNode[] — forgiving alias for children; each renders as a bullet <li>. Use EITHER children OR items, never empty.',
  },
  example: `<Gist>\n  <ul>\n    <li>Selectors must return stable references.</li>\n    <li>Never project objects inside useShallow.</li>\n  </ul>\n</Gist>`,
}
