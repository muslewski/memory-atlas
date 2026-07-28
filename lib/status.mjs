/**
 * `atlas status` — one line, zero side effects. Safe to wire into a
 * SessionStart hook per the family's hook contract (SPEC.md Interop): must
 * print nothing and exit 0 when there is nothing to report (no repo, no
 * vault), and must never throw.
 */

import path from 'node:path'
import { loadConfig } from './config.mjs'
import { findRepoRoot, findVaultDir } from './detect.mjs'
import { loadVault } from './notes.mjs'
import { computePackageFreshness } from './package-freshness.mjs'
import { makeResolvers } from './resolvers.mjs'
import { validate } from './validate.mjs'

/**
 * Compute the vault-health counters `atlas status` prints and `atlas
 * routine`'s live footer reuses. Runs one full validate pass (so "stale"
 * reflects real anchor resolution) but adds no git queries beyond what
 * validate/resolvers already perform.
 *
 * @param {string} repoRoot
 * @param {string} vaultDir
 * @param {Record<string, unknown>} config
 * @returns {{ vaultName: string, zoneCount: number, seededCount: number, specCount: number, planCount: number, openDebt: number, staleCount: number }}
 */
export function computeStatusSummary(repoRoot, vaultDir, config) {
  const vault = loadVault(vaultDir, config)
  const resolvers = makeResolvers(repoRoot, config.anchors ?? {})
  const result = validate(vault.zones, vault.flows, resolvers, {
    noteIds: vault.noteIds,
    pillars: vault.pillars,
    decisions: vault.decisions,
    check: config.check ?? {},
  })

  const mountedZones = vault.zones.filter((z) => z.status !== 'unmounted')
  const seededCount = mountedZones.filter((z) => z.status === 'seeded').length
  const staleCount = result.rows.filter((row) => row.freshness === '⚠ stale').length
  const openDebt = vault.debt.filter((d) => d.status === 'open').length

  return {
    vaultName: path.basename(vaultDir),
    zoneCount: mountedZones.length,
    seededCount,
    specCount: vault.specs.length,
    planCount: vault.plans.length,
    openDebt,
    staleCount,
  }
}

/**
 * @param {string[]} argv `--hook` marks a SessionStart-hook call site, so
 *   `hooks.sessionStartStatus: false` silences it; a direct human/script
 *   invocation without `--hook` always prints (SPEC.md Interop: a CLI
 *   invoked both by a hook and by a human distinguishes the two call sites
 *   with a `--hook` flag).
 * @param {{
 *   cwd?: string,
 *   stdout?: { write: Function },
 *   fetchLatest?: (name: string) => string | null,
 *   migrations?: unknown[],
 * }} [opts]
 * @returns {number} always 0 — a status-hook failure must fail open
 */
export function runStatus(argv, opts = {}) {
  const cwd = opts.cwd ?? process.cwd()
  const stdout = opts.stdout ?? process.stdout
  const isHook = Array.isArray(argv) && argv.includes('--hook')

  try {
    const repoRoot = findRepoRoot(cwd)
    if (!repoRoot) return 0
    const vaultDir = findVaultDir(repoRoot)
    if (!vaultDir) return 0

    const config = loadConfig(repoRoot)
    if (isHook && config.hooks?.sessionStartStatus === false) return 0

    const summary = computeStatusSummary(repoRoot, vaultDir, config)

    stdout.write(
      `🧭 ${summary.vaultName}: ${summary.zoneCount} zones (${summary.seededCount} seeded) · ` +
        `${summary.specCount} specs · ${summary.planCount} plans · ` +
        `⚠ ${summary.openDebt} open debt · ${summary.staleCount} stale\n`,
    )

    // Two-tier package freshness (wired + registry). Always soft on status;
    // fail-open. Network probe is TTL-cached in .atlas-state.json.
    const freshness = computePackageFreshness(repoRoot, config, {
      fetchLatest: opts.fetchLatest,
      migrations: opts.migrations,
    })
    for (const msg of freshness.messages) {
      stdout.write(`${msg}\n`)
    }
    return 0
  } catch {
    return 0
  }
}
