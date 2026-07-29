/**
 * `atlas adopt` — deterministic brownfield onboarding for vaults that already
 * exist (wikilink zones → bare slugs, zone honesty, debt type, folder renames,
 * config seed). Dry-run first; never pre-stamps verifiedAt with a git SHA.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_FOLDERS, loadConfig } from './config.mjs'
import { findRepoRoot, findVaultDir } from './detect.mjs'
import { parseFrontmatter, setFrontmatterField } from './frontmatter.mjs'

const PACKAGE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const CONFIG_TEMPLATE = path.join(PACKAGE_ROOT, 'templates', 'config', 'atlas.config.json')

const NEXT_STEPS =
  'next: atlas wire all && atlas migrate --write, review unclassified notes with the atlas-adopt skill, then verify cards before any stamp — adopted zones stay unverified until reviewed'

/**
 * Strip a wikilink / quotes wrapper from a zone entry token.
 * `[[auth]]` / `"[[auth]]"` / `auth` / `"auth"` → `auth`
 * @param {string} raw
 * @returns {string}
 */
function bareSlug(raw) {
  let s = String(raw).trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim()
  }
  const m = s.match(/^\[\[([^\]]+)\]\]$/)
  if (m) return m[1].trim()
  return s
}

/**
 * Extract zone slug tokens from a frontmatter `zones` value (parsed or raw line forms).
 * @param {unknown} zones
 * @returns {string[] | null} null when field absent / unusable
 */
function extractZoneSlugs(zones) {
  if (zones === undefined || zones === null || zones === '') return null
  if (Array.isArray(zones)) return zones.map((z) => bareSlug(z)).filter(Boolean)
  if (typeof zones === 'string') {
    // e.g. leftover mis-parse or single slug
    const s = zones.trim()
    if (!s) return []
    // split on commas for "[[a]], [[b]]" style if still a string
    return s
      .split(',')
      .map((p) => bareSlug(p))
      .filter(Boolean)
  }
  return null
}

/**
 * Find frontmatter fence bounds in `text`. Returns { start, end } line indices
 * of the two `---` fences, or null.
 * @param {string[]} lines
 * @returns {{ start: number, end: number } | null}
 */
function fenceBounds(lines) {
  let start = -1
  let end = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (start === -1) start = i
      else {
        end = i
        break
      }
    }
  }
  if (start === -1 || end === -1) return null
  return { start, end }
}

/**
 * Rewrite the `zones:` field in frontmatter to a bare-slug form.
 * Prefer inline `[a, b]` when the original was a single-line value;
 * block list when the original was a multi-line block array.
 *
 * @param {string} text
 * @returns {{ changed: boolean, text: string, details: string[] }}
 */
