/**
 * Local-first debug telemetry for memory-atlas.
 *
 * Default OFF (published package). Fleet enables via global config or env.
 * Zero network in v1. Zero runtime deps. Fail-open always.
 */

import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { packageVersion } from './state.mjs'
import { emit as fleetEmit } from './fleet-devlog.mjs'

export const DEFAULT_TELEMETRY = {
  enabled: false,
  level: 'debug',
}

const GLOBAL_DIR = () => path.join(os.homedir(), '.config', 'memory-atlas')
const CACHE_DIR = () => path.join(os.homedir(), '.cache', 'memory-atlas')
const GLOBAL_CONFIG = () => path.join(GLOBAL_DIR(), 'config.json')
const EVENTS_FILE = () => path.join(CACHE_DIR(), 'events.jsonl')
const INSTALL_ID_FILE = () => path.join(CACHE_DIR(), 'install-id')

/** Flags we may record in argv_shape (no free-text). */
const SAFE_FLAGS = new Set([
  '--strict',
  '--force',
  '--write',
  '--json',
  '--hook',
  '--report',
  '--ledger-only',
  '--dry-run',
  '--help',
  '-h',
  '--version',
  '-v',
  '--no-telemetry',
  '--profile',
  '--vault',
  '--modules',
  'claude',
  'grok',
  'all',
  'init',
  'status',
  'dev',
  'preview',
  'code',
  'operator',
])

/**
 * @param {string} filePath
 * @returns {Record<string, unknown> | null}
 */
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

/**
 * Load global machine config (~/.config/memory-atlas/config.json).
 * @returns {Record<string, unknown>}
 */
export function loadGlobalConfig() {
  return readJsonFile(GLOBAL_CONFIG()) || {}
}

/**
 * @param {Record<string, unknown>} patch deep-ish merge top-level keys
 */
export function writeGlobalConfig(patch) {
  const dir = GLOBAL_DIR()
  fs.mkdirSync(dir, { recursive: true })
  const cur = loadGlobalConfig()
  const next = { ...cur, ...patch }
  if (patch.telemetry && typeof patch.telemetry === 'object') {
    next.telemetry = {
      ...(typeof cur.telemetry === 'object' && cur.telemetry ? cur.telemetry : {}),
      ...patch.telemetry,
    }
  }
  fs.writeFileSync(GLOBAL_CONFIG(), `${JSON.stringify(next, null, 2)}\n`)
}

/**
 * @param {{
 *   env?: NodeJS.ProcessEnv,
 *   argv?: string[],
 *   repoConfig?: Record<string, unknown> | null,
 *   globalConfig?: Record<string, unknown> | null,
 * }} [opts]
 * @returns {boolean}
 */
/**
 * Decide whether telemetry is on, and which source won.
 * Precedence: env-off → --no-telemetry → env-on → repo enabled:false → global → false.
 * Repo config may disable but never enable (committed files travel to every clone).
 *
 * @param {{
 *   env?: NodeJS.ProcessEnv,
 *   argv?: string[],
 *   repoConfig?: Record<string, unknown> | null,
 *   globalConfig?: Record<string, unknown> | null,
 * }} [opts]
 * @returns {{ enabled: boolean, source: string }}
 */
export function resolveTelemetryDecision(opts = {}) {
  const env = opts.env ?? process.env
  const argv = opts.argv ?? process.argv
  const raw = env.ATLAS_TELEMETRY
  if (raw === '0' || raw === 'false' || raw === 'off' || raw === 'no') {
    return { enabled: false, source: 'ATLAS_TELEMETRY env (off)' }
  }
  if (argv.includes('--no-telemetry')) {
    return { enabled: false, source: '--no-telemetry' }
  }
  if (raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes') {
    return { enabled: true, source: 'ATLAS_TELEMETRY env (on)' }
  }

  // A committed atlas.config.json may OPT OUT but may not OPT IN. A repo file
  // travels to every clone, so treating it as an enable source means a stranger
  // who clones a public repo starts writing debug events they never agreed to.
  // (25 repos in this fleet ship `telemetry.enabled: true` today.) Disabling
  // stays honoured because "this repo must never emit" is a promise a repo is
  // entitled to make on behalf of everyone who clones it.
  const rTel = opts.repoConfig?.telemetry
  if (rTel && typeof rTel === 'object' && rTel.enabled === false) {
    return { enabled: false, source: 'repo config (telemetry.enabled: false)' }
  }

  const globalConfig = opts.globalConfig !== undefined ? opts.globalConfig : loadGlobalConfig()
  const gTel = globalConfig?.telemetry
  if (gTel && typeof gTel === 'object' && typeof gTel.enabled === 'boolean') {
    return {
      enabled: gTel.enabled,
      source: gTel.enabled
        ? 'global config (~/.config/memory-atlas/config.json)'
        : 'global config (enabled: false)',
    }
  }

  const repoTriedEnable =
    rTel && typeof rTel === 'object' && rTel.enabled === true
      ? '; repo config ignored as an enable source'
      : ''
  return {
    enabled: false,
    source: `no global config${repoTriedEnable}`,
  }
}

