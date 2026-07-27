import type { ReactNode } from 'react'

import { Badge } from '../components/ui/badge'
import { cn } from '../lib/utils'

type ChipTone = 'program' | 'debt' | 'idea' | 'done' | 'next' | 'risk' | 'neutral'

interface ChipProps {
  tone?: ChipTone
  children: ReactNode
}

/**
 * Chip — rebuilt on shadcn/ui Badge (API frozen).
 * Keeps exact tone prop and --chip-* / --type-* token usage via existing
 * .skin-chip CSS rules. Does not adopt Badge's variant colours.
 */
export function Chip({ tone = 'neutral', children }: ChipProps) {
  return <Badge className={cn(`skin-chip skin-chip--${tone}`, 'border-0')}>{children}</Badge>
}
