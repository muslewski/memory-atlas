/**
 * Vault walking + note loading. Turns `.md` files on disk into the plain
 * note objects `lib/validate.mjs`'s pure core consumes, and assembles the
 * vault-wide note-id set the graph pass resolves `[[wikilinks]]` against.
 */

import fs from 'node:fs'
import path from 'node:path'
import { parseFrontmatter } from './frontmatter.mjs'
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
  const notes = []
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith('.md')) continue
    const full = path.join(dir, name)
    if (!fs.statSync(full).isFile()) continue
    notes.push(loadNote(full, opts))
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
 * Read `atlas.config.json` from the repo root. Returns `{}` on any failure
 * (missing file, invalid JSON) — callers must tolerate an absent config,
 * defaulting every optional feature off.
 *
 * @param {string} repoRoot
 * @returns {Record<string, unknown>}
 */
export function loadConfig(repoRoot) {
  try {
    const raw = fs.readFileSync(path.join(repoRoot, 'atlas.config.json'), 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/**
 * Load the full vault: zones, flows, decisions, specs, plans, ideas, debt,
 * pillars, programs, plus the vault-wide note-id set (basenames + date-
 * stripped aliases) the graph pass resolves links against. Optional module
 * directories are only walked when enabled in `config.modules`.
 *
 * @param {string} vaultDir
 * @param {Record<string, unknown>} [config]
 */
export function loadVault(vaultDir, config = {}) {
  const modules = config.modules ?? {}
  const excludeFromSearch = config.retrieval?.excludeFromSearch ?? ['drafts/', 'visuals/']
  const exclude = new Set(excludeFromSearch.map((p) => p.replace(/\/$/, '')))

  const zones = readNotes(path.join(vaultDir, 'map', 'zones'), { isZone: true })
  const flows = modules.flows ? readNotes(path.join(vaultDir, 'map', 'flows')) : []
  const decisions = readNotes(path.join(vaultDir, 'map', 'decisions'))
  const specs = readNotesDeep(path.join(vaultDir, 'specs'), { exclude })
  const plans = readNotesDeep(path.join(vaultDir, 'plans'), { exclude })
  const ideas = readNotes(path.join(vaultDir, 'ideas'))
  const debt = readNotes(path.join(vaultDir, 'tech-debt'))
  const pillars = modules.vision ? readNotes(path.join(vaultDir, 'vision')) : []
  const programs = modules.programs
    ? readNotesDeep(path.join(vaultDir, 'programs'), { exclude })
    : []
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
    ...topLevel,
  ]

  const noteIds = new Set()
  for (const note of all) {
    for (const alias of noteIdAliases(note.id)) noteIds.add(alias)
  }

  return { zones, flows, decisions, specs, plans, ideas, debt, pillars, programs, noteIds }
}