export function fixDecisionZones(text) {
  const details = []
  let data
  try {
    data = parseFrontmatter(text).data
  } catch {
    return { changed: false, text, details }
  }

  if (!('zones' in data)) {
    return { changed: false, text, details }
  }

  const lines = text.split('\n')
  const fence = fenceBounds(lines)
  if (!fence) return { changed: false, text, details }

  // Locate the zones: key line inside the fence
  let zonesLine = -1
  for (let i = fence.start + 1; i < fence.end; i++) {
    if (/^zones\s*:/.test(lines[i])) {
      zonesLine = i
      break
    }
  }
  if (zonesLine === -1) return { changed: false, text, details }

  const keyLine = lines[zonesLine]
  const afterColon = keyLine.replace(/^zones\s*:\s*/, '')
  const isBlock =
    afterColon.trim() === '' && zonesLine + 1 < fence.end && /^\s+-\s/.test(lines[zonesLine + 1])

  /** @type {string[]} */
  let slugs
  /** @type {number} last line index inclusive that belongs to zones field */
  let endLine = zonesLine

  if (isBlock) {
    const items = []
    let j = zonesLine + 1
    while (j < fence.end && /^\s+-\s/.test(lines[j])) {
      const itemRaw = lines[j].replace(/^\s+-\s*/, '')
      items.push(bareSlug(itemRaw))
      endLine = j
      j++
    }
    slugs = items.filter(Boolean)
  } else {
    // Single-line forms:
    //   zones: [auth, data-spine]
    //   zones: ["[[auth]]", "[[data-spine]]"]
    //   zones: [[auth]], [[data-spine]]   (syndcast — mis-parses as inline array)
    //   zones: [[auth]]
    const rest = afterColon.trim()
    // Prefer parse result when it yields sensible bare slugs after stripping;
    // also re-tokenize the raw rest for the syndcast double-bracket form.
    const fromParse = extractZoneSlugs(data.zones) ?? []
    // For syndcast `[[a]], [[b]]` the parser yields broken tokens; recover from raw.
    const wikilinkMatches = [...rest.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1].trim())
    if (wikilinkMatches.length > 0) {
      slugs = wikilinkMatches
    } else if (rest.startsWith('[') && rest.endsWith(']')) {
      const inner = rest.slice(1, -1).trim()
      slugs = inner
        ? inner
            .split(',')
            .map((p) => bareSlug(p))
            .filter(Boolean)
        : []
    } else if (rest) {
      slugs = [bareSlug(rest)].filter(Boolean)
    } else {
      slugs = fromParse
    }
    endLine = zonesLine
  }

  // Already bare?
  let alreadyBare = false
  if (isBlock) {
    alreadyBare = true
    for (let j = zonesLine + 1; j <= endLine; j++) {
      const itemRaw = lines[j].replace(/^\s+-\s*/, '').trim()
      // bare = no quotes wrapping wikilink and no [[ ]]
      if (/\[\[/.test(itemRaw) || (itemRaw.startsWith('"') && itemRaw.includes('[['))) {
        alreadyBare = false
        break
      }
      // quoted bare slug "auth" is fine but we normalize to unquoted bare
      const bare = bareSlug(itemRaw)
      if (itemRaw !== bare && itemRaw !== `"${bare}"` && itemRaw !== `'${bare}'`) {
        alreadyBare = false
        break
      }
      // if quoted bare slug, treat as needing normalize only if we want unquoted
      // Plan acceptance: bare slug strings — unquoted block items are ideal.
      if (itemRaw.startsWith('"') || itemRaw.startsWith("'") || /\[\[/.test(itemRaw)) {
        alreadyBare = false
        break
      }
    }
  } else {
    const rest = afterColon.trim()
    // Canonical inline form: [slug, slug] with bare unquoted slugs
    const canonical = `[${slugs.join(', ')}]`
    alreadyBare = rest === canonical
  }

  if (alreadyBare) {
    return { changed: false, text, details }
  }

  // Rewrite
  const next = [...lines]
  if (isBlock) {
    // Keep block form with bare unquoted items
    const indentMatch = lines[zonesLine + 1]?.match(/^(\s+)-\s/)
    const indent = indentMatch ? indentMatch[1] : '  '
    const newBlock = [`zones:`, ...slugs.map((s) => `${indent}- ${s}`)]
    next.splice(zonesLine, endLine - zonesLine + 1, ...newBlock)
  } else {
    next[zonesLine] = `zones: [${slugs.join(', ')}]`
  }

  details.push('zones: wikilink → bare slug')
  return { changed: true, text: next.join('\n'), details }
}

/**
 * Zone cards only: empty/missing verifiedAt → 'unverified'; when that fires
 * and status is active or absent → 'seeded'. Never writes a git SHA.
 *
 * @param {string} text
 * @returns {{ changed: boolean, text: string, details: string[] }}
 */
/**
 * Insert a top-level frontmatter line after the first matching key (prefer
 * order), or right after the opening fence when none match.
 * @param {string} text
 * @param {string} line full line e.g. `verifiedAt: unverified`
 * @param {string[]} afterKeys preferred keys to insert after
 * @returns {string}
 */
function insertFrontmatterLine(text, line, afterKeys = []) {
  const lines = text.split('\n')
  const fence = fenceBounds(lines)
  if (!fence) return text
  let at = fence.start + 1
  for (const key of afterKeys) {
    const re = new RegExp(`^${key}\\s*:`)
    for (let i = fence.start + 1; i < fence.end; i++) {
      if (re.test(lines[i])) {
        at = i + 1
        break
      }
    }
    if (at !== fence.start + 1) break
  }
  lines.splice(at, 0, line)
  return lines.join('\n')
}

/**
 * Find a top-level frontmatter key line index, or -1.
 * @param {string} text
 * @param {string} key
 * @returns {number}
 */
function findFrontmatterKeyLine(text, key) {
  const lines = text.split('\n')
  const fence = fenceBounds(lines)
  if (!fence) return -1
  const re = new RegExp(`^${key}\\s*:`)
  for (let i = fence.start + 1; i < fence.end; i++) {
    if (re.test(lines[i])) return i
  }
  return -1
}

export function fixZoneHonesty(text) {
  const details = []
  let data
  try {
    data = parseFrontmatter(text).data
  } catch {
    return { changed: false, text, details }
  }

  if (data.type !== 'zone') {
    return { changed: false, text, details }
  }

  const verifiedAt = data.verifiedAt
  // Empty/missing OR illegal encoding (ISO date, garbage) → rewrite to unverified.
  // A present-but-invalid stamp is the most damaging legacy path: check rejects
  // it while a naive index would still look "fresh" if left alone.
  const isSha =
    (typeof verifiedAt === 'string' && /^[0-9a-f]{7,40}$/i.test(verifiedAt)) ||
    (typeof verifiedAt === 'number' && Number.isInteger(verifiedAt) && verifiedAt >= 0)
  const isUnverified = verifiedAt === 'unverified'
  const needsVerified =
    verifiedAt === undefined ||
    verifiedAt === null ||
    verifiedAt === '' ||
    (!isUnverified && !isSha)

  if (!needsVerified) {
    return { changed: false, text, details }
  }

  let out = text

  if (findFrontmatterKeyLine(out, 'verifiedAt') >= 0) {
    out = setFrontmatterField(out, 'verifiedAt', 'unverified')
    details.push('verifiedAt → unverified')
  } else {
    out = insertFrontmatterLine(out, 'verifiedAt: unverified', ['status', 'type'])
    details.push('verifiedAt → unverified (inserted)')
  }

  // Re-parse for status decision
  let data2
  try {
    data2 = parseFrontmatter(out).data
  } catch {
    return { changed: details.length > 0, text: out, details }
  }

  const status = data2.status
  if (status === 'active' || status === undefined || status === null || status === '') {
    if (findFrontmatterKeyLine(out, 'status') >= 0) {
      out = setFrontmatterField(out, 'status', 'seeded')
      details.push('status → seeded')
    } else {
      out = insertFrontmatterLine(out, 'status: seeded', ['type'])
      details.push('status → seeded (inserted)')
    }
  }

  if (details.length === 0) return { changed: false, text, details }
  return { changed: true, text: out, details }
}

/**
 * `type: tech-debt` (or quoted debt variants) → canonical `type: debt`.
 * Body occurrences untouched.
 *
 * @param {string} text
 * @returns {{ changed: boolean, text: string, details: string[] }}
 */
export function fixDebtType(text) {
  const details = []
  let data
  try {
    data = parseFrontmatter(text).data
  } catch {
    return { changed: false, text, details }
  }

  const t = data.type
  if (t !== 'tech-debt' && t !== 'debt') {
    return { changed: false, text, details }
  }

  // Check the raw type line — already canonical bare `type: debt`?
  const lines = text.split('\n')
  const fence = fenceBounds(lines)
  if (!fence) return { changed: false, text, details }

  let typeLine = -1
  for (let i = fence.start + 1; i < fence.end; i++) {
    if (/^type\s*:/.test(lines[i])) {
      typeLine = i
      break
    }
  }
  if (typeLine === -1) return { changed: false, text, details }

  const raw = lines[typeLine]
  // Canonical: `type: debt` exactly (optional trailing comment)
  if (/^type:\s*debt(\s*(#.*)?)?$/.test(raw.trimEnd()) && !/^type:\s*["']debt["']/.test(raw)) {
    // also reject tech-debt
    if (!raw.includes('tech-debt')) {
      return { changed: false, text, details }
    }
  }

  // Need rewrite if type is tech-debt or quoted debt
  const needs =
    t === 'tech-debt' ||
    /^type:\s*["']debt["']/.test(raw) ||
    /^type:\s*["']tech-debt["']/.test(raw) ||
    /tech-debt/.test(raw)

  if (!needs && /^type:\s*debt(\s|#|$)/.test(raw)) {
    return { changed: false, text, details }
  }

  if (!needs) {
    return { changed: false, text, details }
  }

  const out = setFrontmatterField(text, 'type', 'debt')
  details.push('type: tech-debt → debt')
  return { changed: true, text: out, details }
}

/**
 * List .md files under `dir` (recursive), returning paths relative to `vaultDir`.
 * @param {string} absDir
 * @param {string} vaultDir
 * @returns {string[]}
 */
function listMdRelative(absDir, vaultDir) {
  if (!fs.existsSync(absDir)) return []
  const out = []
  const walk = (d) => {
    let entries
    try {
      entries = fs.readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(d, ent.name)
      if (ent.isDirectory()) {
        if (ent.name === 'visuals' || ent.name.startsWith('.')) continue
        walk(full)
      } else if (ent.name.endsWith('.md')) {
        out.push(path.relative(vaultDir, full).split(path.sep).join('/'))
      }
    }
  }
  walk(absDir)
  return out
}

/**
 * Whether `rel` (vault-relative posix) is under any configured folder prefix,
 * or is map/index.md, or lives under templates/.
 * @param {string} rel
 * @param {Record<string, string>} folders
 * @returns {boolean}
 */
function isClassifiedPath(rel, folders) {
  const norm = rel.replace(/\\/g, '/')
  if (norm === 'map/index.md') return true
  const templatesDir = (folders.templates || 'templates').replace(/\\/g, '/')
  if (norm === templatesDir || norm.startsWith(`${templatesDir}/`)) return true

  for (const folder of Object.values(folders)) {
    const f = String(folder).replace(/\\/g, '/')
    if (norm === f || norm.startsWith(`${f}/`)) return true
  }
  return false
}

/**
 * Optional modules that get auto-enabled when their folder has ≥1 .md.
 * Plan: reference / archive / reports / drafts only.
 */
const DETECT_MODULES = ['reference', 'archive', 'reports', 'drafts']

/**
 * Plan brownfield adoption — NO writes.
 *
 * @param {string} repoRoot
 * @param {string} vaultDir
 * @param {Record<string, unknown>} config
 * @returns {{ actions: Array<{ action: string, path: string, detail: string }>, unclassified: string[] }}
 */
export function planAdoption(repoRoot, vaultDir, config) {
  const folders = { ...DEFAULT_FOLDERS, ...(config.folders || {}) }
  /** @type {Array<{ action: string, path: string, detail: string, _apply?: object }>} */
  const actions = []

  // --- rename human-drafts/ → folders.drafts (planned before config so drafts can be detected) ---
  const draftsRel = (folders.drafts || 'drafts').replace(/\\/g, '/')
  const humanDraftsAbs = path.join(vaultDir, 'human-drafts')
  const draftsAbs = path.join(vaultDir, draftsRel)
  const willRenameHumanDrafts =
    fs.existsSync(humanDraftsAbs) &&
    fs.statSync(humanDraftsAbs).isDirectory() &&
    !fs.existsSync(draftsAbs)

  // --- create atlas.config.json ---
  const configPath = path.join(repoRoot, 'atlas.config.json')
  if (!fs.existsSync(configPath)) {
    const detected = []
    for (const mod of DETECT_MODULES) {
      const folderKey = mod === 'drafts' ? 'drafts' : mod
      const relFolder = folders[folderKey] || DEFAULT_FOLDERS[folderKey]
      if (!relFolder) continue
      const abs = path.join(vaultDir, relFolder)
      const mds = listMdRelative(abs, vaultDir)
      if (mds.length > 0) detected.push(mod)
    }
    // human-drafts → drafts rename will land content in folders.drafts
    if (willRenameHumanDrafts && !detected.includes('drafts')) {
      const humanMd = listMdRelative(humanDraftsAbs, vaultDir)
      if (humanMd.length > 0) detected.push('drafts')
    }
    const detail =
      detected.length > 0
        ? `seed config; enable modules: ${detected.join(', ')}`
        : 'seed config; no optional modules detected'
    actions.push({
      action: 'create',
      path: 'atlas.config.json',
      detail,
      _apply: { kind: 'createConfig', detected, vaultDir },
    })
  }

  if (willRenameHumanDrafts) {
    const vaultName = path.relative(repoRoot, vaultDir).split(path.sep).join('/')
    const fromPath = vaultName ? `${vaultName}/human-drafts` : 'human-drafts'
    actions.push({
      action: 'rename',
      path: fromPath,
      detail: `→ ${draftsRel}`,
      _apply: { kind: 'rename', from: humanDraftsAbs, to: draftsAbs },
    })
  }

  // Collect unclassified candidates first (needed for fixDebtType scope)
  const allMd = listMdRelative(vaultDir, vaultDir)
  const unclassified = allMd.filter((rel) => !isClassifiedPath(rel, folders))

  /**
   * @param {string} absFile
   * @param {string} vaultRel
   * @param {Array<(t: string) => { changed: boolean, text: string, details: string[] }>} transforms
   */
  function planFile(absFile, vaultRel, transforms) {
    let text
    try {
      text = fs.readFileSync(absFile, 'utf8')
    } catch {
      return
    }
    const fired = []
    let current = text
    for (const fn of transforms) {
      const r = fn(current)
      if (r.changed) {
        fired.push(...r.details)
        current = r.text
      }
    }
    if (fired.length === 0) return
    const vaultName = path.relative(repoRoot, vaultDir).split(path.sep).join('/')
    const repoRel = vaultName ? `${vaultName}/${vaultRel}` : vaultRel
    actions.push({
      action: 'update',
      path: repoRel,
      detail: fired.join('; '),
      _apply: { kind: 'update', abs: absFile, text: current },
    })
  }

  // fixDecisionZones over folders.decisions
  const decisionsDir = path.join(vaultDir, folders.decisions || 'map/decisions')
  for (const rel of listMdRelative(decisionsDir, vaultDir)) {
    planFile(path.join(vaultDir, rel), rel, [fixDecisionZones])
  }

  // fixZoneHonesty over folders.zones
  const zonesDir = path.join(vaultDir, folders.zones || 'map/zones')
  for (const rel of listMdRelative(zonesDir, vaultDir)) {
    planFile(path.join(vaultDir, rel), rel, [fixZoneHonesty])
  }

  // fixDebtType over folders.techDebt + unclassified
  const debtDir = path.join(vaultDir, folders.techDebt || 'tech-debt')
  const debtRels = new Set(listMdRelative(debtDir, vaultDir))
  for (const rel of debtRels) {
    planFile(path.join(vaultDir, rel), rel, [fixDebtType])
  }
  for (const rel of unclassified) {
    if (debtRels.has(rel)) continue
    planFile(path.join(vaultDir, rel), rel, [fixDebtType])
  }

  // Public actions without _apply (but keep _apply for Task 2 — strip in export? plan says actions shape without _apply)
  // Task 1 interface: { actions, unclassified } — tests check action/path/detail.
  // Keeping _apply is fine for Task 2; JSON export will strip it.
  const publicActions = actions.map(({ action, path: p, detail, _apply }) => {
    const row = { action, path: p, detail }
    if (_apply) row._apply = _apply
    return row
  })

  // unclassified paths as vault-relative (or repo-relative?). Plan: `? <path>` —
  // use vault-relative for clarity; tests accept either.
  const vaultName = path.relative(repoRoot, vaultDir).split(path.sep).join('/')
  const unclassifiedOut = unclassified.map((rel) => (vaultName ? `${vaultName}/${rel}` : rel))

  return { actions: publicActions, unclassified: unclassifiedOut }
}

/**
 * Strip internal `_apply` payloads for public/JSON reports.
 * @param {Array<{ action: string, path: string, detail: string, _apply?: unknown }>} actions
 */
function publicActionsOnly(actions) {
  return actions.map(({ action, path: p, detail }) => ({ action, path: p, detail }))
}

/**
 * Apply a planned action to the filesystem.
 * @param {{ action: string, path: string, detail: string, _apply?: object }} action
 * @param {string} repoRoot
 * @param {string} vaultDir
 */
function applyAction(action, repoRoot, vaultDir) {
  const apply = action._apply
  if (!apply) return

  if (apply.kind === 'createConfig') {
    const vaultRel = path.relative(repoRoot, vaultDir).split(path.sep).join('/') || '.'
    let template
    try {
      template = fs.readFileSync(CONFIG_TEMPLATE, 'utf8')
    } catch {
      // Minimal fallback if package templates are unavailable
      template = JSON.stringify(
        {
          version: 1,
          enabled: true,
          vaultDir: '{{VAULT}}',
          modules: {
            flows: false,
            programs: false,
            vision: false,
            reference: false,
            archive: false,
            reports: false,
            backlog: false,
            drafts: false,
          },
        },
        null,
        2,
      )
    }
    const configObj = JSON.parse(template.replace('{{VAULT}}', vaultRel))
    configObj.vaultDir = vaultRel
    if (!configObj.modules || typeof configObj.modules !== 'object') {
      configObj.modules = {}
    }
    for (const mod of apply.detected || []) {
      configObj.modules[mod] = true
    }
    fs.writeFileSync(
      path.join(repoRoot, 'atlas.config.json'),
      `${JSON.stringify(configObj, null, 2)}\n`,
    )
    return
  }

  if (apply.kind === 'rename') {
    fs.mkdirSync(path.dirname(apply.to), { recursive: true })
    fs.renameSync(apply.from, apply.to)
    return
  }

  if (apply.kind === 'update') {
    fs.writeFileSync(apply.abs, apply.text)
  }
}

/**
 * Print the adoption report (counts + unclassified + next steps).
 * @param {{ actions: Array<{ action: string }>, unclassified: string[] }} plan
 * @param {(msg: string) => void} log
 */
function printWriteReport(plan, log) {
  const counts = { create: 0, rename: 0, update: 0 }
  for (const a of plan.actions) {
    if (a.action in counts) counts[a.action]++
  }
  log(
    `adopted: ${counts.create} create, ${counts.rename} rename, ${counts.update} update` +
      (plan.unclassified.length ? `; ${plan.unclassified.length} unclassified` : ''),
  )
  if (plan.unclassified.length === 0) {
    log('✓ nothing unclassified')
  } else {
    log('needs classification (run the atlas-adopt skill):')
    for (const p of plan.unclassified) log(`? ${p}`)
  }
  log(NEXT_STEPS)
}

/**
 * `atlas adopt` — dry-run by default; `--write` applies; `--json` machine report.
 *
 * @param {string[]} argv
 * @param {{
 *   cwd?: string,
 *   stdout?: { write: Function },
 *   stderr?: { write: Function },
 * }} [opts]
 * @returns {number}
 */
export function runAdopt(argv, opts = {}) {
  const cwd = opts.cwd ?? process.cwd()
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const log = (msg) => stdout.write(`${msg}\n`)
  const err = (msg) => stderr.write(`${msg}\n`)

  const write = argv.includes('--write')
  const json = argv.includes('--json')

  const repoRoot = findRepoRoot(cwd)
  if (!repoRoot) {
    err('atlas: no git repository found above the current directory')
    return 1
  }
  const vaultDir = findVaultDir(repoRoot)
  if (!vaultDir) {
    err('atlas: no Atlas vault found — run `atlas init` first')
    return 1
  }

  const config = loadConfig(repoRoot, { stderr })
  const plan = planAdoption(repoRoot, vaultDir, config)

  if (plan.actions.length === 0) {
    if (json) {
      log(JSON.stringify({ actions: [], unclassified: plan.unclassified }))
    } else {
      log('✓ nothing to adopt — vault already conforms')
    }
    return 0
  }

  if (!write) {
    if (json) {
      log(
        JSON.stringify({
          actions: publicActionsOnly(plan.actions),
          unclassified: plan.unclassified,
        }),
      )
    } else {
      for (const a of plan.actions) {
        log(`${a.action} ${a.path} — ${a.detail}`)
      }
      if (plan.unclassified.length === 0) {
        log('✓ nothing unclassified')
      } else {
        log('needs classification (run the atlas-adopt skill):')
        for (const p of plan.unclassified) log(`? ${p}`)
      }
      log('dry run — re-run with --write to apply')
    }
    return 0
  }

  // --write: config create → folder rename → file transforms (plan order already)
  for (const a of plan.actions) {
    try {
      applyAction(a, repoRoot, vaultDir)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      err(`atlas adopt: failed to ${a.action} ${a.path}: ${msg}`)
      return 1
    }
  }

  if (json) {
    log(
      JSON.stringify({
        actions: publicActionsOnly(plan.actions),
        unclassified: plan.unclassified,
      }),
    )
  } else {
    printWriteReport(plan, log)
  }
  return 0
}
