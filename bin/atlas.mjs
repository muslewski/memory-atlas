#!/usr/bin/env node

import fs, { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runAdopt } from '../lib/adopt.mjs'
import { loadConfig } from '../lib/config.mjs'
import { runCorpusChecks } from '../lib/corpus.mjs'
import { findRepoRoot, findVaultDir } from '../lib/detect.mjs'
import { runDoctor } from '../lib/doctor.mjs'
import { runGate } from '../lib/gate.mjs'
import { runInit } from '../lib/init.mjs'
import { lintLedger } from '../lib/ledger.mjs'
import { runMigrate } from '../lib/migrate.mjs'
import { loadVault } from '../lib/notes.mjs'
import { makeResolvers } from '../lib/resolvers.mjs'
import { runRoutine } from '../lib/routine.mjs'
import { runStamp } from '../lib/stamp.mjs'
import { runStatus } from '../lib/status.mjs'
import { renderIndex, validate } from '../lib/validate.mjs'
import { runSearch } from '../lib/search.mjs'
import {
  cheapVaultCounts,
  resolveTelemetryEnabled,
  runTelemetry,
  trackCommand,
} from '../lib/telemetry.mjs'
import { runVisuals } from '../lib/visuals.mjs'
import { mergeIndex } from '../lib/merge-index.mjs'
import { mergeZone } from '../lib/merge-zone.mjs'
import { runWire } from '../lib/wire.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))

const USAGE = `atlas — code-verified knowledge base for a repository

Usage:
  atlas <command> [options]

Commands:
  atlas init [--profile code|operator] [--vault name] [--modules a,b]
                          Scaffold a new Atlas vault (profile defaults modules + glob policy)
  atlas build             regenerate map/index.md
  atlas check [--strict] [--report] [--ledger-only]
                          validate the vault (read-only) — zone claims, ledger, index freshness
  atlas stamp <slug...>   Re-stamp verifiedAt for reviewed zones (no blanket re-stamp)
  atlas search <query>    Search vault markdown (rg-first; grep fallback). Portable retrieval floor.
  atlas status [--hook]   One-line vault health summary (safe as a hook). --hook marks
                          a SessionStart-hook call site, honoring hooks.sessionStartStatus
                          in atlas.config.json; a plain human/script call always prints.
                          Also prints two-tier package-freshness nudges (wired + registry).
  atlas gate [--strict] [--force]
                          package freshness only (is the installed memory-atlas current?)
                          Default mode is warn (exit 0). --strict or
                          check.packageFreshness.mode=fail → exit 1 on issues.
                          --force refreshes npm latest (bypasses TTL cache).
  atlas wire [claude|grok|all|merge-driver] [--write] [--allow-dirty]
                          Wire SessionStart hooks + managed CLAUDE.md/AGENTS.md on-ramp
                          blocks (default: all). Idempotent; refuses malformed JSON targets.
                          merge-driver: report-first install of local git merge drivers for
                          map/index.md (regenerate) and map/zones/*.md (verifiedAt-only →
                          unverified). Dry-run unless --write. Refuses a dirty tree unless
                          --allow-dirty. .gitattributes alone does nothing without local config.
  atlas merge-index <base> <ours> <theirs> <marker-size> <path>
                          Git merge-driver entrypoint — regenerate map/index.md (do not call by hand)
  atlas merge-zone <base> <ours> <theirs> <marker-size> <path>
                          Git merge-driver entrypoint — stamp-only zone conflicts → unverified
  atlas doctor [--strict] wiring inventory (are hooks/skills/adapters installed?)
                          --strict exits 1 when package-freshness issues are present.
  atlas migrate [--write] [--json]
                          Apply pending versioned migrations (dry-run by default; --write to apply)
  atlas adopt [--write] [--json]
                          Normalize an existing (brownfield) vault + adoption report
  atlas routine [name]    Print a maintenance-routine prompt (no name: list available)
  atlas visuals [init|status|dev|preview] ...
                          Scaffold vault visuals/ content tree, peer status, or
                          spawn memory-atlas-visuals (install the companion to use
                          dev/preview)
  atlas telemetry [status|report|dump|clear|on|off]
                          Local debug telemetry (OFF by default). Fleet: enable
                          with \`atlas telemetry on\` or ATLAS_TELEMETRY=1.

Options:
  --help, -h        Show this help
  --version, -v     Show the installed version
  --no-telemetry    Disable telemetry for this invocation

A repo's atlas.config.json → \`enabled: false\` silences every command above
(except \`init\`), printing nothing and exiting 0 — a kill switch for repos
that vendored the convention but paused it.
`

