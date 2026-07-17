/**
 * `atlas migrate` — deterministic, versioned, dry-run-first transforms
 * over toolkit/mergeable files only.
 *
 * Without `--write`, never touches the filesystem. With `--write`, applies
 * pending migrations in registry order, then stamps state.atlasVersion to
 * the installed package version.
 */

import path from 'node:path'
import { findRepoRoot } from './detect.mjs'
import { MIGRATIONS } from './migrations/index.mjs'
import { defaultState, packageVersion, readState, writeState } from './state.mjs'

/**
 * Compare two semver strings as 3-integer triples.
 * @param {string} a
 * @param {string} b
 * @returns {-1|0|1}
 */
export function compareVersions(a, b) {
  const pa = String(a ?? '0.0.0')
    .split('.')
    .map((p) => Number.parseInt(p, 10) || 0)
  const pb = String(b ?? '0.0.0')
    .split('.')
    .map((p) => Number.parseInt(p, 10) || 0)
  for (let i = 0; i < 3; i++) {
    const av = pa[i] ?? 0
    const bv = pb[i] ?? 0
    if (av < bv) return -1
    if (av > bv) return 1
  }
  return 0
}

/**
 * Migrations whose target is still ahead of state.atlasVersion and at most
 * the installed package version.
 *
 * @param {Record<string, unknown> | null} state
 * @param {string} installedVersion
 * @param {typeof MIGRATIONS} [registry]
 * @returns {typeof MIGRATIONS}
 */
export function pendingMigrations(state, installedVersion, registry = MIGRATIONS) {
  const current = state?.atlasVersion ?? '0.0.0'
  return registry.filter(
    (m) =>
      compareVersions(current, m.target) < 0 && compareVersions(m.target, installedVersion) <= 0,
  )
}

/**
 * @param {string[]} argv
 * @param {{
 *   cwd?: string,
 *   stdout?: { write: Function },
 *   stderr?: { write: Function },
 *   grokHooksDir?: string,
 *   migrations?: typeof MIGRATIONS,
 * }} [opts]
 * @returns {number}
 */
export function runMigrate(argv, opts = {}) {
  const cwd = opts.cwd ?? process.cwd()
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const log = (msg) => stdout.write(`${msg}\n`)
  const err = (msg) => stderr.write(`${msg}\n`)

  const write = argv.includes('--write')
  const json = argv.includes('--json')
  const registry = opts.migrations ?? MIGRATIONS

  const repoRoot = findRepoRoot(cwd) ?? path.resolve(cwd)
  const installed = packageVersion()
  const state = readState(repoRoot)
  const pending = pendingMigrations(state, installed, registry)

  if (pending.length === 0) {
    if (json) {
      log(
        JSON.stringify({
          installed,
          wired: state?.atlasVersion ?? null,
          pending: [],
        }),
      )
    } else {
      log(`✓ up to date (atlas ${installed})`)
    }
    return 0
  }

  if (!write) {
    // Dry-run: plan only, zero filesystem changes.
    const plans = pending.map((m) => ({
      id: m.id,
      target: m.target,
      describe: m.describe,
      plan: m.plan(repoRoot, opts),
    }))

    if (json) {
      log(
        JSON.stringify({
          installed,
          wired: state?.atlasVersion ?? null,
          pending: plans.map(({ id, target, plan }) => ({ id, target, plan })),
        }),
      )
    } else {
      for (const entry of plans) {
        log(`${entry.id} — ${entry.describe}`)
        for (const step of entry.plan) {
          const detail = step.detail ? ` (${step.detail})` : ''
          log(`  ${step.action} ${step.path}${detail}`)
        }
      }
      log('dry run — re-run with --write to apply')
    }
    return 0
  }

  // --write: apply each pending migration in order.
  for (const m of pending) {
    try {
      m.apply(repoRoot, opts)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      err(`atlas migrate: migration ${m.id} failed: ${msg}`)
      return 1
    }
  }

  // Bump version only after all applies succeed. Create state if a migration
  // didn't already (e.g. empty apply that still advanced the version).
  let next = readState(repoRoot)
  if (!next) {
    next = defaultState()
  }
  next.atlasVersion = installed
  writeState(repoRoot, next)

  if (json) {
    log(
      JSON.stringify({
        installed,
        wired: installed,
        applied: pending.map((m) => m.id),
      }),
    )
  } else {
    for (const m of pending) {
      log(`applied ${m.id} — ${m.describe}`)
    }
    log(`✓ migrated to atlas ${installed}`)
  }
  return 0
}
