/**
 * `atlas doctor` — dry-run provenance + wiring inventory.
 * Informational only: never writes, never throws, always exits 0.
 */

import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { BLOCK_BEGIN, BLOCK_END } from './blocks.mjs'
import { loadConfig } from './config.mjs'
import { findRepoRoot } from './detect.mjs'
import { pendingMigrations } from './migrate.mjs'
import { packageVersion, readState, sha256 } from './state.mjs'

const isAtlasStatusHook = (cmd) => typeof cmd === 'string' && /atlas status --hook/.test(cmd)

/**
 * @param {string} filePath
 * @returns {{ present: boolean, malformed?: boolean, hasOurs?: boolean }}
 */
function inspectHookFile(filePath) {
  if (!existsSync(filePath)) return { present: false, hasOurs: false }
  let settings
  try {
    settings = JSON.parse(readFileSync(filePath, 'utf8'))
  } catch {
    return { present: true, malformed: true, hasOurs: false }
  }
  const groups = settings?.hooks?.SessionStart
  if (!Array.isArray(groups)) return { present: true, hasOurs: false }
  const hasOurs = groups.some((g) => (g.hooks || []).some((h) => isAtlasStatusHook(h?.command)))
  return { present: true, hasOurs }
}

/**
 * Extract the on-disk managed block between markers, or null.
 * @param {string} filePath
 * @returns {string | null}
 */
function readBlockOnDisk(filePath) {
  if (!existsSync(filePath)) return null
  const raw = readFileSync(filePath, 'utf8')
  const beginIdx = raw.indexOf(BLOCK_BEGIN)
  const endIdx = raw.indexOf(BLOCK_END)
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) return null
  return raw.slice(beginIdx, endIdx + BLOCK_END.length)
}

/**
 * Map vendored key → absolute path under repoRoot.
 * - `CLAUDE.md#atlas:onramp` → `<root>/CLAUDE.md`
 * - `skills/<name>/SKILL.md` → `<root>/<skillsDir>/<name>/SKILL.md`
 *
 * @param {string} repoRoot
 * @param {string} key
 * @param {string} [skillsDir]
 * @returns {string | null}
 */
function vendoredPath(repoRoot, key, skillsDir = '.claude/skills') {
  if (key.startsWith('skills/')) {
    const rest = key.slice('skills/'.length)
    return path.join(repoRoot, skillsDir, rest)
  }
  const file = key.split('#')[0]
  if (!file) return null
  return path.join(repoRoot, file)
}

/**
 * Content to hash for a vendored key: marker block for on-ramp keys, whole
 * file for skill paths.
 * @param {string} filePath
 * @param {string} key
 * @returns {string | null}
 */
function vendoredContent(filePath, key) {
  if (key.startsWith('skills/')) {
    if (!existsSync(filePath)) return null
    return readFileSync(filePath, 'utf8')
  }
  return readBlockOnDisk(filePath)
}

/**
 * @param {string[]} _argv
 * @param {{ cwd?: string, stdout?: { write: Function }, grokHooksDir?: string, migrations?: unknown[] }} [opts]
 * @returns {number} always 0
 */
export function runDoctor(_argv, opts = {}) {
  const cwd = opts.cwd ?? process.cwd()
  const stdout = opts.stdout ?? process.stdout
  const log = (msg) => stdout.write(`${msg}\n`)

  try {
    const repoRoot = findRepoRoot(cwd) ?? path.resolve(cwd)
    const grokHooksDir = opts.grokHooksDir ?? path.join(homedir(), '.grok', 'hooks')
    const installed = packageVersion()
    const state = readState(repoRoot)

    // lockfile
    if (!state) {
      log('✗ no .atlas-state.json — run atlas wire')
      log(`  version: installed ${installed}`)
    } else {
      log(`✓ lockfile: atlasVersion ${state.atlasVersion ?? '?'}`)

      // version
      if (state.atlasVersion === installed) {
        log(`✓ version: installed ${installed} matches wired`)
      } else {
        log(
          `⚠ update pending (installed ${installed}, wired ${state.atlasVersion}) — run the atlas-update skill`,
        )
      }

      // pending migrations (after version line)
      const pending = pendingMigrations(state, installed, opts.migrations)
      if (pending.length > 0) {
        log(`⚠ ${pending.length} migration(s) pending — run atlas migrate`)
      }

      // claude wiring
      const claudeSettings = path.join(repoRoot, '.claude', 'settings.json')
      const claude = inspectHookFile(claudeSettings)
      if (claude.malformed) {
        log('✗ claude wiring: .claude/settings.json is malformed JSON')
      } else if (claude.hasOurs) {
        log('✓ claude wiring: SessionStart atlas status --hook present')
      } else {
        log('✗ claude wiring: SessionStart atlas status --hook missing')
      }

      // grok wiring
      const grokPath = path.join(grokHooksDir, 'atlas.json')
      const grok = inspectHookFile(grokPath)
      if (grok.malformed) {
        log('✗ grok wiring: atlas.json is malformed JSON')
      } else if (grok.hasOurs) {
        log('✓ grok wiring: global drop-in present')
      } else {
        log('✗ grok wiring: global drop-in missing')
      }

      // config (skills.dir needed for vendored skill path resolution)
      const config = loadConfig(repoRoot, { stderr: { write: () => {} } })
      const skillsDir =
        typeof config.skills?.dir === 'string' && config.skills.dir
          ? config.skills.dir
          : '.claude/skills'

      // vendored blocks + skills
      const vendored = state.vendored && typeof state.vendored === 'object' ? state.vendored : {}
      for (const [key, meta] of Object.entries(vendored)) {
        const filePath = vendoredPath(repoRoot, key, skillsDir)
        const content = filePath ? vendoredContent(filePath, key) : null
        if (!content) {
          log(`✗ ${key}: missing`)
          continue
        }
        const diskHash = sha256(content)
        const recorded = meta?.sha256
        if (recorded && diskHash === recorded) {
          log(`✓ ${key}: pristine`)
        } else {
          log(`⚠ ${key}: locally edited (AI-merge on update)`)
        }
      }
    }

    // config version line (always, even without lockfile — useful inventory)
    const config = loadConfig(repoRoot, { stderr: { write: () => {} } })
    const cfgVer = config.version
    if (cfgVer === 1) {
      log(`✓ config: atlas.config.json version ${cfgVer}`)
    } else {
      log(`⚠ config: atlas.config.json version ${cfgVer} (supported: 1)`)
    }

    return 0
  } catch {
    return 0
  }
}
