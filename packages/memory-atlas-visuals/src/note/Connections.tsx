/**
 * Connections.tsx — Outbound-link panel for the note view.
 *
 * Receives `relPath` and looks up the note's pre-resolved outbound[] from the
 * notes manifest (covers all 1,110 notes). Pure presentational: does NO parsing
 * or runtime resolution. The manifest builder already resolved each link's route
 * from the note's own source wikilinks (see 2026-06-24-visual-connections-outbound-nav-design).
 *
 * - route present  → <Link> (react-router-dom client-side nav)
 * - route null     → greyed <span> (note referenced but not in the vault)
 * - empty/absent   → renders nothing (no container)
 */
import { Link } from 'react-router-dom'
import type { OutboundLink } from '../kit/outbound'
import { notesManifest } from '../notes/notes-manifest'

// OutboundLink is owned by the kit (shared with the inline <NoteLink>); re-export
// so existing `import { OutboundLink } from './Connections'` callers keep working.
export type { OutboundLink }

const CSS = `
  /* ── Connections panel ───────────────────────────────────────────────── */
  .snap-connections {
    margin-top: 48px;
    padding-top: 24px;
    border-top: var(--skin-border-w, 1px) solid var(--skin-border);
  }
  .snap-connections-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--skin-muted);
    margin: 0 0 12px;
  }
  .snap-connections ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .snap-connections li {
    display: contents;
  }
  .conn-visual,
  .conn-source {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 99px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.03em;
    text-decoration: none;
    transition: opacity 0.15s;
  }
  .conn-visual {
    background: var(--chip-done-bg, #E1F5EE);
    color: var(--chip-done-text, #04342C);
  }
  .conn-source {
    background: var(--skin-surface);
    color: var(--skin-muted);
    border: var(--skin-border-w, 1px) solid var(--skin-border);
  }
  .conn-visual:hover,
  .conn-source:hover { opacity: 0.7; }
  .conn-missing {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 99px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.03em;
    background: var(--skin-surface);
    color: var(--skin-faint);
    border: var(--skin-border-w, 1px) solid var(--skin-border);
    opacity: 0.5;
    cursor: default;
  }
`

interface ConnectionsProps {
  /** Canonical: look up pre-resolved outbound from the full notes manifest. */
  relPath?: string
  /** @internal Test-only escape hatch to inject synthetic data without touching manifest. */
  outbound?: OutboundLink[]
}

export default function Connections({ relPath, outbound: outboundProp }: ConnectionsProps) {
  let outbound = outboundProp
  if (outbound == null && relPath) {
    const note = notesManifest.notes.find((n) => n.relPath === relPath)
    outbound = note?.outbound
  }
  if (!outbound?.length) return null
  return (
    <>
      <style>{CSS}</style>
      <nav data-testid="connections" className="snap-connections" aria-label="Connections">
        <h2 className="snap-connections-title">Links to</h2>
        <ul>
          {outbound.map((o) =>
            o.route ? (
              <li key={o.slug}>
                <Link
                  data-testid={`connection-${o.slug}`}
                  to={o.route}
                  className={o.illustrated ? 'conn-visual' : 'conn-source'}
                >
                  {o.title}
                </Link>
              </li>
            ) : (
              <li key={o.slug}>
                <span
                  data-testid={`connection-${o.slug}`}
                  className="conn-missing"
                  title="No note found for this link"
                >
                  {o.title}
                </span>
              </li>
            ),
          )}
        </ul>
      </nav>
    </>
  )
}
