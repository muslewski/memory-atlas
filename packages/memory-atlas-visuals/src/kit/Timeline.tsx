import type { ReactNode } from 'react'

import { Item } from '../components/ui/item'

// children (a list of <li>) is canonical; `items` is a forgiving alias so an
// author who reaches for `items={[...]}` gets the same render instead of empty.
interface TimelineProps {
  children?: ReactNode
  items?: ReactNode[]
}

/**
 * Timeline — rebuilt on shadcn/ui Separator + Item (API frozen).
 * List structure + skin-timeline kept; uses Item for entries.
 */
export function Timeline({ children, items }: TimelineProps) {
  const content =
    children ??
    items?.map((it, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static ordered list, identity key not needed
      <Item asChild key={i}>
        <li>{it}</li>
      </Item>
    ))
  return (
    // biome-ignore lint/a11y/noRedundantRoles: explicit role aids screen reader clarity for this pattern
    <ol className="skin-timeline" role="list">
      {content}
    </ol>
  )
}