/**
 * Resolve the repo root + vault dir for a command, writing a helpful error
 * to stderr when either is missing.
 *
 * @param {string} cwd
 * @param {{ write: Function }} stderr
 * @returns {{ repoRoot: string, vaultDir: string } | null}
 */
function resolveVault(cwd, stderr) {
  const repoRoot = findRepoRoot(cwd)
  if (!repoRoot) {
    stderr.write('atlas: no git repository found above the current directory\n')
    return null
  }
  const vaultDir = findVaultDir(repoRoot)
  if (!vaultDir) {
    stderr.write('atlas: no Atlas vault found — run `atlas init` first\n')
    return null
  }
  return { repoRoot, vaultDir }
}

/**
 * Pure core: load config + vault, validate with real git resolvers, RENDER the
 * index to a string. Writes nothing.
 *
 * `check` must be safe to run from a git hook, from a read-only checkout, and
 * from twenty parallel worktrees at once. The old shared core always wrote the
 * index and then asked git whether the write matched HEAD — which made a
 * validation command a mutation, and made every parallel recollection touch the
 * one file guaranteed to conflict.
 *
 * @param {string} cwd
 * @param {{ write: Function }} stderr
 * @returns {{
 *   repoRoot: string,
 *   vaultDir: string,
 *   vault: ReturnType<typeof loadVault>,
 *   result: ReturnType<typeof validate>,
 *   indexPath: string,
 *   rendered: string,
 *   config: ReturnType<typeof loadConfig>,
 * } | null}
 */
export function renderCore(cwd, stderr) {
  const located = resolveVault(cwd, stderr)
  if (!located) return null
  const { repoRoot, vaultDir } = located
  const config = loadConfig(repoRoot)
  const vault = loadVault(vaultDir, config)
  const resolvers = makeResolvers(repoRoot, config.anchors ?? {})
  const result = validate(vault.zones, vault.flows, resolvers, {
    noteIds: vault.noteIds,
    pillars: vault.pillars,
    decisions: vault.decisions,
    check: config.check ?? {},
    profile: config.profile ?? 'code',
  })
  const rendered = renderIndex(result, {
    specs: vault.specs,
    plans: vault.plans,
    reports: vault.reports,
    decisions: vault.decisions,
  })
  const indexPath = path.join(vaultDir, 'map', 'index.md')
  return { repoRoot, vaultDir, vault, result, indexPath, rendered, config }
}

/**
 * Load + validate + write map/index.md (used by `atlas build` and merge-driver).
 *
 * @param {string} cwd
 * @param {{ write: Function }} stderr
 */
function buildCore(cwd, stderr) {
  const core = renderCore(cwd, stderr)
  if (!core) return null
  fs.mkdirSync(path.dirname(core.indexPath), { recursive: true })
  fs.writeFileSync(core.indexPath, core.rendered)
  return core
}

function runBuild(_argv, opts) {
  const cwd = opts.cwd ?? process.cwd()
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr

  const built = buildCore(cwd, stderr)
  if (!built) return 1

  for (const w of built.result.warnings) stderr.write(`warning: ${w}\n`)
  for (const w of built.result.graphWarnings) stderr.write(`warning: ${w}\n`)
  for (const e of built.result.errors) stderr.write(`error: ${e}\n`)

  const gaps =
    built.result.errors.length + built.result.warnings.length + built.result.graphWarnings.length
  stdout.write(`🗺️ Atlas map rebuilt: ${built.result.rows.length} zones, ${gaps} gap(s).\n`)

  return built.result.errors.length > 0 ? 1 : 0
}

