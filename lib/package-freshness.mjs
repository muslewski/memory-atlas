/**
 * Two-tier package freshness for fleet consumers:
 *   Tier A — wired lag: installed package vs .atlas-state atlasVersion / migrations
 *   Tier B — registry lag: installed package vs npm latest (TTL-cached, fail-open)
 *
 * Zero runtime deps: Node builtins + optional `npm` on PATH. Network never throws
 * into status/doctor/gate; registry failures are silent no-ops.
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pendingMigrations, compareVersions } from './migrate.mjs'
import { packageVersion, readState, writeState } from './state.mjs'

export const DEFAULT_PACKAGE_FRESHNESS = {
  mode: 'warn',
  registry: true,
  wired: true,
  registryTtlHours: 24,
}

/**
 * @param {Record<string, unknown> | undefined | null} check
 * @returns {{
 *   mode: 'warn' | 'fail',
 *   registry: boolean,
 *   wired: boolean,
 *   registryTtlHours: number,
 * }}
 */
export function resolvePackageFreshness(check) {
  const raw = check?.packageFreshness
  const base = { ...DEFAULT_PACKAGE_FRESHNESS }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base

  if (raw.mode === 'fail' || raw.mode === 'warn') base.mode = raw.mode
  if (typeof raw.registry === 'boolean') base.registry = raw.registry
  if (typeof raw.wired === 'boolean') base.wired = raw.wired
  if (typeof raw.registryTtlHours === 'number' && Number.isFinite(raw.registryTtlHours) && raw.registryTtlHours >= 0) {
    base.registryTtlHours = raw.registryTtlHours
  }
  return base
}

/**
 * Semver-ish: strip leading ^ ~ = v and take major.minor.patch.
 * @param {string | null | undefined} range
 * @returns {string | null}
 */
export function coerceSemver(range) {
  if (!range || typeof range !== 'string') return null
  const m = range.trim().match(/v?(\d+\.\d+\.\d+)/)
  return m ? m[1] : null
}

/**
 * Read memory-atlas pin from a consumer package.json (deps or devDeps).
 * @param {string} repoRoot
 * @returns {string | null} raw range string
 */
export function readPinnedRange(repoRoot) {
  const pkgPath = path.join(repoRoot, 'package.json')
  if (!fs.existsSync(pkgPath)) return null
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    return (
      pkg.devDependencies?.['memory-atlas'] ??
      pkg.dependencies?.['memory-atlas'] ??
      pkg.optionalDependencies?.['memory-atlas'] ??
      null
    )
  } catch {
    return null
  }
}

/**
 * @param {Record<string, unknown> | null} state
 * @param {string} installed
 * @param {unknown[]} [migrations]
 * @returns {{ lag: boolean, wired: string | null, pendingCount: number, messages: string[] }}
 */
export function evaluateWiredLag(state, installed, migrations) {
  const messages = []
  if (!state?.atlasVersion) {
    return { lag: false, wired: null, pendingCount: 0, messages }
  }
  const wired = String(state.atlasVersion)
  const pending = pendingMigrations(state, installed, migrations)
  const versionLag = wired !== installed
  const pendingCount = pending.length
  const lag = versionLag || pendingCount > 0

  if (versionLag) {
    messages.push(
      `⬆ atlas ${installed} installed, wired ${wired} — run the atlas-update skill (migrate + wire)`,
    )
  }
  if (pendingCount > 0 && !versionLag) {
    messages.push(`⬆ ${pendingCount} migration(s) pending — run atlas migrate --write`)
  } else if (pendingCount > 0 && versionLag) {
    // version message already covers update path; note migrations in doctor detail only
  }
  return { lag, wired, pendingCount, messages }
}

/**
 * @param {string} installed
 * @param {string | null} latest
 * @param {string | null} [pinRange]
 * @returns {{ lag: boolean, latest: string | null, messages: string[] }}
 */
