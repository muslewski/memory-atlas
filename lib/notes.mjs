/**
 * Vault walking + note loading. Turns `.md` files on disk into the plain
 * note objects `lib/validate.mjs`'s pure core consumes, and assembles the
 * vault-wide note-id set the graph pass resolves `[[wikilinks]]` against.
 */

import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_FOLDERS, DEFAULT_RETRIEVAL } from './config.mjs'
import { parseFrontmatter } from './frontmatter.mjs'
import { isSafeVaultRel, resolveInside } from './paths.mjs'
import { noteIdAliases } from './validate.mjs'

const ALWAYS_SKIP_DIRS = new Set(['visuals'])

function noteIdFromFilename(filename) {
  return filename.replace(/\.md$/, '')
}

/**
 * Load one note file. On a frontmatter parse failure, non-zone notes
 * gracefully degrade to a stub `{ id, stub: true }` so the note's slug
 * still enters the note-id set (mirrors the origin generator's behavior).
 * Zone files are the one exception: a parse failure there is a hard check
 * error, since a zone card that can't even be read can't be verified.
 *
 * @param {string} filePath
 * @param {{ isZone?: boolean }} [opts]
 */
function loadNote(filePath, opts = {}) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const id = noteIdFromFilename(path.basename(filePath))
  try {
    const { data, body } = parseFrontmatter(raw)
    return { id, file: filePath, body, ...data }
  } catch (err) {
    if (opts.isZone === true) {
      throw new Error(`zone ${id}: unparseable frontmatter (${err.message})`)
    }
    return { id, file: filePath, stub: true }
  }
}

/**
 * Flat (non-recursive) `.md` read of `dir`. Returns `[]` if `dir` is absent.
 *
 * @param {string} dir
 * @param {{ isZone?: boolean }} [opts]
 * @returns {Array<Record<string, unknown>>}
 */
