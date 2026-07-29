/**
 * `atlas wire` — dual-CLI SessionStart hooks + managed on-ramp blocks.
 *
 * Wiring semantics follow status-herald's install.mjs: read → refuse on
 * malformed JSON → `.bak` before first modification → idempotent merge.
 * Also vendors package skills into config.skills.dir (create / overwrite
 * pristine; leave locally-edited copies alone).
 */

import { spawnSync } from 'node:child_process'
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
 * List skill package names under a skills root (directories containing SKILL.md).
 * @param {string} skillsRoot absolute path
 * @returns {string[]}
 */
function listSkillsIn(skillsRoot) {
  if (!existsSync(skillsRoot)) return []
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => existsSync(path.join(skillsRoot, name, 'SKILL.md')))
    .sort()
}

/**
 * Vendor skills from an absolute source root into the adopting repo's skills dir.
 * create-if-missing OR overwrite-if-pristine (recorded hash matches disk);
 * locally-edited copies are left byte-identical.
 *
 * @param {string} repoRoot
 * @param {string} skillsDir relative to repoRoot (e.g. `.claude/skills`)
 * @param {string} srcRoot absolute path containing skill subdirs
 * @param {Record<string, unknown>} state mutated in place
 * @param {(msg: string) => void} log
 * @returns {{ anyAction: boolean, stateDirty: boolean }}
 */
