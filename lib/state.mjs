/**
 * Provenance lockfile for an adopting repo: `.atlas-state.json`.
 *
 * Records which atlas version was last stamped, which CLI lanes are wired,
 * and content hashes of managed on-ramp blocks. Machine-owned only — never
 * rewrite user text, vault notes, or atlas.config.json from this module.
 */

import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const STATE_FILE = '.atlas-state.json'

/** Convention version; bump with SPEC.md frontmatter. */
export const SPEC_VERSION = '0.1'

/**
 * This package's own package.json version.
 * @returns {string}
 */
export function packageVersion() {
  const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url))
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  return pkg.version
}

/**
 * SHA-256 hex digest of a UTF-8 string.
 * @param {string} text
 * @returns {string}
 */
export function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/**
 * @param {Record<string, unknown>} [overrides]
 * @returns {Record<string, unknown>}
 */
export function defaultState(overrides = {}) {
  return {
    atlasVersion: packageVersion(),
    configVersion: 1,
    specVersion: SPEC_VERSION,
    modules: [],
    wired: { claude: false, grok: false, rootBlocks: [] },
    vendored: {},
    ...overrides,
  }
}

/**
 * Read and parse `.atlas-state.json`. Returns null when missing or malformed
 * — never throws.
 *
 * @param {string} repoRoot
 * @returns {Record<string, unknown> | null}
 */
export function readState(repoRoot) {
  const filePath = path.join(repoRoot, STATE_FILE)
  if (!fs.existsSync(filePath)) return null
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Write state as pretty JSON with a trailing newline.
 *
 * @param {string} repoRoot
 * @param {Record<string, unknown>} state
 */
export function writeState(repoRoot, state) {
  const filePath = path.join(repoRoot, STATE_FILE)
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`)
}
