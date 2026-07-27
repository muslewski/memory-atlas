import type { PrimitiveMeta } from './types'

export const LedgerMeta: PrimitiveMeta = {
  name: 'Ledger',
  category: 'data',
  useWhen:
    'Listing tracked items with completion or risk status; rows carry icons that adapt across skins.',
  props: {
    children: 'ReactNode — one or more <Row> elements (canonical)',
    items:
      'optional { done?: boolean; risk?: boolean; title: ReactNode; sub?: ReactNode }[] — forgiving alias for children; renders the same <Row>s. Use EITHER children OR items, never empty.',
  },
  example: `<Ledger>\n  <Row done title="Shipped" sub="Merged to main 2026-06-20" />\n  <Row risk title="Under review" sub="Awaiting adversarial sign-off" />\n  <Row title="Next up" />\n</Ledger>`,
}

export const RowMeta: PrimitiveMeta = {
  name: 'Row',
  category: 'data',
  useWhen:
    'A single row inside a Ledger; use done or risk to apply the matching icon and accent colour.',
  props: {
    done: 'boolean? — renders a circle-check icon and muted/completed styling',
    risk: 'boolean? — renders the open-circle icon in the risk accent colour',
    title: 'ReactNode — primary row label',
    sub: 'ReactNode? — secondary line shown beneath the title',
  },
  example: `<Row done title="Auth shipped" sub="PR #42 merged" />`,
}
