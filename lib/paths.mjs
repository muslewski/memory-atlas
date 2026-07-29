/**
 * Path containment helpers for write targets under a vault/repo root.
 *
 * A write path with no realpath check is a real vulnerability once this
 * toolkit is pointed at repositories its users did not author: a pre-planted
 * symlink or a `../` in a user-supplied name would let a verb write outside
 * its intended root, exit 0, and report an in-root path.
 */

import fs from 'node:fs'
import path from 'node:path'

/**
 * True when `candidate` resolves inside `root` (or equals it).
 * Both sides are normalized with path.resolve; no filesystem access.
 *
 * @param {string} root
 * @param {string} candidate
 * @returns {boolean}
 */
export function isPathInside(root, candidate) {
  const r = path.resolve(root)
  const c = path.resolve(candidate)
  if (c === r) return true
  const prefix = r.endsWith(path.sep) ? r : r + path.sep
  return c.startsWith(prefix)
}

/**
 * Resolve `parts` under `root` and refuse if the result escapes `root`.
 * Does not require the path to exist.
 *
 * @param {string} root
 * @param {...string} parts
 * @returns {string} absolute path inside root
 * @throws {Error} when the joined path escapes root
 */
export function resolveInside(root, ...parts) {
  const abs = path.resolve(root, ...parts)
  if (!isPathInside(root, abs)) {
    throw new Error(`path escapes root: ${path.join(...parts)}`)
  }
  return abs
}

/**
 * Realpath of an existing path, or realpath of the nearest existing ancestor
 * joined with the remaining segments. Used before writes so a symlink that
 * points outside the root is visible.
 *
 * @param {string} target absolute path (may not exist yet)
 * @returns {string} resolved absolute path
 */
export function realpathForWrite(target) {
  const abs = path.resolve(target)
  try {
    return fs.realpathSync(abs)
  } catch {
    /* walk up */
  }
  let cur = abs
  const missing = []
  while (true) {
    const parent = path.dirname(cur)
    if (parent === cur) {
      // filesystem root — resolve what we can
      return abs
    }
    missing.unshift(path.basename(cur))
    try {
      const realParent = fs.realpathSync(parent)
      return path.join(realParent, ...missing)
    } catch {
      cur = parent
    }
  }
}

/**
 * Assert that writing to `target` stays inside `root` after symlink resolution.
 * Call before writeFileSync / mkdir of a product path.
 *
 * @param {string} root intended containment root (repo or vault)
 * @param {string} target absolute write target
 * @returns {string} realpath-resolved target (may not exist)
 * @throws {Error} when containment fails
 */
export function assertWriteInside(root, target) {
  const rootAbs = path.resolve(root)
  let rootReal
  try {
    rootReal = fs.realpathSync(rootAbs)
  } catch {
    rootReal = rootAbs
  }
  const resolved = realpathForWrite(target)
  if (!isPathInside(rootReal, resolved)) {
    throw new Error(`write target escapes root: ${path.relative(rootAbs, target) || target}`)
  }
  // Also refuse when an existing path is a symlink whose final target escapes
  // (realpathForWrite already follows; double-check parent of new files)
  const parent = path.dirname(path.resolve(target))
  try {
    if (fs.existsSync(parent)) {
      const parentReal = fs.realpathSync(parent)
      if (!isPathInside(rootReal, parentReal)) {
        throw new Error(`write parent escapes root: ${path.relative(rootAbs, target) || target}`)
      }
    }
  } catch (err) {
    if (err instanceof Error && /escapes root/.test(err.message)) throw err
    /* ignore other stat errors — write will fail loudly later */
  }
  return resolved
}

/**
 * Reject zone slugs that could traverse (`..`, absolute, separators).
 *
 * @param {string} slug
 * @returns {boolean}
 */
export function isSafeSlug(slug) {
  if (typeof slug !== 'string' || slug.length === 0) return false
  if (slug.includes('\0')) return false
  if (path.isAbsolute(slug)) return false
  if (slug.includes('..')) return false
  if (slug.includes('/') || slug.includes('\\')) return false
  return true
}

/**
 * Reject folder remaps that escape the vault via `..` segments.
 *
 * @param {string} rel vault-relative folder from config
 * @returns {boolean}
 */
export function isSafeVaultRel(rel) {
  if (typeof rel !== 'string' || rel.length === 0) return false
  if (path.isAbsolute(rel)) return false
  const norm = path.normalize(rel)
  if (norm === '..' || norm.startsWith(`..${path.sep}`) || norm.startsWith('../')) return false
  // After normalize, remaining `..` means escape
  const parts = norm.split(/[/\\]/)
  if (parts.some((p) => p === '..')) return false
  return true
}
