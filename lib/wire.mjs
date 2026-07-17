/**
 * `atlas wire` — dual-CLI SessionStart hooks + managed on-ramp blocks.
 *
 * Wiring semantics follow status-herald's install.mjs: read → refuse on
 * malformed JSON → `.bak` before first modification → idempotent merge.
 * Also vendors package skills into config.skills.dir (create / overwrite
 * pristine; leave locally-edited copies alone).
 */

import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderOnrampBlock, upsertBlock } from './blocks.mjs'
import { loadConfig } from './config.mjs'
import { findRepoRoot, findVaultDir } from './detect.mjs'
import { defaultState, packageVersion, readState, sha256, writeState } from './state.mjs'

const PACKAGE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const PACKAGE_SKILLS_DIR = path.join(PACKAGE_ROOT, 'skills')

/** Claude Code repo-level SessionStart command (PATH-relative, portable). */
export const CLAUDE_HOOK_CMD = 'npx --no-install atlas status --hook'

/**
 * Grok global hook command: fail-open outside atlas repos (npx may fail;
 * stderr muted; `|| true` keeps the host hook contract).
 */
export const GROK_HOOK_CMD = 'sh -c "npx --no-install atlas status --hook 2>/dev/null || true"'

/** Detect any atlas status --hook variant so we migrate rather than duplicate. */
const isAtlasStatusHook = (cmd) => typeof cmd === 'string' && /atlas status --hook/.test(cmd)

const entry = (command) => ({ hooks: [{ type: 'command', command }] })

const hasCommand = (groups, cmd) =>
  (groups || []).some((g) => (g.hooks || []).some((h) => h.command === cmd))

/**
 * Drop hook entries matching `pred` while preserving foreign co-located hooks.
 * Empty groups are removed. Returns true if anything was removed.
 * @param {Record<string, unknown>} settings
 * @param {(cmd: string) => boolean} pred
 * @returns {boolean}
 */
function dropWhere(settings, pred) {
  if (!settings.hooks) return false
  let changed = false
  for (const ev of Object.keys(settings.hooks)) {
    const groups = settings.hooks[ev]
    if (!Array.isArray(groups)) continue
    const nextGroups = []
    let evChanged = false
    for (const g of groups) {
      const hooks = g.hooks || []
      const keptHooks = hooks.filter((h) => !pred(h.command))
      if (keptHooks.length !== hooks.length) evChanged = true
      if (keptHooks.length === 0) continue
      nextGroups.push(keptHooks.length === hooks.length ? g : { ...g, hooks: keptHooks })
    }
    if (evChanged || nextGroups.length !== groups.length) {
      settings.hooks[ev] = nextGroups
      changed = true
    }
  }
  return changed
}

/**
 * Ensure SessionStart contains exactly `command` as our entry (migrate variants).
 * @param {Record<string, unknown>} settings
 * @param {string} command
 * @returns {boolean} true if mutated
 */
export function mergeSessionStartHook(settings, command) {
  settings.hooks ??= {}
  let changed = dropWhere(settings, (c) => isAtlasStatusHook(c) && c !== command)
  settings.hooks.SessionStart ??= []
  if (!hasCommand(settings.hooks.SessionStart, command)) {
    settings.hooks.SessionStart.push(entry(command))
    changed = true
  }
  return changed
}

/**
 * @param {string} filePath
 * @returns {{ settings: Record<string, unknown>, existed: boolean } | { malformed: true }}
 */
function loadJson(filePath) {
  if (!existsSync(filePath)) return { settings: {}, existed: false }
  const raw = readFileSync(filePath, 'utf8')
  try {
    return { settings: JSON.parse(raw), existed: true }
  } catch {
    return { malformed: true }
  }
}

/**
 * Install/merge a SessionStart hook into a JSON settings file (herald semantics).
 * @param {string} filePath
 * @param {string} command
 * @returns {{ ok: true, changed: boolean } | { ok: false, reason: string }}
 */
