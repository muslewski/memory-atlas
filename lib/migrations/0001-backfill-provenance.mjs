/**
 * 0001 — backfill provenance for pre-A2 vaults.
 *
 * Pre-A2 adopters have a vault + atlas.config.json but no .atlas-state.json.
 * This migration creates the lockfile (modules from config, atlasVersion 0.0.0
 * so the runner's post-apply bump stamps the real version) and adopts any
 * existing on-ramp marker blocks in place — hash only, never rewrite text.
 *
 * Machine-owned only: never touches zone cards, ledger notes, or config knobs.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { BLOCK_BEGIN, BLOCK_END } from '../blocks.mjs'
import { loadConfig } from '../config.mjs'
import { findVaultDir } from '../detect.mjs'
import {
  defaultState,
  packageVersion,
  readState,
  STATE_FILE,
  sha256,
  writeState,
} from '../state.mjs'

const ROOT_BLOCKS = [
  { file: 'CLAUDE.md', key: 'CLAUDE.md#atlas:onramp' },
  { file: 'AGENTS.md', key: 'AGENTS.md#atlas:onramp' },
]

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
 * @param {string} repoRoot
 * @returns {{ applicable: boolean, modules: string[], rootBlocks: Array<{file: string, key: string, block: string}> }}
 */
function inspect(repoRoot) {
  const vaultDir = findVaultDir(repoRoot)
  const configPath = path.join(repoRoot, 'atlas.config.json')
  if (!vaultDir || !existsSync(configPath)) {
    return { applicable: false, modules: [], rootBlocks: [] }
  }

  const config = loadConfig(repoRoot, { stderr: { write: () => {} } })
  const modulesObj = config.modules && typeof config.modules === 'object' ? config.modules : {}
  const modules = Object.keys(modulesObj).filter((k) => modulesObj[k] === true)

  const rootBlocks = []
  for (const { file, key } of ROOT_BLOCKS) {
    const block = readBlockOnDisk(path.join(repoRoot, file))
    if (block) rootBlocks.push({ file, key, block })
  }

  return { applicable: true, modules, rootBlocks }
}

/**
 * @param {string} repoRoot
 * @param {object} [_opts]
 * @returns {Array<{ action: string, path: string, detail?: string }>}
 */
export function plan(repoRoot, _opts = {}) {
  if (readState(repoRoot)) {
    return [{ action: 'skip', path: STATE_FILE, detail: 'state already exists' }]
  }

  const info = inspect(repoRoot)
  if (!info.applicable) {
    return [{ action: 'skip', path: STATE_FILE, detail: 'no vault + atlas.config.json' }]
  }

  const actions = [
    {
      action: 'create',
      path: STATE_FILE,
      detail: `modules: ${info.modules.length ? info.modules.join(', ') : '(none)'}`,
    },
  ]
  for (const { file, key } of info.rootBlocks) {
    actions.push({
      action: 'update',
      path: file,
      detail: `adopt existing block (record hash) → ${key}`,
    })
  }
  return actions
}

/**
 * @param {string} repoRoot
 * @param {object} [_opts]
 * @returns {{ changed: string[] }}
 */
export function apply(repoRoot, _opts = {}) {
  if (readState(repoRoot)) {
    return { changed: [] }
  }

  const info = inspect(repoRoot)
  if (!info.applicable) {
    return { changed: [] }
  }

  const vendored = {}
  const rootBlocks = []
  for (const { file, key, block } of info.rootBlocks) {
    vendored[key] = {
      sha256: sha256(block),
      atlasVersion: packageVersion(),
    }
    rootBlocks.push(file)
  }

  const state = defaultState({
    modules: info.modules,
    atlasVersion: '0.0.0',
    vendored,
    wired: {
      claude: rootBlocks.includes('CLAUDE.md'),
      grok: rootBlocks.includes('AGENTS.md'),
      rootBlocks,
    },
  })
  writeState(repoRoot, state)
  return { changed: [STATE_FILE] }
}

/** @type {{ id: string, target: string, describe: string, plan: typeof plan, apply: typeof apply }} */
export const migration = {
  id: '0001-backfill-provenance',
  target: '0.2.0',
  describe: 'backfill .atlas-state.json provenance for pre-A2 vaults',
  plan,
  apply,
}

export default migration
