/**
 * The pure verifier core (SPEC.md §4 Lifecycles, §5 Zone cards and anchors,
 * §6 The generated index). No fs, no child_process, no config reads —
 * everything is injected (zones/flows/graph data, resolvers). This purity is
 * the unit-test seam (fake resolvers, no git needed) AND the embedding seam
 * (other tools may import this module directly). Keep it that way.
 */

const SHA_RE = /^[0-9a-f]{7,40}$/i
const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g

/** `:(exclude)…` / `:!…` are scope-narrowing git pathspecs, not ownership claims. */
export function isExcludePathspec(g) {
  return typeof g === 'string' && (g.startsWith(':(exclude)') || g.startsWith(':!'))
}

/**
 * A note registers its basename AND, when the basename carries a
 * `YYYY-MM-DD-` prefix, the date-stripped alias (Obsidian shortest-path
 * semantics — membership only, never disambiguation).
 *
 * @param {string} id note id (filename without .md)
 * @returns {string[]}
 */
export function noteIdAliases(id) {
  const aliases = [id]
  const m = /^\d{4}-\d{2}-\d{2}-(.+)$/.exec(id)
  if (m) aliases.push(m[1])
  return aliases
}

/**
 * Extract `[[slug]]` targets (alias stripped) from a field value, which may
 * be a single string, an array of strings, or absent.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function extractLinks(value) {
  if (value == null) return []
  const items = Array.isArray(value) ? value : [value]
  const links = []
  for (const item of items) {
    if (typeof item !== 'string') continue
    for (const m of item.matchAll(WIKILINK_RE)) {
      links.push(m[1].trim())
    }
  }
  return links
}

/**
 * True when `value` is a commit SHA. Bare all-digit short SHAs are parsed by
 * the frontmatter subset as JS Number (see lib/frontmatter.mjs parseScalar);
 * coerce those integers back to digit strings so a real `git rev-parse
 * --short` like `34341274` is not rejected as "not a SHA".
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isSha(value) {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    value = String(value)
  }
  return typeof value === 'string' && SHA_RE.test(value)
}

function isUnverified(value) {
  return value === 'unverified'
}

function anchorArray(owns, key) {
  const v = owns?.[key]
  return Array.isArray(v) ? v : []
}

/**
 * Dangling-link + reciprocity warnings across the vault graph. Warning-only:
 * never affects errors/exit code. `skills` is intentionally excluded
 * (external projections, not vault-graph members).
 */
function graphPass({ zones, flows, decisions, pillars, noteIds }) {
  const warnings = []
  const resolves = (link) => noteIds.has(link)

  const scanLinks = (note, kind, fields) => {
    for (const field of fields) {
      for (const link of extractLinks(note[field])) {
        if (!resolves(link)) {
          warnings.push(`${kind} ${note.id}: dangling link [[${link}]] in ${field}`)
        }
      }
    }
  }

  for (const z of zones) {
    scanLinks(z, 'zone', ['related', 'sources', 'depends', 'advances', 'hosts'])
  }
  for (const f of flows) {
    scanLinks(f, 'flow', ['related', 'sources'])
  }
  for (const d of decisions) {
    scanLinks(d, 'decision', ['related', 'sources'])
  }
  for (const p of pillars) {
    scanLinks(p, 'pillar', ['related', 'sources', 'realizedBy'])
  }

  // advances <-> realizedBy reciprocity, both directions.
  const findZone = (link) => zones.find((z) => noteIdAliases(z.id).includes(link))
  const findPillar = (link) => pillars.find((p) => noteIdAliases(p.id).includes(link))

  for (const z of zones) {
    for (const link of extractLinks(z.advances)) {
      const pillar = findPillar(link)
      if (!pillar) continue // already reported as a dangling link above
      const realizes = extractLinks(pillar.realizedBy)
      if (!realizes.some((r) => noteIdAliases(z.id).includes(r))) {
        warnings.push(
          `zone ${z.id}: advances [[${link}]] but pillar ${pillar.id} does not list it in realizedBy`,
        )
      }
    }
  }
  for (const p of pillars) {
    for (const link of extractLinks(p.realizedBy)) {
      const zone = findZone(link)
      if (!zone) continue // already reported as a dangling link above
      const advances = extractLinks(zone.advances)
      if (!advances.some((a) => noteIdAliases(p.id).includes(a))) {
        warnings.push(
          `pillar ${p.id}: realizedBy [[${link}]] but zone ${zone.id} does not list it in advances`,
        )
      }
    }
  }

  return warnings
}

/**
 * @typedef {Object} Resolvers
 * @property {(g: string) => boolean} glob
 * @property {(sha: string, globs: string[]) => boolean | 'unknown-sha'} changedSince
 * @property {(id: string) => boolean} [testid] present only when the anchor class is configured
 * @property {(id: string) => boolean} [tool] present only when the anchor class is configured
 * @property {(r: string) => boolean} [route] present only when the anchor class is configured
 */

