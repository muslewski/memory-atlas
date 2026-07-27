import type { ReactNode } from 'react'

import { Alert } from '../components/ui/alert'
import { cn } from '../lib/utils'
import { Icon } from './Icon'

type CalloutVariant = 'info' | 'warn' | 'key-insight' | 'pitfall' | 'in-practice'

const LABELS: Record<CalloutVariant, string> = {
  info: 'Info',
  warn: 'Warning',
  'key-insight': 'Key Insight',
  pitfall: 'Pitfall',
  'in-practice': 'In Practice',
}

// Each variant gets a default lucide icon in the left gutter so the callout's
// intent reads before the text does. `icon` overrides per-instance.
const ICONS: Record<CalloutVariant, string> = {
  info: 'info',
  warn: 'triangle-alert',
  'key-insight': 'lightbulb',
  pitfall: 'octagon-alert',
  'in-practice': 'wrench',
}

interface CalloutProps {
  variant?: CalloutVariant
  title?: string
  /** Override the variant's default gutter icon (any lucide kebab name). */
  icon?: string
  children: ReactNode
}

/**
 * Callout — rebuilt on shadcn/ui Alert (API frozen).
 * Preserves all kit variants (info/warn/key-insight/pitfall/in-practice)
 * and skin-callout-* token-driven classes. Never collapses to Alert's
 * default/destructive.
 */
export function Callout({ variant = 'info', title, icon, children }: CalloutProps) {
  const label = title ?? LABELS[variant]
  const iconName = icon ?? ICONS[variant]
  return (
    <Alert className={cn(`skin-callout skin-callout--${variant}`, '[&>svg]:hidden')} role="note">
      <span className="skin-callout-gutter" aria-hidden="true">
        <Icon name={iconName} size={18} />
      </span>
      <span className="skin-callout-label">{label}</span>
      <div className="skin-callout-body">{children}</div>
    </Alert>
  )
}
