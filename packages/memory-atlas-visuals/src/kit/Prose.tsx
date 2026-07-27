import type { ReactNode } from 'react'

/**
 * Prose — measure only.
 * Typeset owns rhythm (size/leading/flow) and every bare-element rule; this wrapper
 * exists solely to cap line length, which Typeset deliberately leaves to the layout.
 * Kept as an export because 81 digests import it.
 */
export function Prose({ children }: { children: ReactNode }) {
  return <div className="typeset-measure">{children}</div>
}
