/**
 * Git merge driver for the one generated path in an Atlas vault.
 *
 * map/index.md is a single sorted table over every zone plus the graph, gaps,
 * attic, and ledger. Two branches that both recollected will both have rewritten
 * it end to end, so a textual three-way merge produces either a conflict on
 * every row or — worse — a clean merge that is arithmetically wrong, because
 * per-row freshness is computed from live git, not from the text.
 *
 * The only correct resolution is to regenerate. This driver does that, and
 * refuses (leaving a normal git conflict) whenever the ZONE CARDS themselves
 * are conflicted, because a rebuild from half-merged inputs would be
 * confidently wrong instead of visibly broken.
 *
 * Mid-merge subtlety: git may invoke this driver before every other path from
 * MERGE_HEAD is written into the working tree. We therefore materialize
 * non-conflicted zone cards from HEAD and MERGE_HEAD before rendering.
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
 * Materialize zone cards from HEAD + MERGE_HEAD into the working tree so a
 * mid-merge regenerate sees both sides. Skips paths that already have conflict
 * markers on disk. Returns whether any zone on disk still has markers.
 *
 * @param {string} repoRoot
 * @param {string} zonesDir absolute
 * @returns {{ conflicted: boolean, written: number }}
 */
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
 * mid-merge regenerate sees both sides. Skips paths that already have conflict
 * markers on disk.
 *
 * @param {string} repoRoot
 * @param {string} zonesDir absolute
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ conflicted: boolean, written: number, refs: string[] }}
 */
export function materializeZonesForMerge(repoRoot, zonesDir, env = process.env) {
  const zonesRel = path.relative(repoRoot, zonesDir).split(path.sep).join('/')
  fs.mkdirSync(zonesDir, { recursive: true })

  const refs = collectMergeTreeIshes(repoRoot, env)

  let written = 0
  let conflicted = false
  /** @type {string[]} */
  const writtenPaths = []
  /** @type {Map<string, string>} rel -> body from first parent that has it */
  const fromGit = new Map()

  for (const ref of refs) {
    for (const rel of listZonesInTree(repoRoot, ref, zonesRel)) {
      if (fromGit.has(rel)) continue
      const show = spawnSync('git', ['show', `${ref}:${rel}`], {
        cwd: repoRoot,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      })
      if (show.status === 0 && show.stdout != null) {
        fromGit.set(rel, show.stdout)
      }
    }
  }

  for (const [rel, body] of fromGit) {
    const abs = path.join(repoRoot, rel)
    if (fs.existsSync(abs)) {
      try {
        const cur = fs.readFileSync(abs, 'utf8')
        if (hasConflictMarkers(cur)) {
          conflicted = true
          continue
        }
        // Prefer a clean working-tree file (may already be the merged result)
        continue
      } catch {
        /* write below */
      }
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, body)
    written++
    writtenPaths.push(abs)
  }

  // Second pass: any on-disk zone still conflicted?
  for (const text of readZoneTexts(zonesDir)) {
    if (hasConflictMarkers(text)) conflicted = true
  }

  return { conflicted, written, refs, writtenPaths }
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
      // leave temp files — user must resolve zone conflicts
      return {
        ok: false,
        reason: 'zone card still has conflict markers — resolve zones first',
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

    const core = opts.render(opts.repoRoot, stderr)
    if (!core || typeof core.rendered !== 'string') {
      return { ok: false, reason: 'render failed — cannot regenerate map/index.md' }
    }

    const out = opts.outPath ?? opts.ours
    fs.mkdirSync(path.dirname(out), { recursive: true })
    fs.writeFileSync(out, core.rendered)
    // Also write working-tree index when ours is a temp merge path
    if (core.indexPath && path.resolve(core.indexPath) !== path.resolve(out)) {
      try {
        fs.mkdirSync(path.dirname(core.indexPath), { recursive: true })
        fs.writeFileSync(core.indexPath, core.rendered)
      } catch {
        // best-effort; git only requires %A
      }
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