export function resolveTelemetryEnabled(opts = {}) {
  return resolveTelemetryDecision(opts).enabled
}

/**
 * @returns {string}
 */
export function getInstallId() {
  try {
    fs.mkdirSync(CACHE_DIR(), { recursive: true })
    const f = INSTALL_ID_FILE()
    if (fs.existsSync(f)) {
      const id = fs.readFileSync(f, 'utf8').trim()
      if (id) return id
    }
    const id = randomUUID().replace(/-/g, '')
    fs.writeFileSync(f, `${id}\n`)
    return id
  } catch {
    return 'unknown'
  }
}

/**
 * Stable non-identifying repo handle (hash of absolute root).
 * @param {string | null | undefined} repoRoot
 * @returns {string | null}
 */
export function repoId(repoRoot) {
  if (!repoRoot) return null
  return createHash('sha256').update(path.resolve(repoRoot)).digest('hex').slice(0, 12)
}

/**
 * @param {string[]} argv command args after subcommand name
 * @returns {string[]}
 */
export function argvShape(argv) {
  if (!Array.isArray(argv)) return []
  const out = []
  for (const a of argv) {
    if (typeof a !== 'string') continue
    if (a.startsWith('-') && SAFE_FLAGS.has(a)) out.push(a)
    else if (SAFE_FLAGS.has(a)) out.push(a)
    // skip free-text (paths, queries, slugs)
  }
  return out
}

/**
 * @param {Record<string, unknown>} event
 * @param {{ eventsPath?: string }} [opts]
 */
export function emitEvent(event, opts = {}) {
  try {
    const file = opts.eventsPath ?? EVENTS_FILE()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const line = `${JSON.stringify(event)}\n`
    fs.appendFileSync(file, line, 'utf8')
  } catch {
    // fail-open
  }
}

/**
 * Build + emit a completed command event when enabled.
 *
 * @param {{
 *   cmd: string,
 *   argv?: string[],
 *   exit: number,
 *   ms: number,
 *   repoRoot?: string | null,
 *   vault?: Record<string, unknown> | null,
 *   freshness?: Record<string, unknown> | null,
 *   resultClass?: string | null,
 *   enabled?: boolean,
 *   env?: NodeJS.ProcessEnv,
 *   processArgv?: string[],
 *   repoConfig?: Record<string, unknown> | null,
 * }} args
 */
/** Contract repo_id for fleet-devlog only — do not change legacy repoId(). */
function fleetContractRepoId(cwd) {
  try {
    if (!cwd) return undefined
    const common = execFileSync(
      'git',
      ['-C', cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 },
    ).trim()
    if (!common) return undefined
    const root = fs.realpathSync(path.dirname(common))
    return `${path.basename(root)}-${createHash('sha256').update(root).digest('hex').slice(0, 8)}`
  } catch {
    return undefined
  }
}