export function installHookFile(filePath, command) {
  const loaded = loadJson(filePath)
  if (loaded.malformed) {
    return { ok: false, reason: `malformed JSON in ${filePath}; left untouched` }
  }
  const changed = mergeSessionStartHook(loaded.settings, command)
  if (changed) {
    if (loaded.existed) copyFileSync(filePath, `${filePath}.bak`)
    const dir = path.dirname(filePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(filePath, `${JSON.stringify(loaded.settings, null, 2)}\n`)
  }
  return { ok: true, changed }
}

/**
 * Resolve the vault directory basename used in on-ramp block text.
 * @param {string} repoRoot
 * @returns {string}
 */
function resolveVaultName(repoRoot) {
  const vaultDir = findVaultDir(repoRoot)
  if (vaultDir) return path.basename(vaultDir)
  const config = loadConfig(repoRoot, { stderr: { write: () => {} } })
  if (typeof config.vaultDir === 'string' && config.vaultDir) {
    return path.basename(config.vaultDir)
  }
  return `${path.basename(repoRoot)}-atlas`
}

/**
 * List skill package names shipped with this install (directories under skills/).
 * @returns {string[]}
 */
function listPackageSkills() {
  if (!existsSync(PACKAGE_SKILLS_DIR)) return []
  return readdirSync(PACKAGE_SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
}

/**
 * Vendor package skills into the adopting repo's skills dir.
 * create-if-missing OR overwrite-if-pristine (recorded hash matches disk);
 * locally-edited copies are left byte-identical.
 *
 * @param {string} repoRoot
 * @param {string} skillsDir relative to repoRoot (e.g. `.claude/skills`)
 * @param {Record<string, unknown>} state mutated in place
 * @param {(msg: string) => void} log
 * @returns {{ anyAction: boolean, stateDirty: boolean }}
 */
function vendorSkills(repoRoot, skillsDir, state, log) {
  let anyAction = false
  let stateDirty = false
  const destRoot = path.join(repoRoot, skillsDir)
  const version = packageVersion()

  for (const name of listPackageSkills()) {
    const srcDir = path.join(PACKAGE_SKILLS_DIR, name)
    const srcSkill = path.join(srcDir, 'SKILL.md')
    if (!existsSync(srcSkill)) continue

    const destDir = path.join(destRoot, name)
    const destSkill = path.join(destDir, 'SKILL.md')
    const vendoredKey = `skills/${name}/SKILL.md`
    const upstreamHash = sha256(readFileSync(srcSkill, 'utf8'))
    const prev = state.vendored[vendoredKey]
    const destExists = existsSync(destSkill)

    let shouldCopy = false
    if (!destExists) {
      shouldCopy = true
    } else if (prev?.sha256) {
      const diskHash = sha256(readFileSync(destSkill, 'utf8'))
      if (diskHash === prev.sha256) {
        // Pristine relative to recorded hash — safe to overwrite with upstream.
        shouldCopy = true
      }
      // else: locally edited — leave alone
    }
    // dest exists, no recorded hash: treat as foreign/local — leave alone

    const nextVendored = { sha256: upstreamHash, atlasVersion: version }

    if (shouldCopy) {
      const contentChanged = !destExists || (prev?.sha256 && prev.sha256 !== upstreamHash)
      // When dest is pristine and already matches upstream, skip the write.
      const alreadyCurrent =
        destExists &&
        prev?.sha256 === upstreamHash &&
        sha256(readFileSync(destSkill, 'utf8')) === upstreamHash

      if (!alreadyCurrent) {
        mkdirSync(destDir, { recursive: true })
        cpSync(srcDir, destDir, { recursive: true })
        if (!destExists) log(`vendored skill ${name}`)
        else if (contentChanged) log(`updated skill ${name}`)
        anyAction = true
      }

      const p = state.vendored[vendoredKey]
      if (!p || p.sha256 !== nextVendored.sha256 || p.atlasVersion !== nextVendored.atlasVersion) {
        state.vendored[vendoredKey] = nextVendored
        stateDirty = true
      }
    }
    // destExists && prev with hash mismatch: locally edited — leave alone.
    // destExists && !prev: foreign copy — do not claim it in vendored.
  }

  return { anyAction, stateDirty }
}

/**
 * @param {string[]} argv e.g. ['claude'|'grok'|'all']
 * @param {{ cwd?: string, stdout?: { write: Function }, stderr?: { write: Function }, grokHooksDir?: string }} [opts]
 * @returns {number} 0 success, 1 refusal (malformed JSON target)
 */
export function runWire(argv, opts = {}) {
  const cwd = opts.cwd ?? process.cwd()
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const log = (msg) => stdout.write(`${msg}\n`)

  const target = (argv[0] || 'all').toLowerCase()
  if (!['claude', 'grok', 'all'].includes(target)) {
    stderr.write(`atlas wire: unknown target "${argv[0]}" (use claude|grok|all)\n`)
    return 1
  }

  const doClaude = target === 'claude' || target === 'all'
  const doGrok = target === 'grok' || target === 'all'

  const repoRoot = findRepoRoot(cwd) ?? path.resolve(cwd)
  const vaultName = resolveVaultName(repoRoot)
  const grokHooksDir = opts.grokHooksDir ?? path.join(homedir(), '.grok', 'hooks')
  const config = loadConfig(repoRoot, { stderr: { write: () => {} } })
  const skillsDir =
    typeof config.skills?.dir === 'string' && config.skills.dir
      ? config.skills.dir
      : '.claude/skills'

  const state = readState(repoRoot) ?? defaultState()
  // Ensure nested shapes exist even if state was hand-partial.
  state.wired = {
    claude: false,
    grok: false,
    rootBlocks: [],
    ...(state.wired && typeof state.wired === 'object' ? state.wired : {}),
  }
  state.vendored = state.vendored && typeof state.vendored === 'object' ? state.vendored : {}
  if (!Array.isArray(state.wired.rootBlocks)) state.wired.rootBlocks = []

  let anyAction = false
  let stateDirty = false

  if (doClaude) {
    const settingsPath = path.join(repoRoot, '.claude', 'settings.json')
    const installed = installHookFile(settingsPath, CLAUDE_HOOK_CMD)
    if (!installed.ok) {
      stderr.write(`atlas wire: ${installed.reason}\n`)
      return 1
    }
    if (installed.changed) {
      log('wired claude hook')
      anyAction = true
    }

    const block = renderOnrampBlock('claude', { vaultName })
    const blockResult = upsertBlock(path.join(repoRoot, 'CLAUDE.md'), block)
    if (blockResult.changed) {
      log('CLAUDE.md block updated')
      anyAction = true
    }

    const vendoredKey = 'CLAUDE.md#atlas:onramp'
    const nextVendored = {
      sha256: blockResult.hash,
      atlasVersion: packageVersion(),
    }
    const prev = state.vendored[vendoredKey]
    if (
      !prev ||
      prev.sha256 !== nextVendored.sha256 ||
      prev.atlasVersion !== nextVendored.atlasVersion
    ) {
      state.vendored[vendoredKey] = nextVendored
      stateDirty = true
    }
    if (!state.wired.claude) {
      state.wired.claude = true
      stateDirty = true
    }
    if (!state.wired.rootBlocks.includes('CLAUDE.md')) {
      state.wired.rootBlocks = [...state.wired.rootBlocks, 'CLAUDE.md']
      stateDirty = true
    }
  }

  if (doGrok) {
    const grokPath = path.join(grokHooksDir, 'atlas.json')
    const installed = installHookFile(grokPath, GROK_HOOK_CMD)
    if (!installed.ok) {
      stderr.write(`atlas wire: ${installed.reason}\n`)
      return 1
    }
    if (installed.changed) {
      log('wired grok hook')
      anyAction = true
    }

    const block = renderOnrampBlock('agents', { vaultName })
    const blockResult = upsertBlock(path.join(repoRoot, 'AGENTS.md'), block)
    if (blockResult.changed) {
      log('AGENTS.md block updated')
      anyAction = true
    }

    const vendoredKey = 'AGENTS.md#atlas:onramp'
    const nextVendored = {
      sha256: blockResult.hash,
      atlasVersion: packageVersion(),
    }
    const prev = state.vendored[vendoredKey]
    if (
      !prev ||
      prev.sha256 !== nextVendored.sha256 ||
      prev.atlasVersion !== nextVendored.atlasVersion
    ) {
      state.vendored[vendoredKey] = nextVendored
      stateDirty = true
    }
    if (!state.wired.grok) {
      state.wired.grok = true
      stateDirty = true
    }
    if (!state.wired.rootBlocks.includes('AGENTS.md')) {
      state.wired.rootBlocks = [...state.wired.rootBlocks, 'AGENTS.md']
      stateDirty = true
    }
  }

  // Normalize rootBlocks order for stability
  const ordered = []
  if (state.wired.claude && state.wired.rootBlocks.includes('CLAUDE.md')) ordered.push('CLAUDE.md')
  if (state.wired.grok && state.wired.rootBlocks.includes('AGENTS.md')) ordered.push('AGENTS.md')
  for (const b of state.wired.rootBlocks) {
    if (!ordered.includes(b)) ordered.push(b)
  }
  if (JSON.stringify(ordered) !== JSON.stringify(state.wired.rootBlocks)) {
    state.wired.rootBlocks = ordered
    stateDirty = true
  }

  // Skills: both lanes (any wire target) vendor package skills into skills.dir
  const skillResult = vendorSkills(repoRoot, skillsDir, state, log)
  if (skillResult.anyAction) anyAction = true
  if (skillResult.stateDirty) stateDirty = true

  if (stateDirty) {
    writeState(repoRoot, state)
    anyAction = true
  }

  if (!anyAction) {
    log('already wired — no change')
  }

  return 0
}
