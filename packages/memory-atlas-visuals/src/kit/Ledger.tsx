import type { ReactNode } from 'react'

import { Item } from '../components/ui/item'

interface RowProps {
  done?: boolean
  risk?: boolean
  title: ReactNode
  sub?: ReactNode
}
// children (a list of <Row>) is canonical; `items` is a forgiving alias so
// `items={[{title,sub,done}]}` renders rows instead of an empty list.
interface LedgerProps {
  children?: ReactNode
  items?: RowProps[]
}

// Inline SVGs — minimal, stroke:currentColor, token-driven colour via CSS
function IconCircleCheck() {
  return (
    <svg
      className="skin-ledger-icon skin-ledger-icon--done"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 10.25l2.5 2.5 4.5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconCircle() {
  return (
    <svg
      className="skin-ledger-icon skin-ledger-icon--open"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function Ledger({ children, items }: LedgerProps) {
  return (
    // biome-ignore lint/a11y/noRedundantRoles: explicit role aids screen reader clarity for this pattern
    <ul className="skin-ledger" role="list">
      {/* biome-ignore lint/suspicious/noArrayIndexKey: static ordered list, identity key not needed */}
      {children ?? items?.map((r, i) => <Row key={i} {...r} />)}
    </ul>
  )
}

export function Row({ done, risk, title, sub }: RowProps) {
  return (
    <Item
      asChild
      className={[
        'skin-ledger-row',
        done ? 'skin-ledger-row--done' : '',
        risk ? 'skin-ledger-row--risk' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <li>
        {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: role-attribute combination intentional for this UI pattern */}
        <span className="skin-ledger-icon-wrap" aria-label={done ? 'done' : 'open'}>
          {done ? <IconCircleCheck /> : <IconCircle />}
        </span>
        <span className="skin-ledger-content">
          <span className="skin-ledger-title">{title}</span>
          {sub && <span className="skin-ledger-sub">{sub}</span>}
        </span>
      </li>
    </Item>
  )
}