/**
 * @param {Array<Record<string, unknown>>} zones
 * @param {Array<Record<string, unknown>>} flows
 * @param {Resolvers} r
 * @param {{ noteIds?: Set<string>, pillars?: Array<Record<string, unknown>>, decisions?: Array<Record<string, unknown>> }} [graph]
 * @returns {{ errors: string[], warnings: string[], graphWarnings: string[], rows: Array<{id:string,status:string,freshness:string,summary:string}>, attic: Array<{id:string,kind:string,status:string,summary:string}> }}
 */
export function validate(zones, flows, r, graph = {}) {
  const noteIds = graph.noteIds ?? new Set()
  const pillars = graph.pillars ?? []
  const decisions = graph.decisions ?? []

  const errors = []
  const warnings = []
  const rows = []
  const attic = []

  for (const z of zones) {
    const owns = z.owns ?? {}

    // SPEC.md's verifiedAt rule covers `unmounted` zones: a verifier MUST
    // NOT evaluate an Attic zone's anchors at all — its `owns.globs` point
    // at code that no longer exists, so existence, staleness, and
    // verifiedAt-encoding checks would all be false failures. Attic it
    // BEFORE any anchor check runs — never after.
    if (z.status === 'unmounted') {
      attic.push({ id: z.id, kind: 'zone', status: z.status, summary: z.summary ?? '' })
      continue
    }

    for (const g of anchorArray(owns, 'globs')) {
      if (isExcludePathspec(g)) continue
      if (!r.glob(g)) errors.push(`zone ${z.id}: glob "${g}" matches no tracked files`)
    }

    const testids = anchorArray(owns, 'testids')
    if (testids.length > 0) {
      if (typeof r.testid === 'function') {
        for (const t of testids) {
          if (!r.testid(t)) errors.push(`zone ${z.id}: testid "${t}" not found`)
        }
      } else {
        warnings.push(`zone ${z.id}: owns.testids present but anchor class not configured`)
      }
    }

    const tools = anchorArray(owns, 'tools')
    if (tools.length > 0) {
      if (typeof r.tool === 'function') {
        for (const t of tools) {
          if (!r.tool(t)) errors.push(`zone ${z.id}: tool "${t}" not found`)
        }
      } else {
        warnings.push(`zone ${z.id}: owns.tools present but anchor class not configured`)
      }
    }

    const routes = anchorArray(owns, 'routes')
    if (routes.length > 0) {
      if (typeof r.route === 'function') {
        for (const rt of routes) {
          if (!r.route(rt))
            warnings.push(`zone ${z.id}: route "${rt}" not confidently resolved — verify`)
        }
      } else {
        warnings.push(`zone ${z.id}: owns.routes present but anchor class not configured`)
      }
    }

    for (const inv of z.invariants ?? []) {
      const enforcedBy = Array.isArray(inv.enforcedBy) ? inv.enforcedBy : []
      if (enforcedBy.length === 0) {
        warnings.push(`zone ${z.id}: invariant "${inv.rule}" has no enforcedBy → file tech-debt`)
      }
    }

    const verifiedAt = z.verifiedAt
    if (z.status === 'seeded') {
      if (!isUnverified(verifiedAt)) {
        errors.push(
          `zone ${z.id}: status "seeded" requires verifiedAt "unverified", found "${verifiedAt}"`,
        )
      }
    } else if (!isSha(verifiedAt)) {
      errors.push(
        `zone ${z.id}: status "${z.status}" requires a commit SHA for verifiedAt, found "${verifiedAt}"`,
      )
    }

    let freshness
    if (isUnverified(verifiedAt)) {
      freshness = 'seeded'
    } else {
      const result = r.changedSince(String(verifiedAt ?? ''), owns.globs ?? [])
      if (result === 'unknown-sha') {
        warnings.push(`zone ${z.id}: verifiedAt ${verifiedAt} not found in history`)
        freshness = '⚠ stale' // conservative: never silently read an unresolvable sha as fresh
      } else {
        freshness = result ? '⚠ stale' : 'ok'
      }
    }

    rows.push({ id: z.id, status: z.status ?? '?', freshness, summary: z.summary ?? '' })
  }

  for (const f of flows) {
    if (f.status === 'unmounted') {
      attic.push({ id: f.id, kind: 'flow', status: f.status, summary: f.summary ?? '' })
    }
  }
  for (const d of decisions) {
    if (d.status === 'unmounted') {
      attic.push({ id: d.id, kind: 'decision', status: d.status, summary: d.summary ?? '' })
    }
  }

  // ADR numbers (NNNN-slug) must be unique across the vault. Warning-only so
  // brownfield vaults with collisions do not hard-fail `atlas check`.
  const decisionsByNum = new Map()
  for (const d of decisions) {
    const m = /^(\d{4})-/.exec(String(d.id ?? ''))
    if (!m) continue
    const ids = decisionsByNum.get(m[1]) ?? []
    ids.push(d.id)
    decisionsByNum.set(m[1], ids)
  }
  for (const [num, ids] of decisionsByNum) {
    if (ids.length > 1) warnings.push(`decision number ${num} reused: ${ids.join(', ')}`)
  }

  const graphWarnings = graphPass({ zones, flows, decisions, pillars, noteIds })

  return { errors, warnings, graphWarnings, rows, attic }
}