export function evaluateRegistryLag(installed, latest, pinRange = null) {
  const messages = []
  if (!latest) return { lag: false, latest: null, messages }
  if (compareVersions(installed, latest) >= 0) {
    return { lag: false, latest, messages }
  }
  const pin = pinRange ? ` (you pin ${pinRange})` : ''
  messages.push(
    `⬆ memory-atlas ${latest} available on npm (installed ${installed})${pin} — npm i -D memory-atlas@${latest} then atlas-update`,
  )
  return { lag: true, latest, messages }
}

/**
 * Probe npm registry for latest version. Fail-open.
 * Injectable for tests via opts.fetchLatest.
 *
 * @param {{
 *   packageName?: string,
 *   timeoutMs?: number,
 *   fetchLatest?: (name: string) => string | null,
 * }} [opts]
 * @returns {string | null}
 */
export function fetchRegistryLatest(opts = {}) {
  const packageName = opts.packageName ?? 'memory-atlas'
  if (typeof opts.fetchLatest === 'function') {
    try {
      return opts.fetchLatest(packageName)
    } catch {
      return null
    }
  }

  try {
    const result = spawnSync('npm', ['view', packageName, 'version'], {
      encoding: 'utf8',
      timeout: opts.timeoutMs ?? 2500,
      // Avoid npm life-cycle noise; never inherit stdio
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    if (result.status !== 0 || result.error) return null
    const version = String(result.stdout ?? '')
      .trim()
      .split('\n')
      .pop()
    return coerceSemver(version)
  } catch {
    return null
  }
}

/**
 * Read TTL cache from state.updateCheck.
 * @param {Record<string, unknown> | null} state
 * @param {number} ttlHours
 * @param {number} [nowMs]
 * @returns {{ hit: boolean, latest: string | null, checkedAt: string | null }}
 */
export function readUpdateCheckCache(state, ttlHours, nowMs = Date.now()) {
  const uc = state?.updateCheck
  if (!uc || typeof uc !== 'object') {
    return { hit: false, latest: null, checkedAt: null }
  }
  const checkedAt = typeof uc.checkedAt === 'string' ? uc.checkedAt : null
  const latest = typeof uc.latest === 'string' ? coerceSemver(uc.latest) : null
  if (!checkedAt || !latest) return { hit: false, latest: null, checkedAt }

  const checkedMs = Date.parse(checkedAt)
  if (!Number.isFinite(checkedMs)) return { hit: false, latest: null, checkedAt: null }

  const ageMs = nowMs - checkedMs
  const ttlMs = ttlHours * 60 * 60 * 1000
  if (ageMs < 0 || ageMs > ttlMs) return { hit: false, latest, checkedAt }
  return { hit: true, latest, checkedAt }
}

/**
 * Persist updateCheck on state (best-effort). Never throws.
 * @param {string} repoRoot
 * @param {Record<string, unknown> | null} state
 * @param {{ latest: string, source?: string, checkedAt?: string }} payload
 * @param {{ writeState?: typeof writeState }} [opts]
 */
export function persistUpdateCheck(repoRoot, state, payload, opts = {}) {
  const write = opts.writeState ?? writeState
  if (!state || typeof state !== 'object') return
  try {
    const next = {
      ...state,
      updateCheck: {
        checkedAt: payload.checkedAt ?? new Date().toISOString(),
        latest: payload.latest,
        source: payload.source ?? 'npm',
      },
    }
    write(repoRoot, next)
  } catch {
    // fail-open: cache miss next time
  }
}

/**
 * Resolve latest version using cache then optional registry probe.
 *
 * @param {string} repoRoot
 * @param {ReturnType<typeof resolvePackageFreshness>} policy
 * @param {Record<string, unknown> | null} state
 * @param {{
 *   force?: boolean,
 *   fetchLatest?: (name: string) => string | null,
 *   nowMs?: number,
 *   persist?: boolean,
 * }} [opts]
 * @returns {{ latest: string | null, fromCache: boolean }}
 */
export function resolveRegistryLatest(repoRoot, policy, state, opts = {}) {
  if (!policy.registry) return { latest: null, fromCache: false }

  const nowMs = opts.nowMs ?? Date.now()
  const cache = readUpdateCheckCache(state, policy.registryTtlHours, nowMs)
  if (!opts.force && cache.hit) {
    return { latest: cache.latest, fromCache: true }
  }

  const fetched = fetchRegistryLatest({ fetchLatest: opts.fetchLatest })
  if (fetched && opts.persist !== false) {
    persistUpdateCheck(repoRoot, state ?? readState(repoRoot), {
      latest: fetched,
      source: 'npm',
      checkedAt: new Date(nowMs).toISOString(),
    })
  }
  if (fetched) return { latest: fetched, fromCache: false }
  // Stale cache as last resort when offline
  if (cache.latest) return { latest: cache.latest, fromCache: true }
  return { latest: null, fromCache: false }
}

/**
 * Full two-tier report for status / doctor / gate.
 *
 * @param {string} repoRoot
 * @param {Record<string, unknown>} config
 * @param {{
 *   forceRegistry?: boolean,
 *   fetchLatest?: (name: string) => string | null,
 *   migrations?: unknown[],
 *   nowMs?: number,
 *   skillsDir?: string,
 *   persistRegistry?: boolean,
 * }} [opts]
 * @returns {{
 *   installed: string,
 *   policy: ReturnType<typeof resolvePackageFreshness>,
 *   wired: ReturnType<typeof evaluateWiredLag>,
 *   registry: ReturnType<typeof evaluateRegistryLag> & { fromCache: boolean },
 *   messages: string[],
 *   hasIssues: boolean,
 *   shouldFail: boolean,
 * }}
 */
export function computePackageFreshness(repoRoot, config, opts = {}) {
  const policy = resolvePackageFreshness(config.check)
  const installed = packageVersion()
  const state = readState(repoRoot)
  const skillsDir =
    opts.skillsDir ??
    (typeof config.skills?.dir === 'string' && config.skills.dir
      ? config.skills.dir
      : '.claude/skills')

  const wired =
    policy.wired
      ? evaluateWiredLag(state, installed, opts.migrations)
      : { lag: false, wired: state?.atlasVersion ? String(state.atlasVersion) : null, pendingCount: 0, messages: [] }

  // Enrich wired message with skills path (status parity with historical line)
  if (wired.lag && wired.messages.length > 0 && wired.messages[0].includes('atlas-update skill')) {
    wired.messages[0] =
      `⬆ atlas ${installed} installed, wired ${wired.wired} — run the atlas-update skill (${skillsDir}/atlas-update/SKILL.md)`
  }

  let registry = { lag: false, latest: null, messages: [], fromCache: false }
  if (policy.registry) {
    const resolved = resolveRegistryLatest(repoRoot, policy, state, {
      force: opts.forceRegistry,
      fetchLatest: opts.fetchLatest,
      nowMs: opts.nowMs,
      persist: opts.persistRegistry !== false,
    })
    const pinRange = readPinnedRange(repoRoot)
    const evalR = evaluateRegistryLag(installed, resolved.latest, pinRange)
    registry = { ...evalR, fromCache: resolved.fromCache }
  }

  const messages = [...wired.messages, ...registry.messages]
  const hasIssues = wired.lag || registry.lag
  // Fail only on wired lag (and pending) when mode=fail — registry stays soft
  // unless mode=fail AND we treat registry as blocking too.
  // Product decision C: registry soft always in warn; in fail mode both block.
  const shouldFail =
    policy.mode === 'fail' &&
    ((policy.wired && wired.lag) || (policy.registry && registry.lag))

  return {
    installed,
    policy,
    wired,
    registry,
    messages,
    hasIssues,
    shouldFail,
  }
}

/**
 * @param {ReturnType<typeof computePackageFreshness>} report
 * @param {boolean} strict
 * @returns {boolean} true when the process should exit non-zero
 */
export function shouldExitNonZero(report, strict) {
  if (!report.hasIssues) return false
  if (strict) {
    // --strict: fail on any enabled tier issue (including registry)
    return true
  }
  return report.shouldFail
}
