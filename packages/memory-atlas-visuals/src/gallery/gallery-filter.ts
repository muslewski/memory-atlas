/**
 * gallery-filter.ts — pure search/filter logic for the gallery home.
 * No React; unit-tested in gallery-filter.test.ts. Gallery.tsx owns the state.
 */

export const FRESHNESS_VALUES = ['fresh', 'stale', 'missing'] as const
export type Freshness = (typeof FRESHNESS_VALUES)[number]

export interface FilterableEntry {
  title: string
  folder: string
  type: string | null
  status: string | null
  freshness: Freshness | null
  illustrated?: boolean
}

export interface FilterCriteria {
  q: string
  types: Set<string>
  freshness: Set<string>
  illustrated: boolean | null
}

/** Tokenized AND match (each whitespace-separated term must appear) over
 *  title + folder + type + status, case-insensitive. Empty query ⇒ true. */
export function matchesQuery(entry: FilterableEntry, q: string): boolean {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const hay =
    `${entry.title} ${entry.folder} ${entry.type ?? ''} ${entry.status ?? ''}`.toLowerCase()
  return terms.every((term) => hay.includes(term))
}

/** Apply query (AND) + type set (OR within) + freshness set (OR within) + illustrated (exact when set).
 *  An empty Set / null imposes no constraint for that axis. Reuses the established
 *  pattern from [[0062-gallery-search-filter-chips]]. */
export function filterEntries<T extends FilterableEntry>(
  entries: T[],
  { q, types, freshness, illustrated }: FilterCriteria,
): T[] {
  return entries.filter(
    (entry) =>
      matchesQuery(entry, q) &&
      (types.size === 0 || (entry.type != null && types.has(entry.type))) &&
      (freshness.size === 0 || (entry.freshness != null && freshness.has(entry.freshness))) &&
      (illustrated == null || entry.illustrated === illustrated),
  )
}

/** The vault spells the same type two ways (`debt` ×72, `tech-debt` ×53).
 *  Fold them so the facet row shows one chip, not two. */
export function normalizeType(type: string | null): string | null {
  return type === 'debt' ? 'tech-debt' : type
}

/** Distinct non-null `type` values, in first-seen order (stable chip order).
 *  Uses normalizeType so that 'debt' and 'tech-debt' collapse to one chip. */
export function availableTypes(entries: FilterableEntry[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of entries) {
    const t = normalizeType(entry.type)
    if (t != null && !seen.has(t)) {
      seen.add(t)
      out.push(t)
    }
  }
  return out
}