function runCheck(argv, opts) {
  const cwd = opts.cwd ?? process.cwd()
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const ledgerOnly = argv.includes('--ledger-only')
  const report = argv.includes('--report')

  const located = resolveVault(cwd, stderr)
  if (!located) return 1
  const { repoRoot, vaultDir } = located
  const config = loadConfig(repoRoot)
  // Owner decision 3: `--strict` does NOT harden staleness. Only the config
  // key `check.strictFreshness: true` turns ⚠ stale into a hard failure.
  // Structural / ownership / lifecycle / corpus (when enabled) are always hard.
  const hardenFreshness = config.check?.strictFreshness === true

  if (ledgerOnly) {
    const vault = loadVault(vaultDir, config)
    const zoneSlugs = new Set(vault.zones.map((z) => z.id))
    const ledgerResult = lintLedger(vaultDir, {
      zoneSlugs,
      folders: config.folders,
      reports: config.modules?.reports === true,
    })
    for (const v of ledgerResult.violations) stdout.write(`${v}\n`)
    stdout.write(
      `ledger: ${ledgerResult.clean}/${ledgerResult.total} clean (${ledgerResult.coverage}%)\n`,
    )
    return ledgerResult.violations.length > 0 ? 1 : 0
  }

  let ok = true

  const core = renderCore(cwd, stderr)
  if (!core) return 1
  const { result, vault } = core

  for (const w of result.warnings) stderr.write(`warning: ${w}\n`)
  for (const w of result.graphWarnings) stderr.write(`warning: ${w}\n`)
  for (const e of result.errors) stderr.write(`error: ${e}\n`)
  if (result.errors.length > 0) ok = false

  // Opt-in corpus-quality gate (retrieval-shape lint). Default off.
  if (config.check?.corpus?.enabled === true) {
    const allNotes = [
      ...vault.zones,
      ...vault.flows,
      ...vault.decisions,
      ...vault.specs,
      ...vault.plans,
      ...vault.ideas,
      ...vault.debt,
      ...vault.pillars,
      ...vault.programs,
      ...vault.reference,
      ...vault.archive,
      ...vault.reports,
      ...vault.drafts,
    ]
    const corpusViolations = runCorpusChecks({
      zones: vault.zones,
      allNotes,
      noteIds: vault.noteIds,
      maxSummaryLen: config.check.corpus.maxSummaryLen ?? 500,
    })
    for (const v of corpusViolations) {
      stderr.write(`error: zone ${v.zoneId}: [${v.rule}] ${v.message}\n`)
    }
    if (corpusViolations.length > 0) ok = false
  }

  if (config.check?.indexSync !== false) {
    let committed = null
    try {
      committed = fs.readFileSync(core.indexPath, 'utf8')
    } catch {
      committed = null
    }
    if (committed !== core.rendered) {
      stderr.write(
        'atlas check: map/index.md is out of date — run `atlas build` and commit the result\n',
      )
      ok = false
    }
  }

  const zoneSlugs = new Set(vault.zones.map((z) => z.id))
  const ledgerResult = lintLedger(vaultDir, {
    zoneSlugs,
    folders: config.folders,
    reports: config.modules?.reports === true,
  })
  for (const v of ledgerResult.violations) stderr.write(`${v}\n`)
  if (ledgerResult.violations.length > 0) ok = false
  if (report) {
    stdout.write(
      `ledger: ${ledgerResult.clean}/${ledgerResult.total} clean (${ledgerResult.coverage}%)\n`,
    )
  }

  const stale = result.rows.filter((row) => row.freshness === '⚠ stale')
  if (stale.length > 0) {
    // Staleness is always reported; it only fails the command when the
    // repo opts in via check.strictFreshness (never via the --strict flag).
    const label = hardenFreshness ? 'error' : 'warning'
    stderr.write(
      `atlas check: ${label}: ${stale.length} stale zone(s): ${stale.map((row) => row.id).join(', ')}\n`,
    )
    if (hardenFreshness) ok = false
  }

  if (ok) stdout.write('atlas check: ok\n')
  return ok ? 0 : 1
}


/**
 * Git merge-driver entry: atlas merge-index %O %A %B %L %P
 * Exit 0 = resolved; exit 1 = leave conflict.
 */
function runMergeIndex(argv, opts) {
  const cwd = opts.cwd ?? process.cwd()
  const stderr = opts.stderr ?? process.stderr
  const [base, ours, theirs, _markerSize, _path] = argv
  if (!ours) {
    stderr.write('atlas merge-index: usage: merge-index <base> <ours> <theirs> <marker-size> <path>\n')
    return 1
  }
  const repoRoot = findRepoRoot(cwd) ?? path.resolve(cwd)
  const vaultDir = findVaultDir(repoRoot)
  if (!vaultDir) {
    stderr.write('atlas merge-index: no Atlas vault found\n')
    return 1
  }
  const zonesDir = path.join(vaultDir, 'map', 'zones')
  const result = mergeIndex({
    base,
    ours,
    theirs,
    repoRoot,
    zonesDir,
    outPath: ours,
    render: (root, err) => renderCore(root, err),
    stderr,
  })
  if (!result.ok) {
    stderr.write(`atlas merge-index: ${result.reason}\n`)
    return 1
  }
  return 0
}

/**
 * Git merge-driver entry: atlas merge-zone %O %A %B %L %P
 * Exit 0 = resolved; exit 1 = leave conflict.
 */
