import type { ReactNode } from 'react'

/**
 * DropCap — now a thin shim. The first-letter styling lives in kit.css
 * (Typeset does not provide drop caps).
 */
export function DropCap({ children }: { children: ReactNode }) {
  return <p className="kit-dropcap">{children}</p>
}
