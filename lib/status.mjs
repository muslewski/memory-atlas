/**
 * `atlas status` — one line, zero side effects. Safe to wire into a
 * SessionStart hook per the family's hook contract (SPEC.md Interop): must
 * print nothing and exit 0 when there is nothing to report (no repo, no
 * vault), and must never throw.
 */

import path from 'node:path'
import { findRepoRoot, findVaultDir } from './detect.mjs'
import { loadConfig, loadVault } from './notes.mjs'
import { makeResolvers } from './resolvers.mjs'
import { validate } from './validate.mjs'

/**
 * @param {string[]} argv unused (reserved for future flags)
 * @param {{ cwd?: string, stdout?: { write: Function } }} [opts]
 * @returns {number} always 0 — a status-hook failure must fail open
 */
export function runStatus(_argv, opts = {}) {
  const cwd = opts.cwd ?? process.cwd()
  const stdout = opts.stdout ?? process.stdout

  try {
    const repoRoot = findRepoRoot(cwd)
    if (!repoRoot) return 0
    const vaultDir = findVaultDir(repoRoot)
    if (!vaultDir) return 0

    const config = loadConfig(repoRoot)
    const vault = loadVault(vaultDir, config)
    const resolvers = makeResolvers(repoRoot, config.anchors ?? {})
    const result = validate(vault.zones, vault.flows, resolvers, {
      noteIds: vault.noteIds,
      pillars: vault.pillars,
    })

    const mountedZones = vault.zones.filter((z) => z.status !== 'unmounted')
    const seededCount = mountedZones.filter((z) => z.status === 'seeded').length
    const staleCount = result.rows.filter((row) => row.freshness === '⚠ stale').length
    const openDebt = vault.debt.filter((d) => d.status === 'open').length
    const vaultName = path.basename(vaultDir)

    stdout.write(
      `🧠 ${vaultName}: ${mountedZones.length} zones (${seededCount} seeded) · ` +
        `${vault.specs.length} specs · ${vault.plans.length} plans · ` +
        `⚠ ${openDebt} open debt · ${staleCount} stale\n`,
    )
    return 0
  } catch {
    return 0
  }
}