export function readNotes(dir, opts = {}) {
  if (!fs.existsSync(dir)) return []
  let stat
  try {
    stat = fs.statSync(dir)
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? err.code : ''
    throw new Error(
      `cannot read notes directory ${dir}${code ? ` (${code})` : ''}: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
  if (!stat.isDirectory()) {
    throw new Error(`notes path is not a directory: ${dir}`)
  }
  const notes = []
  let names
  try {
    names = fs.readdirSync(dir).sort()
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? err.code : ''
    throw new Error(
      `cannot readdir ${dir}${code ? ` (${code})` : ''}: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
  for (const name of names) {
    if (!name.endsWith('.md')) continue
    const full = path.join(dir, name)
    let entStat
    try {
      entStat = fs.lstatSync(full)
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? err.code : ''
      if (opts.isZone === true) {
        throw new Error(
          `zone ${name.replace(/\.md$/, '')}: cannot stat (${code || (err instanceof Error ? err.message : String(err))})`,
        )
      }
      continue
    }
    if (entStat.isSymbolicLink()) {
      // Do not follow zone/note symlinks that could escape; only accept regular files.
      try {
        entStat = fs.statSync(full)
      } catch (err) {
        const code = err && typeof err === 'object' && 'code' in err ? err.code : ''
        if (opts.isZone === true) {
          throw new Error(
            `zone ${name.replace(/\.md$/, '')}: broken or looping symlink (${code || 'ELOOP'})`,
          )
        }
        continue
      }
    }
    if (!entStat.isFile()) continue
    try {
      notes.push(loadNote(full, opts))
    } catch (err) {
      if (opts.isZone === true) throw err
      // non-zone: loadNote already degrades to stub on parse failure
      throw err
    }
  }
  return notes
}

/**
 * Recursive `.md` read of `dir`, skipping `visuals/` and any directory name
 * listed in `opts.exclude`. Returns `[]` if `dir` is absent.
 *
 * @param {string} dir
 * @param {{ isZone?: boolean, exclude?: Set<string> }} [opts]
 * @returns {Array<Record<string, unknown>>}
 */
export function readNotesDeep(dir, opts = {}) {
  if (!fs.existsSync(dir)) return []
  const exclude = opts.exclude ?? new Set()
  const notes = []

  const walk = (d) => {
    for (const name of fs.readdirSync(d).sort()) {
      const full = path.join(d, name)
      const stat = fs.statSync(full)
      if (stat.isDirectory()) {
        if (ALWAYS_SKIP_DIRS.has(name) || exclude.has(name)) continue
        walk(full)
      } else if (name.endsWith('.md')) {
        notes.push(loadNote(full, opts))
      }
    }
  }
  walk(dir)
  return notes
}

/**
 * Load the full vault: zones, flows, decisions, specs, plans, ideas, debt,
 * pillars, programs, and (when enabled) reference, archive, reports, drafts
 * — plus the vault-wide note-id set (basenames + date-stripped aliases) the
 * graph pass resolves links against. Optional module directories are only
 * walked when enabled in `config.modules`. Every vault-relative directory is
 * resolved through `config.folders` (defaults from `./config.mjs` when a
 * partial/absent config is passed) — this is the folder-remapping seam:
 * nothing here may join a vault path by string literal.
 *
 * @param {string} vaultDir
 * @param {Record<string, unknown>} [config]
 */
export function loadVault(vaultDir, config = {}) {
  const modules = config.modules ?? {}
  const folders = config.folders ?? DEFAULT_FOLDERS
  const excludeFromSearch =
    config.retrieval?.excludeFromSearch ?? DEFAULT_RETRIEVAL.excludeFromSearch
  const exclude = new Set(excludeFromSearch.map((p) => p.replace(/\/$/, '')))

  // Refuse folder remaps that escape the vault (e.g. folders.zones: '../outside').
  const zonesRel = folders.zones ?? DEFAULT_FOLDERS.zones
  if (!isSafeVaultRel(zonesRel)) {
    throw new Error(`config folders.zones escapes the vault: "${zonesRel}"`)
  }
  const zonesDir = resolveInside(vaultDir, zonesRel)
  const zones = readNotes(zonesDir, { isZone: true })
  const flows = modules.flows ? readNotes(path.join(vaultDir, folders.flows)) : []
  const decisions = readNotes(path.join(vaultDir, folders.decisions))
  const specs = readNotesDeep(path.join(vaultDir, folders.specs), { exclude })
  const plans = readNotesDeep(path.join(vaultDir, folders.plans), { exclude })
  const ideas = readNotes(path.join(vaultDir, folders.ideas))
  const debt = readNotes(path.join(vaultDir, folders.techDebt))
  const pillars = modules.vision ? readNotes(path.join(vaultDir, folders.vision)) : []
  const programs = modules.programs
    ? readNotesDeep(path.join(vaultDir, folders.programs), { exclude })
    : []
  // Optional modules (SPEC.md §4): only walk when enabled. archive is deep
  // (retired spec/plan trees); reference/reports/drafts are flat files.
  const reference = modules.reference ? readNotes(path.join(vaultDir, folders.reference)) : []
  const archive = modules.archive
    ? readNotesDeep(path.join(vaultDir, folders.archive), { exclude })
    : []
  const reports = modules.reports ? readNotes(path.join(vaultDir, folders.reports)) : []
  const drafts = modules.drafts ? readNotes(path.join(vaultDir, folders.drafts)) : []
  const topLevel = readNotes(vaultDir)

  const all = [
    ...zones,
    ...flows,
    ...decisions,
    ...specs,
    ...plans,
    ...ideas,
    ...debt,
    ...pillars,
    ...programs,
    ...reference,
    ...archive,
    ...reports,
    ...drafts,
    ...topLevel,
  ]

  const noteIds = new Set()
  for (const note of all) {
    for (const alias of noteIdAliases(note.id)) noteIds.add(alias)
  }

  return {
    zones,
    flows,
    decisions,
    specs,
    plans,
    ideas,
    debt,
    pillars,
    programs,
    reference,
    archive,
    reports,
    drafts,
    noteIds,
  }
}
