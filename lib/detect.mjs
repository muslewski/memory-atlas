import fs from 'node:fs'
import path from 'node:path'

/**
 * Walk up from `cwd` to the first directory containing a `.git` entry.
 * Returns the absolute path of that directory, or `null` if no repo root
 * is found (e.g. the user is initializing a vault before running `git init`).
 *
 * @param {string} cwd
 * @returns {string | null}
 */
export function findRepoRoot(cwd) {
  let dir = path.resolve(cwd)

  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) {
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      return null
    }
    dir = parent
  }
}

const VAULT_SUFFIXES = ['-atlas', '-mind', '-brain']

/**
 * Detect an existing Atlas vault under `root` by structure, not by name:
 * the first child directory (skipping hidden dirs and `node_modules`) that
 * contains `map/index.md` or `map/zones/`. Falls back to a `-atlas` /
 * `-mind` / `-brain` suffix match for compatibility with the origin
 * template's naming convention. Returns `null` if nothing is found.
 *
 * @param {string} root
 * @returns {string | null}
 */
export function findVaultDir(root) {
  let entries
  try {
    entries = fs.readdirSync(root, { withFileTypes: true })
  } catch {
    return null
  }

  const childDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('.') && name !== 'node_modules')
    .sort()

  for (const name of childDirs) {
    const candidate = path.join(root, name)
    if (
      fs.existsSync(path.join(candidate, 'map', 'index.md')) ||
      fs.existsSync(path.join(candidate, 'map', 'zones'))
    ) {
      return candidate
    }
  }

  for (const name of childDirs) {
    if (VAULT_SUFFIXES.some((suffix) => name.endsWith(suffix))) {
      return path.join(root, name)
    }
  }

  return null
}
