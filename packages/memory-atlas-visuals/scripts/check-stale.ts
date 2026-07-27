/**
 * check-stale.ts
 *
 * The cheap freshness gate: for every visuals/illustrated/<skin>/<folder>/<slug>.mdx digest,
 * compare the stored frontmatter `hash` against a fresh hash of the source .md NOW.
 * Never diffs content — same hash ⇒ fresh ⇒ skip; different ⇒ stale.
 *
 * Scans ALL skin trees under illustrated/* (not just the top-level visuals/ flat walk
 * that the old .mjs used — which saw 0 of 59 digests).
 *
 * Usage:
 *   tsx scripts/check-stale.ts            human report, exit 1 if any stale/missing
 *   tsx scripts/check-stale.ts --json     machine list (for the re-skin agent)
 *   tsx scripts/check-stale.ts --quiet    summary line only
 */

import fs from 'node:fs'
import path from 'node:path'
import { resolveAtlasPaths } from './lib/paths.mjs'
const __atlasPaths = resolveAtlasPaths()
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { computeFreshness, hash12 } from './lib/freshness'
import { walkDigests } from './lib/illustrated'

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VISUALS_DIR = __atlasPaths.visualsDir
const VAULT_DIR = __atlasPaths.vaultDir
const ILLUSTRATED_DIR = path.join(VISUALS_DIR, 'illustrated')

/** YYYY-MM-DD — gray-matter parses unquoted YAML dates into Date objects. */
function isoDate(v: unknown): string | null {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).slice(0, 10)
}

export interface StaleRow {
  route: string
  skin: string
  source: string
  freshness: 'fresh' | 'stale' | 'missing'
  // Extra fields used by the CLI reporter
  generated?: string | null
  storedHash?: string
  currentHash?: string | null
}

export function collectStaleRows(): StaleRow[] {
  const rows: StaleRow[] = []
  if (!fs.existsSync(ILLUSTRATED_DIR)) return rows
  for (const skin of fs.readdirSync(ILLUSTRATED_DIR, { withFileTypes: true })) {
    if (!skin.isDirectory()) continue
    const skinDir = path.join(ILLUSTRATED_DIR, skin.name)
    for (const ref of walkDigests(skinDir)) {
      const { data: fm } = matter(fs.readFileSync(ref.mdxPath, 'utf8'))
      const source = (fm.source as string) ?? `${ref.folder}/${ref.slug}.md`
      let currentBytes: string | null = null
      try {
        currentBytes = fs.readFileSync(path.join(VAULT_DIR, source), 'utf8')
      } catch {
        /* missing */
      }
      const storedHash = (fm.hash as string) ?? ''
      rows.push({
        route: `/${ref.folder}/${ref.slug}`,
        skin: skin.name,
        source,
        freshness: computeFreshness(storedHash, currentBytes),
        generated: isoDate(fm.generated),
        storedHash,
        currentHash: currentBytes === null ? null : hash12(currentBytes),
      })
    }
  }
  return rows
}

// CLI block — only runs when this file is the entry point, not when imported by tests
if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? '')) {
  const args = new Set(process.argv.slice(2))
  const asJson = args.has('--json')
  const quiet = args.has('--quiet')

  const rows = collectStaleRows()
  const stale = rows.filter((r) => r.freshness === 'stale')
  const missing = rows.filter((r) => r.freshness === 'missing')
  const drifted = stale.length + missing.length

  if (asJson) {
    process.stdout.write(`${JSON.stringify([...stale, ...missing], null, 2)}\n`)
    process.exit(drifted > 0 ? 1 : 0)
  }

  const summary = `visuals freshness: ${rows.length - drifted} fresh · ${stale.length} stale · ${missing.length} missing`
  if (!quiet) {
    for (const r of rows) {
      if (r.freshness === 'fresh') continue
      const tag = r.freshness === 'stale' ? 'STALE  ' : 'MISSING'
      const detail =
        r.freshness === 'stale'
          ? `source changed (${r.storedHash} → ${r.currentHash}) since ${r.generated ?? '?'}`
          : `source not found: ${r.source}`
      console.log(`  ${tag} ${r.route}  [${r.skin}]  —  ${detail}`)
    }
  }
  console.log(summary)
  if (drifted > 0 && !quiet) {
    console.log('\nRe-skin the above with the mind-skin skill (re-stamps hash/commit/generated).')
  }
  process.exit(drifted > 0 ? 1 : 0)
}
