import type { ReactNode } from 'react'

import { Card as ShadcnCard } from '../components/ui/card'
import { Icon } from './Icon'

interface CardsProps {
  children: ReactNode
}
// `icon` is any lucide name (kebab-case); it renders as an accent tile above the
// heading so a grid of cards reads at a glance. Optional — omit for plain cards.
interface CardProps {
  h?: string
  icon?: string
  children: ReactNode
}

export function Cards({ children }: CardsProps) {
  return <div className="skin-cards">{children}</div>
}

/**
 * Card — rebuilt on shadcn/ui Card (API frozen).
 * Uses skin-card* classes + tokens for all presentation. Icon and h kept.
 */
export function Card({ h, icon, children }: CardProps) {
  return (
    <ShadcnCard className="skin-card">
      {icon && (
        <div className="skin-card-icon" aria-hidden="true">
          <Icon name={icon} size={20} />
        </div>
      )}
      {h && <div className="skin-card-heading">{h}</div>}
      <div className="skin-card-body">{children}</div>
    </ShadcnCard>
  )
}
