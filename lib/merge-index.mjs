/**
 * Git merge driver for the one generated path in an Atlas vault.
 *
 * map/index.md is a single sorted table over every zone plus the graph, gaps,
 * attic, and ledger. Two branches that both recollected will both have rewritten
 * it end to end, so a textual three-way merge produces either a conflict on
 * every row or — worse — a clean merge that is arithmetically wrong, because
 * per-row freshness is computed from live git, not from the text.
 *
 * The only correct resolution is to regenerate from the **merged set of zone
 * cards** (the union of both sides as git has resolved them). This driver does
 * that, and **refuses** (leaving a normal git conflict) whenever:
 *   - a zone card still has conflict markers, or
 *   - merge parents disagree on a zone body and the working tree still holds
 *     only one pure parent version (first-parent / incomplete checkout) — we
 *     will not invent a "merged" card and stamp a confident index on top, or
 *   - regeneration fails or yields an empty string while zones exist.
 *
 * Mid-merge subtlety: git may invoke this driver before every other path from
 * MERGE_HEAD is written into the working tree. We materialize non-divergent
 * zone cards from every merge parent before rendering, and refuse when the
 * complete merged set is not honestly available.
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const MARKERS = [/^<{7}(\s|$)/m, /^={7}(\s|$)/m, /^>{7}(\s|$)/m]

export const hasConflictMarkers = (text = '') => MARKERS.some((re) => re.test(text))

/**
 * @param {{ zoneTexts?: string[] }} [opts]
 * @returns {{ ok: true, action: 'regenerate' } | { ok: false, reason: string }}
 */
export const decideMerge = ({ zoneTexts = [] } = {}) => {
  const bad = zoneTexts.findIndex(hasConflictMarkers)
  if (bad !== -1) {
    return {
      ok: false,
      reason: `zone card #${bad} still has conflict markers — resolve zones first`,
    }
  }
  return { ok: true, action: 'regenerate' }
}

/**
 * Read zone card bodies from a vault zones directory.
 * @param {string} zonesDir
 * @returns {string[]}
 */
export function readZoneTexts(zonesDir) {
  if (!fs.existsSync(zonesDir)) return []
  return fs
    .readdirSync(zonesDir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => fs.readFileSync(path.join(zonesDir, f), 'utf8'))
}

/**
 * List zone card paths (repo-relative) present in a git tree-ish.
 * @param {string} repoRoot
 * @param {string} treeIsh
 * @param {string} zonesRel  e.g. "my-atlas/map/zones"
 * @returns {string[]}
 */
function listZonesInTree(repoRoot, treeIsh, zonesRel) {
  const r = spawnSync(
    'git',
    ['ls-tree', '-r', '--name-only', treeIsh, '--', zonesRel],
    { cwd: repoRoot, encoding: 'utf8' },
  )
  if (r.status !== 0) return []
  return String(r.stdout || '')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.endsWith('.md'))
}

/**
 * Tree-ishes that may hold zone cards for the in-progress merge.
 * ort/recursive often do NOT write MERGE_HEAD while a custom merge driver
 * runs; they do export GITHEAD_<sha>=<name> for each side being merged.
 *
 * @param {string} repoRoot
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string[]}
 */
export function collectMergeTreeIshes(repoRoot, env = process.env) {
  const out = []
  const seen = new Set()
  const add = (ref) => {
    if (!ref || seen.has(ref)) return
    const check = spawnSync('git', ['rev-parse', '--verify', '-q', ref], {
      cwd: repoRoot,
      encoding: 'utf8',
    })
    if (check.status === 0) {
      const sha = String(check.stdout || '').trim() || ref
      if (!seen.has(sha)) {
        seen.add(sha)
        seen.add(ref)
        out.push(ref)
      }
    }
  }

  for (const ref of ['HEAD', 'ORIG_HEAD', 'MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REBASE_HEAD']) {
    add(ref)
  }
  for (const key of Object.keys(env)) {
    if (!key.startsWith('GITHEAD_')) continue
    const sha = key.slice('GITHEAD_'.length)
    if (/^[0-9a-f]{7,40}$/i.test(sha)) add(sha)
  }
  return out
}

/**
 * Materialize zone cards from every merge parent into the working tree so a
 * mid-merge regenerate sees the **union** of both sides.
 *
 * Semantics (F1):
 * - Path only on one parent, or all parents agree byte-for-byte → materialize
 *   that body when the working tree is missing it.
 * - Parents disagree on a path:
 *   - working tree has conflict markers → conflicted (refuse regenerate)
 *   - working tree missing → conflicted (cannot invent a merge)
 *   - working tree equals exactly one pure parent → conflicted (likely an
 *     incomplete first-parent checkout; regenerating would be confidently wrong)
 *   - working tree differs from every pure parent → keep it (zone driver or
 *     human already produced a merge product)
 *
 * @param {string} repoRoot
 * @param {string} zonesDir absolute
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ conflicted: boolean, written: number, refs: string[], writtenPaths: string[], reason?: string }}
 */