function loadFleetDevlogConfig(env = process.env) {
  try {
    const p = path.join(
      env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
      'fleet-devlog',
      'config.json',
    )
    if (!fs.existsSync(p)) return null
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

function fleetDevlogRoot(env = process.env) {
  return path.join(
    env.XDG_STATE_HOME || path.join(os.homedir(), '.local/state'),
    'fleet-devlog',
  )
}

/** Emit fleet-devlog v1 alongside the legacy local stream (own enable gate). */
function emitFleetDevlog(args) {
  try {
    const env = args.env ?? process.env
    const argv = args.processArgv ?? process.argv
    /** @type {Record<string, unknown>} */
    const evt = {
      tool: 'memory-atlas',
      tool_version: packageVersion(),
      cmd: args.cmd,
      argv_shape: argvShape(args.argv || []),
      exit: args.exit,
      ms: Math.max(0, Math.round(args.ms)),
      result_class: args.exit === 0 ? 'ok' : 'failed',
    }
    const rid = fleetContractRepoId(args.repoRoot || process.cwd())
    if (rid) evt.repo_id = rid
    if (typeof env.FLEET_CORR === 'string' && env.FLEET_CORR) evt.corr = env.FLEET_CORR
    if (args.vault && typeof args.vault === 'object') {
      const counts = {}
      for (const [k, v] of Object.entries(args.vault)) {
        if (typeof v === 'number' && Number.isFinite(v)) counts[k] = v
      }
      if (Object.keys(counts).length) evt.counts = counts
    }
    fleetEmit(evt, {
      root: fleetDevlogRoot(env),
      env,
      argv,
      config: loadFleetDevlogConfig(env),
      safeFlags: [...SAFE_FLAGS],
    })
  } catch {
    /* fail-open */
  }
}

export function trackCommand(args) {
  // Fleet stream uses its own enable gate (env / machine config); always attempt.
  if (args.cmd !== 'telemetry') emitFleetDevlog(args)

  const enabled =
    typeof args.enabled === 'boolean'
      ? args.enabled
      : resolveTelemetryEnabled({
          env: args.env,
          argv: args.processArgv,
          repoConfig: args.repoConfig,
        })
  if (!enabled) return
  if (args.cmd === 'telemetry' || args.cmd === 'status') {
    // status --hook never tracked (caller should skip); bare status optional — skip status entirely for SessionStart safety
    if (args.cmd === 'status') return
  }

  /** @type {Record<string, unknown>} */
  const event = {
    v: 1,
    ts: new Date().toISOString(),
    cmd: args.cmd,
    argv_shape: argvShape(args.argv || []),
    exit: args.exit,
    ms: Math.max(0, Math.round(args.ms)),
    atlas_version: packageVersion(),
    install_id: getInstallId(),
    node: String(process.versions?.node || '').split('.')[0] || '?',
    os: process.platform,
  }
  const rid = repoId(args.repoRoot)
  if (rid) event.repo_id = rid
  if (args.vault && typeof args.vault === 'object') event.vault = args.vault
  if (args.freshness && typeof args.freshness === 'object') event.freshness = args.freshness
  if (args.resultClass) {
    event.result = { ok: args.exit === 0, class: args.resultClass }
  } else {
    event.result = { ok: args.exit === 0, class: args.exit === 0 ? null : 'other' }
  }

  emitEvent(event)
}

/**
 * @param {{ eventsPath?: string, sinceMs?: number }} [opts]
 * @returns {Record<string, unknown>[]}
 */
export function readEvents(opts = {}) {
  const file = opts.eventsPath ?? EVENTS_FILE()
  if (!fs.existsSync(file)) return []
  let text
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch {
    return []
  }
  const since = opts.sinceMs ?? 0
  const out = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    try {
      const ev = JSON.parse(line)
      if (since && ev.ts) {
        const t = Date.parse(ev.ts)
        if (Number.isFinite(t) && t < since) continue
      }
      out.push(ev)
    } catch {
      // skip bad lines
    }
  }
  return out
}

/**
 * @param {Record<string, unknown>[]} events
 * @returns {string}
 */
export function formatReport(events) {
  if (events.length === 0) return 'atlas telemetry report: no events\n'

  /** @type {Map<string, { n: number, ms: number[], exits: Map<number, number> }>} */
  const byCmd = new Map()
  const versions = new Map()
  let fails = 0

  for (const ev of events) {
    const cmd = String(ev.cmd || '?')
    let row = byCmd.get(cmd)
    if (!row) {
      row = { n: 0, ms: [], exits: new Map() }
      byCmd.set(cmd, row)
    }
    row.n++
    if (typeof ev.ms === 'number') row.ms.push(ev.ms)
    const ex = typeof ev.exit === 'number' ? ev.exit : -1
    row.exits.set(ex, (row.exits.get(ex) || 0) + 1)
    if (ex !== 0) fails++
    const ver = String(ev.atlas_version || '?')
    versions.set(ver, (versions.get(ver) || 0) + 1)
  }

  const pct = (arr, p) => {
    if (!arr.length) return 0
    const s = [...arr].sort((a, b) => a - b)
    const i = Math.min(s.length - 1, Math.max(0, Math.floor((p / 100) * s.length)))
    return s[i]
  }

  const lines = []
  lines.push(`atlas telemetry report: ${events.length} events · ${fails} non-zero exit`)
  lines.push('by command:')
  for (const [cmd, row] of [...byCmd.entries()].sort((a, b) => b[1].n - a[1].n)) {
    const p50 = pct(row.ms, 50)
    const p95 = pct(row.ms, 95)
    const failN = [...row.exits.entries()].filter(([c]) => c !== 0).reduce((a, [, n]) => a + n, 0)
    lines.push(`  ${cmd}: n=${row.n} p50=${p50}ms p95=${p95}ms fail=${failN}`)
  }
  lines.push('atlas versions:')
  for (const [v, n] of [...versions.entries()].sort()) {
    lines.push(`  ${v}: ${n}`)
  }
  return `${lines.join('\n')}\n`
}

/**
 * @param {string[]} argv
 * @param {{
 *   cwd?: string,
 *   stdout?: { write: Function },
 *   stderr?: { write: Function },
 *   env?: NodeJS.ProcessEnv,
 *   eventsPath?: string,
 * }} [opts]
 * @returns {number}
 */
export function runTelemetry(argv, opts = {}) {
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const env = opts.env ?? process.env
  const sub = argv[0] || 'status'
  const eventsPath = opts.eventsPath

  try {
    if (sub === 'status') {
      let repoConfig = opts.repoConfig ?? null
      if (repoConfig === null && opts.cwd) {
        try {
          const cfgPath = path.join(opts.cwd, 'atlas.config.json')
          if (fs.existsSync(cfgPath)) {
            repoConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
          }
        } catch {
          repoConfig = null
        }
      }
      const decision = resolveTelemetryDecision({
        env,
        argv: opts.argv ?? process.argv,
        globalConfig: opts.globalConfig,
        repoConfig,
      })
      const enabled = decision.enabled
      const events = readEvents({ eventsPath })
      const last = events[events.length - 1]
      const id = enabled || events.length ? getInstallId().slice(0, 8) : '(none)'
      stdout.write(
        `atlas telemetry: ${enabled ? 'ON' : 'OFF'} (${decision.source})\n`,
      )
      stdout.write(`  events: ${eventsPath ?? EVENTS_FILE()}\n`)
      stdout.write(`  count: ${events.length}\n`)
      stdout.write(`  install_id: ${id}…\n`)
      if (last?.ts) stdout.write(`  last: ${last.ts} cmd=${last.cmd} exit=${last.exit} ms=${last.ms}\n`)
      return 0
    }

    if (sub === 'report') {
      const days = 7
      const since = Date.now() - days * 86400_000
      const events = readEvents({ eventsPath, sinceMs: since })
      stdout.write(formatReport(events))
      return 0
    }

    if (sub === 'dump') {
      const file = eventsPath ?? EVENTS_FILE()
      stdout.write(`${file}\n`)
      if (fs.existsSync(file)) {
        stdout.write(fs.readFileSync(file, 'utf8'))
      }
      return 0
    }

    if (sub === 'clear') {
      const file = eventsPath ?? EVENTS_FILE()
      try {
        if (fs.existsSync(file)) fs.writeFileSync(file, '')
      } catch (e) {
        stderr.write(`atlas telemetry clear: ${e?.message || e}\n`)
        return 1
      }
      stdout.write('atlas telemetry: cleared events\n')
      return 0
    }

    if (sub === 'on') {
      writeGlobalConfig({ telemetry: { enabled: true, level: 'debug' } })
      stdout.write('atlas telemetry: enabled globally (~/.config/memory-atlas/config.json)\n')
      return 0
    }

    if (sub === 'off') {
      writeGlobalConfig({ telemetry: { enabled: false } })
      stdout.write('atlas telemetry: disabled globally\n')
      return 0
    }

    stderr.write(
      'atlas telemetry: usage: status | report | dump | clear | on | off\n',
    )
    return 1
  } catch (e) {
    stderr.write(`atlas telemetry: ${e?.message || e}\n`)
    return 0 // fail-open for status-like; still 0
  }
}

/**
 * Cheap vault counts (no full validate).
 * @param {string | null} vaultDir
 * @param {Record<string, unknown>} [config]
 * @returns {Record<string, number> | null}
 */
export function cheapVaultCounts(vaultDir, config) {
  if (!vaultDir) return null
  try {
    const folders = config?.folders && typeof config.folders === 'object' ? config.folders : {}
    const zonesRel = folders.zones || 'map/zones'
    const zonesDir = path.join(vaultDir, zonesRel)
    if (!fs.existsSync(zonesDir)) return { zones: 0 }
    const zones = fs.readdirSync(zonesDir).filter((f) => f.endsWith('.md')).length
    return { zones }
  } catch {
    return null
  }
}
