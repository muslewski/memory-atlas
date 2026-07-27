import type { PrimitiveMeta } from './types'

export const CardsMeta: PrimitiveMeta = {
  name: 'Cards',
  category: 'data',
  useWhen:
    'Displaying a scannable grid of related items, each with an optional heading and body content.',
  props: {
    children: 'ReactNode — one or more <Card> elements',
  },
  example: `<Cards>\n  <Card h="Performance">Token-driven shadow lifts on hover.</Card>\n  <Card h="Tokens">Zero hardcoded values — all var(--skin-*).</Card>\n</Cards>`,
}

export const CardMeta: PrimitiveMeta = {
  name: 'Card',
  category: 'data',
  useWhen:
    'A single card cell inside a Cards grid; use h for a short heading and icon for a feature-grid glyph. Prefer giving every card in a grid an icon — they make the grid scannable and carry meaning at a glance.',
  props: {
    h: 'string? — optional card heading',
    icon: 'string? — any lucide kebab name; renders as an accent tile above the heading. Choose by meaning (e.g. "database", "shield", "rocket"). See the visuals-kit concept→icon table.',
    children: 'ReactNode — card body content',
  },
  example: `<Card h="Atomic SQL" icon="database">Single UPDATE … RETURNING; no read-modify-write race.</Card>`,
}
