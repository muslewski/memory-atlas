/**
 * outbound.tsx — the note's Mind-owned connection list, shared across the kit.
 *
 * `OutboundLink[]` is built at manifest-rebuild time by resolving the source
 * note's own `[[wikilinks]]` (see the visual-connections spec + decision
 * 0058). It is the SINGLE SOURCE OF TRUTH for what a note connects to — the
 * footer Connections panel and the inline <NoteLink> primitive both read it.
 *
 * Visuals NEVER compute connections. This context only carries what the Mind
 * already resolved, so any consumer (footer chip, inline link) can render a
 * connection the SOURCE declared — and nothing it did not.
 */
import { createContext, useContext } from 'react'

export type OutboundLink = {
  title: string
  slug: string
  illustrated: boolean
  route: string | null
}

const OutboundContext = createContext<OutboundLink[]>([])

export function OutboundProvider({
  value,
  children,
}: {
  value: OutboundLink[]
  children: React.ReactNode
}) {
  return <OutboundContext.Provider value={value}>{children}</OutboundContext.Provider>
}

/** The current note's outbound links (empty array outside a provider). */
export function useOutbound(): OutboundLink[] {
  return useContext(OutboundContext)
}

/** Bare slug from a [[…]]-style reference: drop |alias, #heading, ^block, trim. */
function stripRef(raw: string): string {
  return raw.split('|')[0].split('#')[0].split('^')[0].trim()
}

/** Drop a leading YYYY-MM-DD- date prefix for a date-insensitive match. */
function undated(slug: string): string {
  return slug.replace(/^\d{4}-\d{2}-\d{2}-/, '')
}

/**
 * Resolve a <NoteLink to> against the note's outbound list — the ownership gate.
 * Returns the matching OutboundLink (whose route may still be null when the note
 * is missing from the vault), or null when `to` is NOT one of the source's
 * declared [[]] connections.
 */
export function resolveNoteLink(to: string, outbound: OutboundLink[]): OutboundLink | null {
  const t = stripRef(to)
  const exact = outbound.find((o) => o.slug === t)
  if (exact) return exact
  const u = undated(t)
  return outbound.find((o) => undated(o.slug) === u) ?? null
}
