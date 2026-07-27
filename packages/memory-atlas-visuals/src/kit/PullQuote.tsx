import type { ReactNode } from 'react'

interface PullQuoteProps {
  children: ReactNode
}

export function PullQuote({ children }: PullQuoteProps) {
  return (
    <blockquote className="skin-pullquote">
      <div className="skin-pullquote-inner">{children}</div>
    </blockquote>
  )
}
