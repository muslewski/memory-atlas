/**
 * More.tsx — Radix Collapsible disclosure primitive.
 *
 * Replaces the v1 <details class="skin-more"> pattern with a fully-accessible
 * Radix UI Collapsible. The trigger shows a summary line and a chevron that
 * rotates on open; the content animates in/out via CSS.
 *
 * Token-only: every colour, border, and radius reads from var(--skin-*).
 * Layout dimensions (padding, gap, icon size) are literal — the token system
 * has no spacing/sizing tokens.
 */

import { useState } from 'react'

import {
  CollapsibleContent,
  Collapsible as CollapsibleRoot,
  CollapsibleTrigger,
} from '../components/ui/collapsible'
import { Icon } from './Icon'

interface MoreProps {
  summary: string
  children: React.ReactNode
}

export function More({ summary, children }: MoreProps) {
  const [open, setOpen] = useState(false)

  return (
    <CollapsibleRoot className="skin-more" open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className="skin-more-trigger"
        data-testid="more-toggle"
        aria-expanded={open}
      >
        <span className="skin-more-summary">{summary}</span>
        <Icon
          name="chevron-right"
          className={`skin-more-chevron${open ? ' skin-more-chevron--open' : ''}`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="skin-more-content">
        <div className="skin-more-body">{children}</div>
      </CollapsibleContent>
    </CollapsibleRoot>
  )
}
