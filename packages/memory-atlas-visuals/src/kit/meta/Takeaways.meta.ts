import type { PrimitiveMeta } from './types'

export const TakeawaysMeta: PrimitiveMeta = {
  name: 'Takeaways',
  category: 'structure',
  useWhen:
    'Place at the end of a Mind note as a completion ritual — summarises key points and links related documents',
  props: {
    children: 'ReactNode — takeaway list items, use <li> elements (canonical)',
    items: 'optional ReactNode[] — forgiving alias for the children points; each renders as a <li>',
    related:
      'optional ({ href: string; title: string } | string)[] — related docs in a grid below the list. A bare string is accepted (forgiving): a link-looking string becomes its own href, otherwise it renders as a label.',
  },
  example: `<Takeaways related={[
  { href: '/map/zones/auth', title: 'Auth zone' },
  { href: '/map/decisions/0001', title: 'Decision 0001' },
]}>
  <li>Payload auth guards /admin; Better Auth guards all frontend routes.</li>
  <li>BA users sync to Payload via the afterOperation hook on login.</li>
</Takeaways>`,
}
