import type { PrimitiveMeta } from './types'

export const TimelineMeta: PrimitiveMeta = {
  name: 'Timeline',
  category: 'data',
  useWhen: 'Rendering a vertical sequence of events or milestones connected by a dotted spine.',
  props: {
    children: 'ReactNode — bare <li> elements; each becomes a timeline node (canonical)',
    items:
      'optional ReactNode[] — forgiving alias for children; each becomes a node. Use EITHER children OR items, never empty.',
  },
  example: `<Timeline>\n  <li>Spec written + committed</li>\n  <li>Plan approved</li>\n  <li>Implementation shipped</li>\n</Timeline>`,
}
