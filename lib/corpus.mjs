/**
 * Pure corpus / ownership checks (retrieval-shape + SSOT). No fs, no git —
 * callers inject resolvers (house pattern: lib/validate.mjs is pure,
 * lib/resolvers.mjs shells git). Ported logic from syndcast-mind's
 * corpus-quality checks; atlas config seams replace syndcast literals.
 */

import { extractLinks } from './validate.mjs'

/**
 * Required `##` section titles for a zone card. Source of truth:
 * `templates/notes/zone.md` — keep this list in lockstep when the template
 * gains or renames sections. Pure checks must not read the template at runtime.
 */
export const ZONE_REQUIRED_HEADERS = ['What this is', 'Anchors', 'Invariants', 'Lineage']

/**
 * One artifact, one owner: a tracked file must not appear in more than one
 * mounted zone's expanded `owns.globs`. Unmounted zones are ignored (their
 * globs describe retired code). Exclude pathspecs never claim ownership —
 * `filesFor` already drops them / lets git subtract them.
 *
 * @param {Array<Record<string, unknown>>} zones
 * @param {(globs: string[]) => string[]} filesFor expand positive globs to tracked files
 * @returns {Array<{ zoneId: string, rule: string, message: string }>}
 */
export function findOwnershipConflicts(zones, filesFor) {
  const violations = []
  const fileOwners = new Map()

  for (const z of zones) {
    if (z.status === 'unmounted') continue
    const owns = z.owns ?? {}
    const globs = Array.isArray(owns.globs) ? owns.globs.map(String) : []
    for (const f of filesFor(globs)) {
      let owners = fileOwners.get(f)
      if (!owners) {
        owners = new Set()
        fileOwners.set(f, owners)
      }
      owners.add(String(z.id))
    }
  }

  for (const [file, owners] of fileOwners) {
    if (owners.size > 1) {
      const sorted = [...owners].sort()
      violations.push({
        zoneId: sorted[0],
        rule: 'dup-glob-file',
        message: `file "${file}" owned by ${sorted.length} zones: ${sorted.join(', ')}`,
      })
    }
  }

  return violations
}

/**
 * Retrieval-shape: summary is the leading anchor — must be present and crisp.
 * Longest legit zone summaries measured ~480; default cap 500.
 *
 * @param {Record<string, unknown>} zone
 * @param {{ maxSummaryLen?: number }} [opts]
 * @returns {Array<{ zoneId: string, rule: string, message: string }>}
 */
export function checkSummary(zone, opts = {}) {
  const maxSummaryLen = opts.maxSummaryLen ?? 500
  const id = String(zone.id ?? '?')
  const s = zone.summary
  if (typeof s !== 'string' || s.trim().length === 0) {
    return [
      {
        zoneId: id,
        rule: 'summary',
        message: 'missing/empty `summary` (the leading retrieval anchor)',
      },
    ]
  }
  if (s.length > maxSummaryLen) {
    return [
      {
        zoneId: id,
        rule: 'summary',
        message: `summary is ${s.length} chars (> ${maxSummaryLen}); keep it crisp`,
      },
    ]
  }
  return []
}

/**
 * Retrieval-shape: zone body must carry the template's required `##` sections
 * (one concept per section).
 *
 * @param {Record<string, unknown>} zone
 * @returns {Array<{ zoneId: string, rule: string, message: string }>}
 */
export function checkHeaders(zone) {
  const id = String(zone.id ?? '?')
  const body = typeof zone.body === 'string' ? zone.body : ''
  const missing = ZONE_REQUIRED_HEADERS.filter((title) => {
    const re = new RegExp(`^##\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm')
    return !re.test(body)
  })
  if (missing.length === 0) return []
  return [
    {
      zoneId: id,
      rule: 'headers',
      message: `body missing required section header(s): ${missing.map((t) => `## ${t}`).join(', ')}`,
    },
  ]
}

/**
 * Body `[[wikilinks]]` that resolve to no vault note id/alias.
 * Reuses `extractLinks` from validate.mjs — do not re-implement parsing.
 *
 * @param {Record<string, unknown>} note
 * @param {Set<string>} noteIds
 * @returns {Array<{ zoneId: string, rule: string, message: string }>}
 */
export function checkBrokenLinks(note, noteIds) {
  const id = String(note.id ?? '?')
  const body = typeof note.body === 'string' ? note.body : ''
  const broken = []
  for (const t of extractLinks(body)) {
    if (!noteIds.has(t)) {
      broken.push({
        zoneId: id,
        rule: 'broken-link',
        message: `wikilink resolves to no note: [[${t}]]`,
      })
    }
  }
  return broken
}

/**
 * Count unique inbound wikilinks to each target across all notes' bodies.
 * A source note contributes at most once per target.
 *
 * @param {Array<Record<string, unknown>>} allNotes
 * @returns {Map<string, number>}
 */
export function buildInboundCounts(allNotes) {
  const inbound = new Map()
  for (const n of allNotes) {
    if (n?.stub === true) continue
    const body = typeof n.body === 'string' ? n.body : ''
    for (const t of new Set(extractLinks(body))) {
      inbound.set(t, (inbound.get(t) ?? 0) + 1)
    }
  }
  return inbound
}

/**
 * Mounted zone with zero inbound wikilinks from any vault note.
 *
 * @param {Record<string, unknown>} zone
 * @param {Map<string, number>} inboundCounts
 * @returns {Array<{ zoneId: string, rule: string, message: string }>}
 */
export function checkOrphans(zone, inboundCounts) {
  if (zone.status === 'unmounted') return []
  const id = String(zone.id ?? '?')
  if ((inboundCounts.get(id) ?? 0) > 0) return []
  return [
    {
      zoneId: id,
      rule: 'orphan',
      message: 'zone has no inbound wikilink from any other note',
    },
  ]
}

/**
 * Run the full corpus-quality pass over mounted zones.
 *
 * @param {{
 *   zones: Array<Record<string, unknown>>,
 *   allNotes: Array<Record<string, unknown>>,
 *   noteIds: Set<string>,
 *   maxSummaryLen?: number,
 * }} args
 * @returns {Array<{ zoneId: string, rule: string, message: string }>}
 */
export function runCorpusChecks({ zones, allNotes, noteIds, maxSummaryLen = 500 }) {
  const violations = []
  const inbound = buildInboundCounts(allNotes)
  for (const z of zones) {
    if (z.status === 'unmounted') continue
    violations.push(...checkSummary(z, { maxSummaryLen }))
    violations.push(...checkHeaders(z))
    violations.push(...checkBrokenLinks(z, noteIds))
    violations.push(...checkOrphans(z, inbound))
  }
  return violations
}
