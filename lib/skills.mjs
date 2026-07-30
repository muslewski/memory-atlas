/**
 * User-scope skill resolution and re-vendor (redundant / drift) checks.
 *
 * A skill installed once under the user's agent skills directory satisfies
 * wiring: `atlas wire` does not copy it into the repo unless the repo opts
 * in with `skills.vendorInRepo: true`.
 *
 * Env override: ATLAS_USER_SKILLS_DIR — absolute or relative path to the
 * user-scope skills root (default: `<homedir>/.claude/skills`).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sha256 } from './state.mjs'

/** Environment variable that overrides the user-scope skills directory. */
export const USER_SKILLS_ENV = 'ATLAS_USER_SKILLS_DIR'

/** State.vendored[*].source value when the skill is satisfied at user scope. */
export const SOURCE_USER_SCOPE = 'user-scope'

/** State.vendored[*].source value when the skill is vendored into the repo. */
export const SOURCE_REPO = 'repo'

const PACKAGE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
export const PACKAGE_SKILLS_DIR = path.join(PACKAGE_ROOT, 'skills')

/**
 * Resolve the user-scope skills directory.
 *
 * Precedence: explicit `opts.userSkillsDir` → `ATLAS_USER_SKILLS_DIR` →
 * `<homedir>/.claude/skills`.
 *
 * @param {{
 *   userSkillsDir?: string,
 *   env?: NodeJS.ProcessEnv,
 *   homedir?: () => string,
 * }} [opts]
 * @returns {string} absolute path
 */
export function resolveUserSkillsDir(opts = {}) {
  if (typeof opts.userSkillsDir === 'string' && opts.userSkillsDir) {
    return path.resolve(opts.userSkillsDir)
  }
  const env = opts.env ?? process.env
  const override = env[USER_SKILLS_ENV]
  if (typeof override === 'string' && override.trim()) {
    return path.resolve(override.trim())
  }
  const home = typeof opts.homedir === 'function' ? opts.homedir() : homedir()
  return path.join(home, '.claude', 'skills')
}

/**
 * Absolute path to a skill's SKILL.md under a skills root.
 * @param {string} skillsRoot
 * @param {string} name
 * @returns {string}
 */
export function skillMdPath(skillsRoot, name) {
  return path.join(skillsRoot, name, 'SKILL.md')
}

/**
 * True when `<skillsRoot>/<name>/SKILL.md` exists.
 * @param {string} skillsRoot
 * @param {string} name
 * @returns {boolean}
 */
export function skillPresent(skillsRoot, name) {
  return existsSync(skillMdPath(skillsRoot, name))
}

/**
 * SHA-256 of a skill file, or null when missing/unreadable.
 * @param {string} filePath
 * @returns {string | null}
 */
