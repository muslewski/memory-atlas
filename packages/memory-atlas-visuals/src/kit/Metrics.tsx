import type { ReactNode } from 'react'

import { Item } from '../components/ui/item'
import { Counter } from './Counter'
import { Icon } from './Icon'

// `count` opts the value into a GSAP count-up on scroll-enter. Counter renders
// non-numeric values unchanged, so count is always safe.
interface MetricProps {
  label: string
  value: string
  icon?: string
  count?: boolean
}
// children is the canonical API; `items` is a forgiving alias so an author who
// reaches for `items={[{label,value}]}` gets the same render instead of empty.
interface MetricsProps {
  children?: ReactNode
  items?: MetricProps[]
}

export function Metrics({ children, items }: MetricsProps) {
  return (
    <div className="skin-metrics">
      {children ??
        items?.map((m, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static ordered list, identity key not needed
          <Metric key={i} label={m.label} value={m.value} icon={m.icon} count={m.count} />
        ))}
    </div>
  )
}

/**
 * Metric — rebuilt on shadcn/ui Item (API frozen).
 * Presentation via .skin-metric* + tokens; value may use Counter.
 */
export function Metric({ label, value, icon, count }: MetricProps) {
  return (
    <Item className="skin-metric">
      {icon && (
        <span className="skin-metric-icon" aria-hidden="true">
          <Icon name={icon} size={18} />
        </span>
      )}
      <span className="skin-metric-value">{count ? <Counter>{value}</Counter> : value}</span>
      <span className="skin-metric-label">{label}</span>
    </Item>
  )
}
