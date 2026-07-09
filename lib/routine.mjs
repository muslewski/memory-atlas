/**
 * `atlas routine [name]` — prints a self-contained maintenance-prompt
 * template with its cadence and a live counts footer substituted in. A
 * routine is a PROMPT, never scheduled infrastructure: the human runs it
 * by hand, or schedules it with their own tool (Claude Code routines, cron,
 * whatever) — this package never triggers anything itself.
 *
 * Lookup is a fallback chain: the vault's own `<folders.templates>/routines/`
 * first (so a repo can add or override routines), then this package's
 * built-in `templates/routines/` — a vault-level routine shadows a
 * built-in of the same name.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig } from './config.mjs'
import { findRepoRoot, findVaultDir } from './detect.mjs'
import { computeStatusSummary } from './status.mjs'

const PACKAGE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const BUILTIN_ROUTINES_DIR = path.join(PACKAGE_ROOT, 'templates', 'routines')

function vaultRoutinesDir(vaultDir, config) {
  return path.join(vaultDir, config.folders.templates, 'routines')
}

function listRoutineNames(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.replace(/\.md$/, ''))
    .sort()
}

/**
 * @param {string[]} argv `argv[0]`, if present, is the routine name
 * @param {{ cwd?: string, stdout?: { write: Function }, stderr?: { write: Function } }} [opts]
 * @returns {number} process exit code
 */
export function runRoutine(argv, opts = {}) {
  const cwd = opts.cwd ?? process.cwd()
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr

  const repoRoot = findRepoRoot(cwd)
  if (!repoRoot) {
    stderr.write('atlas routine: no git repository found above the current directory\n')
    return 1
  }
  const vaultDir = findVaultDir(repoRoot)
  if (!vaultDir) {
    stderr.write('atlas routine: no Atlas vault found — run `atlas init` first\n')
    return 1
  }

  const config = loadConfig(repoRoot)
  const vaultRoutines = vaultRoutinesDir(vaultDir, config)
  const name = argv[0]

  if (!name) {
    const seen = new Set()
    const listing = []
    for (const n of listRoutineNames(vaultRoutines)) {
      seen.add(n)
      listing.push(`  ${n} (vault)`)
    }
    for (const n of listRoutineNames(BUILTIN_ROUTINES_DIR)) {
      if (seen.has(n)) continue
      listing.push(`  ${n} (built-in)`)
    }
    if (listing.length === 0) {
      stdout.write('No routines available.\n')
      return 0
    }
    stdout.write('Available routines:\n')
    for (const line of listing) stdout.write(`${line}\n`)
    return 0
  }

  const vaultFile = path.join(vaultRoutines, `${name}.md`)
  const builtinFile = path.join(BUILTIN_ROUTINES_DIR, `${name}.md`)
  const file = fs.existsSync(vaultFile)
    ? vaultFile
    : fs.existsSync(builtinFile)
      ? builtinFile
      : null
  if (!file) {
    stderr.write(`atlas routine: unknown routine "${name}"\n`)
    return 1
  }

  const cadenceDays = config.routines?.cadenceDays ?? 7
  const template = fs.readFileSync(file, 'utf8').replaceAll('{{CADENCE_DAYS}}', String(cadenceDays))

  const summary = computeStatusSummary(repoRoot, vaultDir, config)
  const footer =
    `\n---\n` +
    `Live counts (as of now): ${summary.zoneCount} zones (${summary.seededCount} seeded) · ` +
    `⚠ ${summary.staleCount} stale · ⚠ ${summary.openDebt} open debt\n`

  stdout.write(template)
  stdout.write(footer)
  return 0
}
