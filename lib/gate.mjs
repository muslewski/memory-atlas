/**
 * `atlas gate` — consumer predev / CI entry for two-tier package freshness.
 *
 * Always prints findings when present. Exit 1 only when mode is fail or
 * `--strict` is set AND there are issues. Fail-open on unexpected errors
 * unless --strict (then exit 1).
 */

import { loadConfig } from './config.mjs'
import { findRepoRoot } from './detect.mjs'
import { computePackageFreshness, shouldExitNonZero } from './package-freshness.mjs'

/**
 * @param {string[]} argv
 * @param {{
 *   cwd?: string,
 *   stdout?: { write: Function },
 *   stderr?: { write: Function },
 *   fetchLatest?: (name: string) => string | null,
 *   migrations?: unknown[],
 *   forceRegistry?: boolean,
 * }} [opts]
 * @returns {number}
 */
export function runGate(argv, opts = {}) {
  const cwd = opts.cwd ?? process.cwd()
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const strict = Array.isArray(argv) && argv.includes('--strict')
  const forceRegistry = opts.forceRegistry === true || (Array.isArray(argv) && argv.includes('--force'))

  try {
    const repoRoot = findRepoRoot(cwd)
    if (!repoRoot) {
      if (strict) {
        stderr.write('atlas gate: no git repository found\n')
        return 1
      }
      return 0
    }

    const config = loadConfig(repoRoot, { stderr: { write: () => {} } })
    if (config.enabled === false) return 0

    const report = computePackageFreshness(repoRoot, config, {
      forceRegistry,
      fetchLatest: opts.fetchLatest,
      migrations: opts.migrations,
    })

    if (report.messages.length === 0) {
      stdout.write('atlas gate: ok\n')
      return 0
    }

    for (const msg of report.messages) {
      stdout.write(`${msg}\n`)
    }

    if (shouldExitNonZero(report, strict)) {
      stderr.write(
        strict
          ? 'atlas gate: fail (strict) — resolve package freshness before continuing\n'
          : 'atlas gate: fail — set check.packageFreshness.mode to "warn" to soft-only, or run atlas-update\n',
      )
      return 1
    }

    return 0
  } catch (err) {
    if (strict) {
      stderr.write(`atlas gate: error: ${err?.message ?? err}\n`)
      return 1
    }
    return 0
  }
}