/**
 * Render `map/index.md` (SPEC.md §6). Never hand-edited; regenerated by
 * `atlas build`.
 *
 * Optional `ledger` adds a compact ## Ledger section: per-type status
 * counts plus the 10 most recent date-prefixed specs/plans/reports. Omitted
 * entirely when every ledger array is empty (greenfield index unchanged).
 *
 * @param {{ rows?: Array<{id:string,status:string,freshness:string,summary:string}>, warnings?: string[], graphWarnings?: string[], attic?: Array<{id:string,kind:string,summary:string}> }} result
 * @param {{ specs?: Array<Record<string, unknown>>, plans?: Array<Record<string, unknown>>, reports?: Array<Record<string, unknown>>, decisions?: Array<Record<string, unknown>> }} [ledger]
 * @returns {string}
 */
export function renderIndex(
  { rows = [], warnings = [], graphWarnings = [], attic = [] } = {},
  ledger = {},
) {
  const sorted = [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  // SPEC.md §6 item 2: "## ⚠ Verification gaps" lists zones that are stale,
  // `seeded`, or otherwise unverified — not just the non-graph warning
  // strings. Derive those zone entries from `rows` (freshness is the only
  // signal available here) and combine with the existing warnings.
  const staleGaps = sorted
    .filter((row) => row.freshness === '⚠ stale')
    .map((row) => `zone ${row.id}: ⚠ stale — code changed since verifiedAt, review and re-stamp`)
  const seededGaps = sorted
    .filter((row) => row.freshness === 'seeded')
    .map((row) => `zone ${row.id}: seeded — not yet verified (verifiedAt: unverified)`)
  const verificationGaps = [...staleGaps, ...seededGaps, ...warnings]

  const lines = []
  lines.push('<!-- GENERATED by atlas build — do not hand-edit. -->')
  lines.push('')
  lines.push('# Atlas Map — index')
  lines.push('')
  lines.push('| Zone | Status | Freshness | Summary |')
  lines.push('|------|--------|-----------|---------|')
  for (const row of sorted) {
    lines.push(`| ${row.id} | ${row.status} | ${row.freshness} | ${row.summary ?? ''} |`)
  }

  lines.push('')
  lines.push('## ⚠ Verification gaps')
  lines.push('')
  if (verificationGaps.length === 0) {
    lines.push('_none_')
  } else {
    for (const w of verificationGaps) lines.push(`- ${w}`)
  }

  lines.push('')
  lines.push('## ⚠ Graph coherence')
  lines.push('')
  if (graphWarnings.length === 0) {
    lines.push('_none_')
  } else {
    for (const w of graphWarnings) lines.push(`- ${w}`)
  }

  lines.push('')
  lines.push('## Attic (unmounted)')
  lines.push('')
  if (attic.length === 0) {
    lines.push('_none_')
  } else {
    for (const a of attic) lines.push(`- ${a.id} (${a.kind}) — ${a.summary ?? ''}`)
  }

  const ledgerTypes = [
    ['specs', ledger.specs],
    ['plans', ledger.plans],
    ['reports', ledger.reports],
    ['decisions', ledger.decisions],
  ]
  const countLines = []
  for (const [label, notes] of ledgerTypes) {
    const list = notes ?? []
    if (list.length === 0) continue
    const byStatus = new Map()
    for (const n of list) {
      const s = String(n.status ?? '?')
      byStatus.set(s, (byStatus.get(s) ?? 0) + 1)
    }
    const parts = [...byStatus.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([s, c]) => `${s} ${c}`)
      .join(' · ')
    countLines.push(`${label}: ${list.length} (${parts})`)
  }

  // Recency: YYYY-MM-DD- prefixed ids from specs/plans/reports only, newest first.
  const datedIds = []
  for (const notes of [ledger.specs, ledger.plans, ledger.reports]) {
    for (const n of notes ?? []) {
      const id = String(n.id ?? '')
      if (/^\d{4}-\d{2}-\d{2}-/.test(id)) datedIds.push(id)
    }
  }
  datedIds.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
  const recent = datedIds.slice(0, 10)

  if (countLines.length > 0) {
    lines.push('')
    lines.push('## Ledger')
    lines.push('')
    for (const line of countLines) lines.push(`- ${line}`)
    if (recent.length > 0) {
      lines.push('')
      lines.push('### Recent')
      lines.push('')
      for (const id of recent) lines.push(`- [[${id}]]`)
    }
  }

  lines.push('')

  return lines.join('\n')
}
