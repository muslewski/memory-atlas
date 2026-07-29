/**
 * 0002 — rewrite illegal ISO-date (and other non-SHA) verifiedAt values to
 * `unverified` on zone cards. Completes the adopt → migrate → check path so a
 * legacy vault cannot report Freshness "ok" for a stamp that check rejects.
 */

import fs from 'node:fs'
import path from 'node:path'
import { loadConfig } from '../config.mjs'
import { findVaultDir } from '../detect.mjs'
import { parseFrontmatter, setFrontmatterField } from '../frontmatter.mjs'
import { isSafeVaultRel, resolveInside } from '../paths.mjs'

const SHA_RE = /^[0-9a-f]{7,40}$/i

function isLegalVerifiedAt(value) {
  if (value === 'unverified') return true
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return true
  return typeof value === 'string' && SHA_RE.test(value)
}

/**
 * @param {string} repoRoot
 * @returns {Array<{ file: string, rel: string, verifiedAt: unknown }>}
 */
function scan(repoRoot) {
  const vaultDir = findVaultDir(repoRoot)
  if (!vaultDir) return []
  const config = loadConfig(repoRoot, { stderr: { write: () => {} } })
  const zonesRel = config.folders?.zones ?? 'map/zones'
  if (!isSafeVaultRel(zonesRel)) return []
  let zonesDir
  try {
    zonesDir = resolveInside(vaultDir, zonesRel)
  } catch {
    return []
  }
  if (!fs.existsSync(zonesDir) || !fs.statSync(zonesDir).isDirectory()) return []

  const hits = []
  for (const name of fs.readdirSync(zonesDir).sort()) {
    if (!name.endsWith('.md')) continue
    const file = path.join(zonesDir, name)
    let raw
    try {
      raw = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }
    let data
    try {
      ;({ data } = parseFrontmatter(raw))
    } catch {
      continue
    }
    if (data.type !== 'zone' && data.type !== undefined) continue
    if (isLegalVerifiedAt(data.verifiedAt)) continue
    // missing/empty also handled by adopt honesty; migrate only rewrites
    // present-but-illegal values so we do not thrash empty greenfield cards
    // that adopt already fixed — but ISO and garbage are always rewritten.
    if (data.verifiedAt === undefined || data.verifiedAt === null || data.verifiedAt === '') {
      continue
    }
    hits.push({
      file,
      rel: path.relative(repoRoot, file),
      verifiedAt: data.verifiedAt,
      raw,
    })
  }
  return hits
}

/**
 * @param {string} repoRoot
 * @returns {Array<{ action: string, path: string, detail?: string }>}
 */
export function plan(repoRoot) {
  return scan(repoRoot).map((h) => ({
    action: 'rewrite',
    path: h.rel,
    detail: `verifiedAt ${JSON.stringify(h.verifiedAt)} → unverified`,
  }))
}

/**
 * @param {string} repoRoot
 * @returns {{ changed: string[] }}
 */
export function apply(repoRoot) {
  const changed = []
  for (const h of scan(repoRoot)) {
    try {
      const next = setFrontmatterField(h.raw, 'verifiedAt', 'unverified')
      fs.writeFileSync(h.file, next)
      changed.push(h.rel)
    } catch {
      /* leave for human / adopt */
    }
  }
  return { changed }
}

export const migration = {
  id: '0002-rewrite-iso-verifiedAt',
  target: '0.5.4',
  describe: 'Rewrite illegal ISO/garbage verifiedAt on zone cards to unverified',
  plan,
  apply,
}
