/**
 * The ledger linter: walks `specs/` and `plans/` (recursively) — and
 * `reports/` when the optional module is enabled — and checks each note's
 * frontmatter against SPEC.md §3 (universal fields) and §4 (per-type
 * lifecycles).
 *
 * MAINTENANCE: the lifecycle enums below live in TWO places — SPEC.md §4
 * (prose) and LIFECYCLES here (code). Any lifecycle change MUST touch both
 * files in the same commit, or this linter silently drifts from the spec it
 * exists to enforce.
 */

import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_FOLDERS } from './config.mjs'
import { parseFrontmatter } from './frontmatter.mjs'

export const LIFECYCLES = {
  spec: ['draft', 'approved', 'planned', 'superseded'],
  plan: ['draft', 'ready', 'executing', 'done', 'abandoned'],
  debt: ['open', 'done', 'wontfix'],
  idea: ['active', 'promoted', 'archived'],
  pillar: ['active', 'realized', 'archived'],
  program: ['planned', 'active', 'complete', 'shipped', 'deferred'],
  zone: ['seeded', 'active', 'unmounted'],
  flow: ['active', 'unmounted'],
  decision: ['active', 'unmounted'],
  // A report is frozen at birth; corrections are new dated files (SPEC reports contract).
  report: ['snapshot'],
}

function walkMarkdown(dir) {
  const files = []
  const walk = (d) => {
    for (const name of fs.readdirSync(d).sort()) {
      const full = path.join(d, name)
      const stat = fs.statSync(full)
      if (stat.isDirectory()) {
        walk(full)
      } else if (name.endsWith('.md')) {
        files.push(full)
      }
    }
  }
  walk(dir)
  return files
}

/**
 * @param {string} vaultDir
 * @param {{ zoneSlugs?: Set<string>, folders?: { specs?: string, plans?: string, reports?: string }, reports?: boolean }} [opts]
 *   `zoneSlugs`: existing zone ids, for the `zones:` entry check — an
 *   empty/absent set means every non-empty `zones:` entry is flagged, which
 *   is the correct conservative behavior. `folders`: vault-relative paths
 *   for the sections this linter walks, resolved through `config.folders`
 *   by callers — defaults to the standard `specs`/`plans` layout when
 *   absent. `reports`: when true, also walk `folders.reports` (optional
 *   module; off by default).
 * @returns {{ violations: string[], total: number, clean: number, coverage: number }}
 */
export function lintLedger(vaultDir, opts = {}) {
  const zoneSlugs = opts.zoneSlugs ?? new Set()
  const folders = opts.folders ?? DEFAULT_FOLDERS
  const violations = []
  let total = 0
  let clean = 0

  const sections = [folders.specs, folders.plans]
  if (opts.reports === true && folders.reports) sections.push(folders.reports)
  for (const sectionDir of sections) {
    const dir = path.join(vaultDir, sectionDir)
    if (!fs.existsSync(dir)) continue

    for (const file of walkMarkdown(dir)) {
      total += 1
      const rel = path.relative(vaultDir, file)
      const raw = fs.readFileSync(file, 'utf8')

      let data
      try {
        ;({ data } = parseFrontmatter(raw))
      } catch (err) {
        violations.push(`${rel}: unparseable frontmatter (${err.message})`)
        continue
      }

      let fileOk = true

      const type = data.type
      if (typeof type !== 'string' || !LIFECYCLES[type]) {
        violations.push(`${rel}: unknown type "${type}"`)
        fileOk = false
      } else if (!LIFECYCLES[type].includes(data.status)) {
        violations.push(
          `${rel}: status "${data.status}" not in ${type}'s lifecycle (${LIFECYCLES[type].join(' → ')})`,
        )
        fileOk = false
      }

      if (typeof data.summary !== 'string' || data.summary.trim() === '') {
        violations.push(`${rel}: summary must be a non-empty string`)
        fileOk = false
      }

      if (data.zones !== undefined) {
        if (!Array.isArray(data.zones)) {
          violations.push(`${rel}: zones must be an array`)
          fileOk = false
        } else {
          for (const slug of data.zones) {
            if (!zoneSlugs.has(slug)) {
              violations.push(`${rel}: zones entry "${slug}" is not an existing zone slug`)
              fileOk = false
            }
          }
        }
      }

      if (fileOk) clean += 1
    }
  }

  const coverage = total === 0 ? 100 : Math.round((clean / total) * 1000) / 10
  return { violations, total, clean, coverage }
}