function runMergeZone(argv, opts) {
  const stderr = opts.stderr ?? process.stderr
  const [base, ours, theirs] = argv
  if (!ours) {
    stderr.write('atlas merge-zone: usage: merge-zone <base> <ours> <theirs> <marker-size> <path>\n')
    return 1
  }
  const result = mergeZone({ base, ours, theirs, stderr })
  if (!result.ok) {
    stderr.write(`atlas merge-zone: ${result.reason}\n`)
    return 1
  }
  return 0
}

const COMMANDS = {
  init: (args) => runInit(args, { cwd: process.cwd() }),
  build: (args) => runBuild(args, { cwd: process.cwd() }),
  check: (args) => runCheck(args, { cwd: process.cwd() }),
  'merge-index': (args) => runMergeIndex(args, { cwd: process.cwd() }),
  'merge-zone': (args) => runMergeZone(args, { cwd: process.cwd() }),
  stamp: (args) => runStamp(args, { cwd: process.cwd() }),
  search: (args) => runSearch(args, { cwd: process.cwd() }),
  status: (args) => runStatus(args, { cwd: process.cwd() }),
  gate: (args) => runGate(args, { cwd: process.cwd() }),
  wire: (args) => runWire(args, { cwd: process.cwd() }),
  doctor: (args) => runDoctor(args, { cwd: process.cwd() }),
  migrate: (args) => runMigrate(args, { cwd: process.cwd() }),
  adopt: (args) => runAdopt(args, { cwd: process.cwd() }),
  routine: (args) => runRoutine(args, { cwd: process.cwd() }),
  visuals: (args) => runVisuals(args, { cwd: process.cwd() }),
  telemetry: (args) => runTelemetry(args, { cwd: process.cwd() }),
}

/**
 * The `enabled: false` kill switch (SPEC.md/CONFIG.md): every subcommand
 * except `init` prints nothing and exits 0 when a repo's atlas.config.json
 * disables the convention. Silent by design — the stderr sink here only
 * suppresses this probe's own config warnings; the command's own config
 * load (when it proceeds) still reports them normally.
 *
 * @param {string} cwd
 * @returns {boolean}
 */
function isKillSwitched(cwd) {
  const repoRoot = findRepoRoot(cwd)
  if (!repoRoot) return false
  const config = loadConfig(repoRoot, { stderr: { write: () => {} } })
  return config.enabled === false
}

function main(argv) {
  const args = argv.slice(2)
  const command = args[0]
  const t0 = Date.now()

  if (!command || command === '--help' || command === '-h') {
    process.stdout.write(USAGE)
    return 0
  }

  if (command === '--version' || command === '-v') {
    process.stdout.write(`atlas ${pkg.version}\n`)
    return 0
  }

  const handler = COMMANDS[command]
  if (!handler) {
    process.stderr.write(`atlas: unknown command "${command}"\n\n${USAGE}`)
    return 1
  }

  const rest = args.slice(1)
  // Subcommand --help / -h: print usage and exit 0 without executing
  // (avoids `atlas build --help` running a real build, `atlas stamp --help`
  // erroring for missing slugs, etc.).
  if (rest.includes('--help') || rest.includes('-h')) {
    process.stdout.write(USAGE)
    return 0
  }

  if (command !== 'init' && isKillSwitched(process.cwd())) {
    return 0
  }

  // SessionStart must stay free of telemetry I/O.
  const skipTrack = command === 'telemetry' || (command === 'status' && rest.includes('--hook'))

  let exitCode = 0
  try {
    exitCode = handler(rest) ?? 0
  } catch (err) {
    exitCode = 1
    throw err
  } finally {
    if (!skipTrack) {
      try {
        const cwd = process.cwd()
        const repoRoot = findRepoRoot(cwd)
        let repoConfig = null
        let vault = null
        if (repoRoot) {
          repoConfig = loadConfig(repoRoot, { stderr: { write: () => {} } })
          const vaultDir = findVaultDir(repoRoot)
          vault = cheapVaultCounts(vaultDir, repoConfig)
        }
        const enabled = resolveTelemetryEnabled({
          argv: process.argv,
          repoConfig,
        })
        trackCommand({
          cmd: command,
          argv: rest,
          exit: typeof exitCode === 'number' ? exitCode : 0,
          ms: Date.now() - t0,
          repoRoot,
          vault,
          enabled,
          processArgv: process.argv,
          repoConfig,
        })
      } catch {
        // never break the CLI for telemetry
      }
    }
  }

  return typeof exitCode === 'number' ? exitCode : 0
}

process.exit(main(process.argv))
