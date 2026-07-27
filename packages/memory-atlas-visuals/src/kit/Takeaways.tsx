/**
 * Takeaways.tsx — Completion ritual primitive.
 *
 * Renders at the end of a Mind note to signal "you made it":
 *   1. A takeaway list (children — typically <li> elements)
 *   2. An optional related-docs grid with href + title pairs
 *   3. A subtle one-shot flourish: a brief shimmer that plays once on mount
 *
 * Timer rules (no leaks):
 *   - The flourish setTimeout is stored in a useRef
 *   - The useEffect cleanup calls clearTimeout on it
 *   - No setInterval anywhere
 *
 * Token-only: all colour/border/radius reads from var(--skin-*).
 * Typographic scale (font-size, weight, letter-spacing) uses literals —
 * the token system has no type-scale tokens (same rule as B1–B4).
 */

import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

interface RelatedDoc {
  href: string
  title: string
}

interface TakeawaysProps {
  // children (a list of <li> points) is canonical; `items` is a forgiving alias.
  children?: React.ReactNode
  items?: React.ReactNode[]
  // related accepts {href,title} OR a bare string (forgiving): a string that
  // looks like a link becomes its own href; otherwise it renders as a label.
  related?: (RelatedDoc | string)[]
}

// A bare string becomes a real link ONLY if it looks like one (/, #, http(s)).
// Otherwise href is null → rendered as a plain label, never a dead `#` anchor that
// looks clickable but goes nowhere. Real cross-note nav is the derived Connections
// panel (from the source note's [[wikilinks]]) — see decision 0058.
function normalizeRelated(r: RelatedDoc | string): { href: string | null; title: string } {
  if (typeof r !== 'string') return r
  const isLink = /^(\/|#|https?:)/.test(r)
  return { href: isLink ? r : null, title: r }
}

export function Takeaways({ children, items, related }: TakeawaysProps) {
  const relatedDocs = related?.map(normalizeRelated)
  const [flourish, setFlourish] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // One-shot flourish: fire on mount, then clear after the animation completes
    timerRef.current = setTimeout(() => {
      setFlourish(true)
      // Remove the class after the animation so it doesn't linger in the DOM
      timerRef.current = setTimeout(() => {
        setFlourish(false)
        timerRef.current = null
      }, 900)
    }, 200)

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  return (
    <aside className={`skin-takeaways${flourish ? ' skin-takeaways--flourish' : ''}`}>
      {/* Header */}
      <div className="skin-takeaways-header">
        <Icon name="circle-check" className="skin-takeaways-icon" />
        <span className="skin-takeaways-heading">Key takeaways</span>
      </div>

      {/* Takeaway list */}
      <ul className="skin-takeaways-list">
        {/* biome-ignore lint/suspicious/noArrayIndexKey: static ordered list, identity key not needed */}
        {children ?? items?.map((it, i) => <li key={i}>{it}</li>)}
      </ul>

      {/* Related docs grid — optional */}
      {relatedDocs && relatedDocs.length > 0 && (
        <div className="skin-takeaways-related">
          <p className="skin-takeaways-related-label">Related</p>
          <div className="skin-takeaways-related-grid">
            {relatedDocs.map((doc, i) =>
              doc.href ? (
                <a
                  // biome-ignore lint/suspicious/noArrayIndexKey: static ordered list, identity key not needed
                  key={i}
                  href={doc.href}
                  className="skin-takeaways-related-link"
                  data-testid="related-link"
                >
                  <Icon name="file" className="skin-takeaways-related-icon" />
                  <span>{doc.title}</span>
                  <Icon name="arrow-right" className="skin-takeaways-related-arrow" />
                </a>
              ) : (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: static ordered list, identity key not needed
                  key={i}
                  className="skin-takeaways-related-link skin-takeaways-related-label-item"
                  data-testid="related-label"
                >
                  <Icon name="file" className="skin-takeaways-related-icon" />
                  <span>{doc.title}</span>
                </span>
              ),
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
