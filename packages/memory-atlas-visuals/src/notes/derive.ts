/**
 * derive.ts — tier 2. Deterministic enhancement of a source note.
 *
 * The whole point: everything here is DERIVED from the note's own frontmatter and
 * headings. No LLM, no authoring, no snapshot — therefore no drift, and it covers
 * all 1,086 notes instead of the ~5% that earn a hand-authored digest.
 * See [[2026-07-11-visuals-typeset-migration-design]].
 *
 * Iron rule, inherited from the kit: NEVER invent a value. A field that is absent
 * from frontmatter produces no metric.
 */

export type DerivedHeading = { depth: 2 | 3; text: string; id: string }
export type DerivedMetric = { label: string; value: string; icon: string }

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/`[^`]*`/g, (m) => m.slice(1, -1))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** h2 + h3 only — h1 is the note title, h4+ is too deep to navigate by. */
export function deriveHeadings(body: string): DerivedHeading[] {
  const out: DerivedHeading[] = []
  let inFence = false
  for (const line of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line)
    if (!m) continue
    const text = m[2].replace(/`/g, '')
    out.push({ depth: m[1].length as 2 | 3, text, id: slugify(m[2]) })
  }
  return out
}

// Each entry may name SEVERAL frontmatter keys; the first one present wins. The vault
// is not uniform — 79% of notes date themselves with `created`, 19% with `date` — and a
// metric that only reads one key makes ~200 notes look undated. First-key-wins keeps one
// "Date" row instead of two competing ones.
const METRIC_FIELDS: ReadonlyArray<{ keys: string[]; label: string; icon: string }> = [
  { keys: ['type'], label: 'Type', icon: 'file-text' },
  { keys: ['status'], label: 'Status', icon: 'clock' },
  { keys: ['created', 'date'], label: 'Date', icon: 'calendar' },
  { keys: ['verifiedAt'], label: 'Verified', icon: 'check' },
]

export function deriveMetrics(data: Record<string, unknown>): DerivedMetric[] {
  const out: DerivedMetric[] = []
  for (const { keys, label, icon } of METRIC_FIELDS) {
    for (const key of keys) {
      const v = data[key]
      if (typeof v === 'string' && v.length > 0) {
        out.push({ label, value: v, icon })
        break
      }
    }
  }
  return out
}

/**
 * The note's own one-line summary, used as the hero hook.
 *
 * 83% of vault notes carry a `summary`, which makes it the single most-populated field
 * there is — and a hero that shows only a title is exactly the "headline with no hook"
 * the kit forbids. Derived, never invented: no summary ⇒ no hook.
 */
export function deriveHook(data: Record<string, unknown>): string | undefined {
  const s = data.summary
  return typeof s === 'string' && s.trim().length > 0 ? s.trim() : undefined
}

/** Frontmatter tags, normalised. 40% of notes have them; absent ⇒ empty, never invented. */
export function deriveTags(data: Record<string, unknown>): string[] {
  const t = data.tags
  if (!Array.isArray(t)) return []
  return t.filter((x): x is string => typeof x === 'string' && x.length > 0)
}