export function materializeZonesForMerge(repoRoot, zonesDir, env = process.env) {
  const zonesRel = path.relative(repoRoot, zonesDir).split(path.sep).join('/')
  fs.mkdirSync(zonesDir, { recursive: true })

  const refs = collectMergeTreeIshes(repoRoot, env)

  let written = 0
  let conflicted = false
  /** @type {string | undefined} */
  let reason
  /** @type {string[]} */
  const writtenPaths = []

  /** @type {Map<string, string[]>} rel -> unique bodies across parents */
  const bodiesByRel = new Map()

  for (const ref of refs) {
    for (const rel of listZonesInTree(repoRoot, ref, zonesRel)) {
      const show = spawnSync('git', ['show', `${ref}:${rel}`], {
        cwd: repoRoot,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      })
      if (show.status !== 0 || show.stdout == null) continue
      const body = show.stdout
      const list = bodiesByRel.get(rel) ?? []
      if (!list.includes(body)) list.push(body)
      bodiesByRel.set(rel, list)
    }
  }

  for (const [rel, bodies] of bodiesByRel) {
    const abs = path.join(repoRoot, rel)
    let wt = null
    let wtExists = false
    if (fs.existsSync(abs)) {
      try {
        wt = fs.readFileSync(abs, 'utf8')
        wtExists = true
        if (hasConflictMarkers(wt)) {
          conflicted = true
          reason = reason ?? `zone ${rel} still has conflict markers`
          continue
        }
      } catch {
        /* treat as missing */
      }
    }

    if (bodies.length === 1) {
      // Union path: sole parent or all parents agree.
      if (!wtExists) {
        fs.mkdirSync(path.dirname(abs), { recursive: true })
        fs.writeFileSync(abs, bodies[0])
        written++
        writtenPaths.push(abs)
      }
      // Prefer a clean working-tree file when parents already agree.
      continue
    }

    // Parents disagree (byte-different blobs for the same zone path).
    if (!wtExists) {
      conflicted = true
      reason =
        reason ??
        `zone ${rel} differs across merge parents and is not on disk — resolve the zone before regenerating the index`
      continue
    }
    // WT clean. Trust only a genuine merge product (differs from every pure
    // parent — e.g. stamp-only driver wrote verifiedAt: unverified). A WT
    // that still equals exactly one parent is the incomplete first-parent
    // checkout case: refuse rather than emit a confidently wrong index.
    const matchesParent = bodies.some((b) => b === wt)
    if (matchesParent) {
      conflicted = true
      reason =
        reason ??
        `zone ${rel} differs across merge parents and working tree still matches one pure side — resolve the zone first`
      continue
    }
    // WT is a merge product — keep it; do not overwrite.
  }

  // Second pass: any on-disk zone still conflicted?
  for (const text of readZoneTexts(zonesDir)) {
    if (hasConflictMarkers(text)) {
      conflicted = true
      reason = reason ?? 'zone card still has conflict markers — resolve zones first'
    }
  }

  return { conflicted, written, refs, writtenPaths, reason }
}

/**
 * Decision + regenerate write.
 *
 * Git merge-driver convention: write the resolved content to `ours` (%A) and
 * return ok so git stages it. On refusal, leave ours alone and return ok:false
 * (exit 1) so git records a normal conflict.
 *
 * @param {{
 *   ours: string,
 *   theirs?: string,
 *   base?: string,
 *   repoRoot: string,
 *   zonesDir?: string,
 *   outPath?: string,
 *   render?: (cwd: string, stderr: { write: Function }) =>
 *     | { rendered: string, indexPath: string }
 *     | null,
 *   stderr?: { write: Function },
 *   materialize?: boolean,
 * }} opts
 * @returns {{ ok: boolean, reason?: string, action?: string }}
 */
export function mergeIndex(opts) {
  const stderr = opts.stderr ?? { write: () => {} }
  const zonesDir =
    opts.zonesDir ?? path.join(opts.repoRoot, 'map', 'zones')

  /** @type {string[]} */
  let tempZonePaths = []
  if (opts.materialize !== false) {
    const mat = materializeZonesForMerge(opts.repoRoot, zonesDir)
    tempZonePaths = mat.writtenPaths || []
    if (mat.conflicted) {
      return {
        ok: false,
        reason:
          mat.reason ??
          'zone cards are not fully merged — resolve zones before regenerating map/index.md',
      }
    }
  }

  try {
    const zoneTexts = readZoneTexts(zonesDir)
    const decision = decideMerge({ zoneTexts })
    if (!decision.ok) return decision

    if (typeof opts.render !== 'function') {
      return { ok: false, reason: 'no render function provided for regeneration' }
    }

    let core
    try {
      core = opts.render(opts.repoRoot, stderr)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { ok: false, reason: `render threw — cannot regenerate map/index.md: ${msg}` }
    }
    if (!core || typeof core.rendered !== 'string') {
      // Fail loudly: do not write a partial or empty index.
      return { ok: false, reason: 'render failed — cannot regenerate map/index.md' }
    }

    // Empty successful render: distinguish a genuinely empty vault (0 zones —
    // legitimate) from a broken render that produced nothing while zones
    // exist. Never overwrite a good index with "" when the zone set is non-empty.
    if (core.rendered.length === 0 && zoneTexts.length > 0) {
      return {
        ok: false,
        reason: `empty render with ${zoneTexts.length} zone card(s) on disk — refusing to overwrite map/index.md`,
      }
    }

    const out = opts.outPath ?? opts.ours
    try {
      fs.mkdirSync(path.dirname(out), { recursive: true })
      // Write only after a successful non-empty render so a half-index never lands.
      fs.writeFileSync(out, core.rendered)
      // Also write working-tree index when ours is a temp merge path
      if (core.indexPath && path.resolve(core.indexPath) !== path.resolve(out)) {
        fs.mkdirSync(path.dirname(core.indexPath), { recursive: true })
        fs.writeFileSync(core.indexPath, core.rendered)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { ok: false, reason: `write failed — cannot regenerate map/index.md: ${msg}` }
    }
    return { ok: true, action: 'regenerate' }
  } finally {
    // Remove zone cards we materialised only for the render. Leaving them as
    // untracked files makes ort refuse the merge ("would be overwritten").
    // Git itself will check out the real zone cards from the merged trees next.
    for (const abs of tempZonePaths) {
      try {
        fs.unlinkSync(abs)
      } catch {
        /* ignore */
      }
    }
  }
}
