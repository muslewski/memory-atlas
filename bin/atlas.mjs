#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import fs, { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runAdopt } from '../lib/adopt.mjs'
import { loadConfig } from '../lib/config.mjs'
import { runCorpusChecks } from '../lib/corpus.mjs'
import { findRepoRoot, findVaultDir } from '../lib/detect.mjs'
import { runDoctor } from '../lib/doctor.mjs'
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
import { runWire } from '../lib/wire.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))

const USAGE = `atlas — code-verified knowledge base for a repository

Usage:
  atlas <command> [options]

Commands:
  atlas init [--profile code|operator] [--vault name] [--modules a,b]
                          Scaffold a new Atlas vault (profile defaults modules + glob policy)
  atlas build             Rebuild map/index.md from zone/flow cards
  atlas check [--strict] [--report] [--ledger-only]
                          Verify zone claims, the committed index, and the ledger
  atlas stamp <slug...>   Re-stamp verifiedAt for reviewed zones (no blanket re-stamp)
  atlas search <query>    Search vault markdown (rg-first; grep fallback). Portable retrieval floor.
  atlas status [--hook]   One-line vault health summary (safe as a hook). --hook marks
                          a SessionStart-hook call site, honoring hooks.sessionStartStatus
                          in atlas.config.json; a plain human/script call always prints.
  atlas wire [claude|grok|all]
                          Wire SessionStart hooks + managed CLAUDE.md/AGENTS.md on-ramp
                          blocks (default: all). Idempotent; refuses malformed JSON targets.
  atlas doctor            Dry-run inventory of provenance lockfile, wiring, and on-ramp blocks
  atlas migrate [--write] [--json]
                          Apply pending versioned migrations (dry-run by default; --write to apply)
  atlas adopt [--write] [--json]
                          Normalize an existing (brownfield) vault + adoption report
  atlas routine [name]    Print a maintenance-routine prompt (no name: list available)

Options:
  --help, -h        Show this help
  --version, -v     Show the installed version

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
 * Shared build core used by both `atlas build` and `atlas check`: load
 * config + vault, run validate with real git resolvers, write map/index.md.
 *
 * @param {string} cwd
 * @param {{ write: Function }} stderr
 */
function buildCore(cwd, stderr) {
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

  const indexPath = path.join(vaultDir, 'map', 'index.md')
  fs.mkdirSync(path.dirname(indexPath), { recursive: true })
  fs.writeFileSync(
    indexPath,
    renderIndex(result, {
      specs: vault.specs,
      plans: vault.plans,
      reports: vault.reports,
      decisions: vault.decisions,
    }),
  )

  return { repoRoot, vaultDir, vault, result, indexPath }
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

  const built = buildCore(cwd, stderr)
  if (!built) return 1
  const { result, vault } = built

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

  const diff = spawnSync(
    'git',
    ['diff', '--exit-code', '--', path.join(vaultDir, 'map', 'index.md')],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  )
  if (diff.status !== 0) {
    stderr.write(
      'atlas check: map/index.md is out of date with the committed version — run `atlas build` and commit\n',
    )
    ok = false
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

const COMMANDS = {
  init: (args) => runInit(args, { cwd: process.cwd() }),
  build: (args) => runBuild(args, { cwd: process.cwd() }),
  check: (args) => runCheck(args, { cwd: process.cwd() }),
  stamp: (args) => runStamp(args, { cwd: process.cwd() }),
  search: (args) => runSearch(args, { cwd: process.cwd() }),
  status: (args) => runStatus(args, { cwd: process.cwd() }),
  wire: (args) => runWire(args, { cwd: process.cwd() }),
  doctor: (args) => runDoctor(args, { cwd: process.cwd() }),
  migrate: (args) => runMigrate(args, { cwd: process.cwd() }),
  adopt: (args) => runAdopt(args, { cwd: process.cwd() }),
  routine: (args) => runRoutine(args, { cwd: process.cwd() }),
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

  return handler(rest)
}

process.exit(main(process.argv))