function vendorSkillsFrom(repoRoot, skillsDir, srcRoot, state, log) {
  let anyAction = false
  let stateDirty = false
  const destRoot = path.join(repoRoot, skillsDir)
  const version = packageVersion()

  for (const name of listSkillsIn(srcRoot)) {
    const srcDir = path.join(srcRoot, name)
    const srcSkill = path.join(srcDir, 'SKILL.md')

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
 * Vendor package skills into the adopting repo's skills dir.
 * @param {string} repoRoot
 * @param {string} skillsDir relative to repoRoot (e.g. `.claude/skills`)
 * @param {Record<string, unknown>} state mutated in place
 * @param {(msg: string) => void} log
 * @returns {{ anyAction: boolean, stateDirty: boolean }}
 */
function vendorSkills(repoRoot, skillsDir, state, log) {
  return vendorSkillsFrom(repoRoot, skillsDir, PACKAGE_SKILLS_DIR, state, log)
}

/**
 * Vendor optional visuals-peer skills (and core skills-visuals stubs if present).
 * Fail-open: missing peer logs a skip line and does not throw.
 *
 * @param {string} repoRoot
 * @param {string} skillsDir
 * @param {Record<string, unknown>} state
 * @param {(msg: string) => void} log
 * @param {Record<string, unknown>} config
 * @returns {{ anyAction: boolean, stateDirty: boolean }}
 */
function vendorVisualsSkills(repoRoot, skillsDir, state, log, config) {
  let anyAction = false
  let stateDirty = false
  const visuals = config.visuals
  if (!visuals || visuals.enabled !== true || visuals.skills === false) {
    return { anyAction, stateDirty }
  }

  const packageName =
    typeof visuals.package === 'string' && visuals.package
      ? visuals.package
      : 'memory-atlas-visuals'

  // Optional core stubs first (point at peer). Peer below overwrites pristine
  // copies so installed peer content wins when both ship the same skill name.
  const stubsRoot = path.join(PACKAGE_ROOT, 'skills-visuals')
  if (existsSync(stubsRoot)) {
    const stubResult = vendorSkillsFrom(repoRoot, skillsDir, stubsRoot, state, log)
    if (stubResult.anyAction) anyAction = true
    if (stubResult.stateDirty) stateDirty = true
  }

  // Peer package skills under node_modules/<package>/skills
  const peerSkills = path.join(repoRoot, 'node_modules', packageName, 'skills')
  if (existsSync(peerSkills)) {
    const peerResult = vendorSkillsFrom(repoRoot, skillsDir, peerSkills, state, log)
    if (peerResult.anyAction) anyAction = true
    if (peerResult.stateDirty) stateDirty = true
  } else {
    log(`visuals skills: peer ${packageName} missing — skip (npm i -D ${packageName})`)
  }

  return { anyAction, stateDirty }
}

/**
 * @param {string[]} argv e.g. ['claude'|'grok'|'all']
 * @param {{ cwd?: string, stdout?: { write: Function }, stderr?: { write: Function }, grokHooksDir?: string }} [opts]
 * @returns {number} 0 success, 1 refusal (malformed JSON target)
 */

/**
 * True when the working tree has any staged or unstaged change (or untracked).
 * Deliberate: wire merge-driver refuses dirty trees by default so a report-first
 * install cannot interleave with half-finished human edits. Escape: --allow-dirty.
 *
 * @param {string} repoRoot
 * @returns {boolean}
 */
export function isWorkingTreeDirty(repoRoot) {
  const r = spawnSync('git', ['status', '--porcelain'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (r.status !== 0) return true
  return String(r.stdout || '').trim().length > 0
}

/**
 * Desired .gitattributes lines for Atlas merge drivers in this vault.
 * @param {string} vaultRel repo-relative vault dir with forward slashes
 * @returns {string[]}
 */
export function mergeDriverAttrLines(vaultRel) {
  return [
    `${vaultRel}/map/index.md merge=atlas-index`,
    `${vaultRel}/map/zones/*.md merge=atlas-zone`,
  ]
}

/**
 * Plan (and optionally apply) the local git merge-driver install.
 *
 * Report-first by default (matches `atlas migrate` / `atlas adopt`): without
 * `--write`, only prints what would change. `.gitattributes` alone does
 * nothing — git also needs per-clone `merge.<name>.driver` config.
 *
 * @param {string} repoRoot
 * @param {{
 *   stdout: { write: Function },
 *   stderr: { write: Function },
 *   log: (s: string) => void,
 *   write?: boolean,
 *   allowDirty?: boolean,
 * }} io
 * @returns {number}
 */
export function wireMergeDriver(repoRoot, io) {
  const { stderr, log } = io
  const write = io.write === true
  const allowDirty = io.allowDirty === true

  const vaultDir = findVaultDir(repoRoot)
  if (!vaultDir) {
    stderr.write('atlas wire merge-driver: no Atlas vault found — run `atlas init` first\n')
    return 1
  }

  if (write && !allowDirty && isWorkingTreeDirty(repoRoot)) {
    stderr.write(
      'atlas wire merge-driver: working tree is dirty — refuse to write so install does not interleave with unfinished edits\n' +
        '  commit or stash your changes, then re-run with --write\n' +
        '  escape hatch (deliberate): --write --allow-dirty\n',
    )
    return 1
  }

  const vaultRel = path.relative(repoRoot, vaultDir).split(path.sep).join('/')
  const desiredLines = mergeDriverAttrLines(vaultRel)
  const attrPath = path.join(repoRoot, '.gitattributes')
  const existing = existsSync(attrPath) ? readFileSync(attrPath, 'utf8') : ''
  const existingLines = existing.split('\n')

  /** @type {string[]} */
  const missingAttr = []
  for (const line of desiredLines) {
    const present = existingLines.some(
      (l) =>
        l.trim() === line ||
        (line.includes('merge=atlas-index') && l.includes('merge=atlas-index') && l.includes('map/index.md')) ||
        (line.includes('merge=atlas-zone') && l.includes('merge=atlas-zone') && l.includes('map/zones/')),
    )
    if (!present) missingAttr.push(line)
  }

  const atlasBin = path.join(PACKAGE_ROOT, 'bin', 'atlas.mjs')
  const indexDriver = `node ${JSON.stringify(atlasBin)} merge-index %O %A %B %L %P`
  const zoneDriver = `node ${JSON.stringify(atlasBin)} merge-zone %O %A %B %L %P`

  const getCfg = (key) => {
    const r = spawnSync('git', ['config', '--get', key], {
      cwd: repoRoot,
      encoding: 'utf8',
    })
    return r.status === 0 ? String(r.stdout || '').trim() : ''
  }

  const indexName = 'regenerate Atlas map/index.md from zone cards'
  const zoneName = 'resolve zone verifiedAt-only conflicts to unverified'
  const cfgPlan = [
    { key: 'merge.atlas-index.name', value: indexName },
    { key: 'merge.atlas-index.driver', value: indexDriver },
    { key: 'merge.atlas-zone.name', value: zoneName },
    { key: 'merge.atlas-zone.driver', value: zoneDriver },
  ]
  const missingCfg = cfgPlan.filter((c) => getCfg(c.key) !== c.value)

  const mode = write ? 'write' : 'dry-run'
  log(`atlas wire merge-driver (${mode})`)
  log(
    'note: .gitattributes alone does nothing without local `git config merge.<name>.driver` — re-run after every clone',
  )

  if (missingAttr.length === 0) {
    log('.gitattributes: already has atlas merge driver lines')
  } else {
    for (const line of missingAttr) {
      log(write ? `.gitattributes: add ${line}` : `.gitattributes: would add ${line}`)
    }
  }

  if (missingCfg.length === 0) {
    log('git config: merge.atlas-index + merge.atlas-zone already set for this clone')
  } else {
    for (const c of missingCfg) {
      log(write ? `git config: set ${c.key}` : `git config: would set ${c.key}`)
    }
  }

  if (!write) {
    if (missingAttr.length === 0 && missingCfg.length === 0) {
      log('already wired — no changes')
    } else {
      log('dry-run — re-run with --write to apply (nothing written)')
    }
    return 0
  }

  // Apply .gitattributes
  if (missingAttr.length > 0) {
    let next = existing
    if (next && !next.endsWith('\n')) next += '\n'
    next += missingAttr.join('\n') + '\n'
    writeFileSync(attrPath, next)
  }

  for (const c of cfgPlan) {
    const r = spawnSync('git', ['config', c.key, c.value], {
      cwd: repoRoot,
      encoding: 'utf8',
    })
    if (r.status !== 0) {
      stderr.write(
        `atlas wire merge-driver: git config failed for ${c.key}: ${String(r.stderr || '').trim()}\n`,
      )
      return 1
    }
  }

  if (missingAttr.length === 0 && missingCfg.length === 0) {
    log('already wired — gitattributes unchanged; git config refreshed')
  } else {
    log('merge drivers installed (local git config + .gitattributes)')
  }
  return 0
}

export function runWire(argv, opts = {}) {
  const cwd = opts.cwd ?? process.cwd()
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const log = (msg) => stdout.write(`${msg}\n`)

  const target = (argv[0] || 'all').toLowerCase()
  if (!['claude', 'grok', 'all', 'merge-driver'].includes(target)) {
    stderr.write(`atlas wire: unknown target "${argv[0]}" (use claude|grok|all|merge-driver)\n`)
    return 1
  }

  const repoRoot = findRepoRoot(cwd) ?? path.resolve(cwd)

  if (target === 'merge-driver') {
    const write = argv.includes('--write')
    const allowDirty = argv.includes('--allow-dirty')
    return wireMergeDriver(repoRoot, { stdout, stderr, log, write, allowDirty })
  }

  const doClaude = target === 'claude' || target === 'all'
  const doGrok = target === 'grok' || target === 'all'

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

    const block = renderOnrampBlock('claude', { vaultName, skillsDir })
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

    const block = renderOnrampBlock('agents', { vaultName, skillsDir })
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

  // Optional visuals peer skills (fail-open if peer missing)
  const visualsResult = vendorVisualsSkills(repoRoot, skillsDir, state, log, config)
  if (visualsResult.anyAction) anyAction = true
  if (visualsResult.stateDirty) stateDirty = true

  if (stateDirty) {
    writeState(repoRoot, state)
    anyAction = true
  }

  if (!anyAction) {
    log('already wired — no change')
  }

  return 0
}