export function hashSkillFile(filePath) {
  if (!existsSync(filePath)) return null
  try {
    return sha256(readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

/**
 * List skill package names under a skills root (directories with SKILL.md).
 * @param {string} skillsRoot absolute path
 * @returns {string[]}
 */
export function listSkillsIn(skillsRoot) {
  if (!existsSync(skillsRoot)) return []
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => existsSync(skillMdPath(skillsRoot, name)))
    .sort()
}

/**
 * Whether this repo forces package skills into `skills.dir` even when the
 * same skill is already installed at user scope.
 * @param {Record<string, unknown> | null | undefined} config
 * @returns {boolean}
 */
export function wantsVendorInRepo(config) {
  return config?.skills?.vendorInRepo === true
}

/**
 * Whether wire should skip vendoring `name` because user-scope satisfies it.
 * @param {string} name
 * @param {Record<string, unknown> | null | undefined} config
 * @param {{ userSkillsDir?: string, env?: NodeJS.ProcessEnv, homedir?: () => string }} [opts]
 * @returns {boolean}
 */
export function userScopeSatisfies(name, config, opts = {}) {
  if (wantsVendorInRepo(config)) return false
  const userRoot = resolveUserSkillsDir(opts)
  return skillPresent(userRoot, name)
}

/**
 * Build a state.vendored entry for a user-scope-satisfied skill.
 * @param {string} contentHash sha256 of the user-scope SKILL.md
 * @param {string} atlasVersion
 * @returns {{ sha256: string, atlasVersion: string, source: string }}
 */
export function userScopeVendoredEntry(contentHash, atlasVersion) {
  return {
    sha256: contentHash,
    atlasVersion,
    source: SOURCE_USER_SCOPE,
  }
}

/**
 * Build a state.vendored entry for a repo-vendored skill.
 * @param {string} contentHash
 * @param {string} atlasVersion
 * @returns {{ sha256: string, atlasVersion: string, source: string }}
 */
export function repoVendoredEntry(contentHash, atlasVersion) {
  return {
    sha256: contentHash,
    atlasVersion,
    source: SOURCE_REPO,
  }
}

/**
 * Absolute path for a vendored state key, honouring source:user-scope.
 *
 * @param {string} repoRoot
 * @param {string} key e.g. `skills/atlas-nav/SKILL.md`
 * @param {string} skillsDir repo-relative skills dir
 * @param {{ sha256?: string, source?: string } | null | undefined} meta
 * @param {{ userSkillsDir?: string, env?: NodeJS.ProcessEnv, homedir?: () => string }} [opts]
 * @returns {string | null}
 */
export function resolveVendoredSkillPath(repoRoot, key, skillsDir, meta, opts = {}) {
  if (!key.startsWith('skills/')) return null
  const rest = key.slice('skills/'.length) // e.g. atlas-nav/SKILL.md
  const name = rest.split(/[/\\]/)[0]
  if (!name) return null
  if (meta?.source === SOURCE_USER_SCOPE) {
    return skillMdPath(resolveUserSkillsDir(opts), name)
  }
  return path.join(repoRoot, skillsDir, rest)
}

/**
 * @typedef {{
 *   kind: 'redundant' | 'drift',
 *   name: string,
 *   repoPath: string,
 *   userPath: string,
 *   repoHash: string,
 *   userHash: string,
 *   message: string,
 * }} RevendorFinding
 */

/**
 * Format a re-vendor finding as one multi-line report block.
 * @param {RevendorFinding} f
 * @returns {string}
 */
export function formatRevendorFinding(f) {
  if (f.kind === 'redundant') {
    return (
      `⚠ skill ${f.name}: redundant vendored copy (identical to user-scope)\n` +
      `  repo:  ${f.repoPath}\n` +
      `  user:  ${f.userPath}\n` +
      `  hash:  ${f.repoHash.slice(0, 12)}… (identical)\n` +
      `  action: safe to delete the repo copy; user-scope already satisfies wiring`
    )
  }
  return (
    `⚠ skill ${f.name}: DRIFT between vendored copy and user-scope\n` +
    `  repo:  ${f.repoPath}  (${f.repoHash.slice(0, 12)}…)\n` +
    `  user:  ${f.userPath}  (${f.userHash.slice(0, 12)}…)\n` +
    `  note:  neither side is assumed newer — choose which wins, then delete or re-vendor\n` +
    `  action: human must pick repo vs user-scope; atlas will not auto-prefer either`
  )
}

/**
 * Compare package skills present at both user-scope and the repo skills dir.
 *
 * Outcomes (only dual presence is reported):
 * - identical hashes → redundant (safe to delete repo copy)
 * - different hashes → drift (human chooses; no newer-side guess)
 * - user-scope only → silent (correct)
 *
 * Skipped entirely when `skills.vendorInRepo` is true (repo deliberately
 * keeps its own copies).
 *
 * @param {string} repoRoot
 * @param {string} skillsDir repo-relative skills directory
 * @param {Record<string, unknown> | null | undefined} config
 * @param {{
 *   userSkillsDir?: string,
 *   env?: NodeJS.ProcessEnv,
 *   homedir?: () => string,
 *   packageSkillsDir?: string,
 * }} [opts]
 * @returns {RevendorFinding[]}
 */
export function collectRevendorFindings(repoRoot, skillsDir, config, opts = {}) {
  if (wantsVendorInRepo(config)) return []

  const userRoot = resolveUserSkillsDir(opts)
  const packageRoot = opts.packageSkillsDir ?? PACKAGE_SKILLS_DIR
  const names = listSkillsIn(packageRoot)
  /** @type {RevendorFinding[]} */
  const findings = []

  for (const name of names) {
    const userPath = skillMdPath(userRoot, name)
    const repoPath = skillMdPath(path.join(repoRoot, skillsDir), name)
    if (!existsSync(userPath) || !existsSync(repoPath)) continue

    const userHash = hashSkillFile(userPath)
    const repoHash = hashSkillFile(repoPath)
    if (!userHash || !repoHash) continue

    if (userHash === repoHash) {
      findings.push({
        kind: 'redundant',
        name,
        repoPath,
        userPath,
        repoHash,
        userHash,
        message: formatRevendorFinding({
          kind: 'redundant',
          name,
          repoPath,
          userPath,
          repoHash,
          userHash,
          message: '',
        }),
      })
    } else {
      findings.push({
        kind: 'drift',
        name,
        repoPath,
        userPath,
        repoHash,
        userHash,
        message: formatRevendorFinding({
          kind: 'drift',
          name,
          repoPath,
          userPath,
          repoHash,
          userHash,
          message: '',
        }),
      })
    }
  }

  // Fill message field cleanly (format uses the finding fields)
  for (const f of findings) {
    f.message = formatRevendorFinding(f)
  }
  return findings
}

/**
 * Resolve config.skills.dir with the package default.
 * @param {Record<string, unknown> | null | undefined} config
 * @returns {string}
 */
export function resolveSkillsDir(config) {
  return typeof config?.skills?.dir === 'string' && config.skills.dir
    ? config.skills.dir
    : '.claude/skills'
}
