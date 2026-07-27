/**
 * NoteLink.tsx — inline, body-level navigation to a connected note.
 *
 * Used anywhere in a digest body to turn a prose mention ("see the X note")
 * into navigation. Resolves through the note's Mind-owned outbound list
 * (useOutbound) — so it can ONLY link to a note the source `.md` already
 * `[[]]`-declared. It never computes a connection.
 *
 *   resolved + route     → <Link> (client nav). variant="button" = pill CTA.
 *   resolved + no route  → greyed span (source-linked but note missing).
 *   not in outbound      → plain text + dev warn (the ownership guard).
 *
 * Token-only: colours/borders/radius read from var(--skin-*); see kit.css.
 */
import { Link } from 'react-router-dom'
import { resolveNoteLink, useOutbound } from './outbound'

interface NoteLinkProps {
  /** Bare slug of a note the SOURCE links with [[]] (alias/heading are stripped). */
  to: string
  /** 'inline' (default) = text link · 'button' = pill CTA. */
  variant?: 'inline' | 'button'
  children: React.ReactNode
}

export function NoteLink({ to, variant = 'inline', children }: NoteLinkProps) {
  const outbound = useOutbound()
  const hit = resolveNoteLink(to, outbound)
  const cls = variant === 'button' ? 'skin-notelink skin-notelink--button' : 'skin-notelink'

  // Not one of the source's declared connections — render plain, never invent an edge.
  if (!hit) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        `[NoteLink] "${to}" is not in this note's outbound links — add [[${to}]] to the source .md to make it navigable. Rendered as plain text.`,
      )
    }
    return <span className="skin-notelink skin-notelink--plain">{children}</span>
  }

  // Declared but the target note is missing from the vault — honest greyed span.
  if (!hit.route) {
    return (
      <span
        className={`${cls} skin-notelink--missing`}
        title="No note found for this link"
        data-testid={`notelink-${hit.slug}`}
      >
        {children}
      </span>
    )
  }

  return (
    <Link to={hit.route} className={cls} data-testid={`notelink-${hit.slug}`}>
      {children}
    </Link>
  )
}
