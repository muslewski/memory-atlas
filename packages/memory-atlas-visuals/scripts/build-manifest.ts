#!/usr/bin/env node
/**
 * build-manifest.ts
 *
 * Scans syndcast-mind/visuals/<folder>/<slug>.mdx (excluding app/), parses
 * frontmatter with gray-matter, reads the source .md, computes freshness, and
 * writes src/gallery/manifest.json.
 *
 * NOTE: This file + manifest.json are NO LONGER the gallery index (see Task 6).
 * manifest.json REMAINS the digest provenance ledger:
 *   - check:stale reads hash/commit/generated to decide fresh|stale|missing
 *   - Connections panel + outbound wikilink edges are built from it.
 * Do not delete or "clean up" — it is the source of truth for digest snapshots.
 */

import fs from 'node:fs'
import path from 'node:path'
import { resolveAtlasPaths } from './lib/paths.mjs'
const __atlasPaths = resolveAtlasPaths()
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import type { ManifestEntry, OutboundLink } from '../src/gallery/types'
import { noteHref } from '../src/note/note-route'
import { computeFreshness } from './lib/freshness'
import { type DigestRef, walkDigests } from './lib/illustrated'
import { resolveOutbound } from './lib/wikilinks'

// ── Local types ───────────────────────────────────────────────────────────────
type ResolvedRef = { slug: string; path: string | null; exists: boolean }
type DigestByPath = Map<string, { route: string; title: string }>
/** Intermediate shape — holds _resolvedOutbound until the second pass. */
type BuildingEntry = ManifestEntry & { _resolvedOutbound: ResolvedRef[] }
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise a frontmatter date to YYYY-MM-DD. gray-matter parses unquoted YAML
 *  dates into Date objects, which JSON.stringify would emit as a full ISO string. */
function isoDate(v: unknown): string | null {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).slice(0, 10)
}

/**
 * Join resolved wikilink targets to digest routes.
 * @param resolved - Wikilink resolution results from resolveOutbound
 * @param digestByPath - keyed by vault-rel .md path
 */
export function joinOutbound(resolved: ResolvedRef[], digestByPath: DigestByPath): OutboundLink[] {
  return resolved.map((r) => {
    const d = r.path ? digestByPath.get(r.path) : undefined
    // One note, one URL — every outbound link points at the canonical /note/<relPath>,
    // illustrated or not. `illustrated` still rides along so the panel can style the two
    // differently, but it no longer changes WHERE the link goes: the illustrated view is
    // a `?view=` on that one URL, not a route of its own.
    const route = r.path && (r.exists || d) ? noteHref(r.path) : null
    if (d) return { title: d.title, slug: r.slug, illustrated: true, route }
    return { title: r.slug, slug: r.slug, illustrated: false, route }
  })
}

/** Recursively list vault-relative .md paths (skip app, node_modules, .obsidian, dist, .git, visuals). */
function listVaultMd(dir: string, rootLen: number, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['app', 'node_modules', '.obsidian', 'dist', '.git', 'visuals'].includes(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) listVaultMd(p, rootLen, out)
    else if (p.endsWith('.md')) out.push(p.slice(rootLen))
  }
  return out
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_DIR = __atlasPaths.appDir
// Digests + assets live under the resolved visuals root (ATLAS_* / atlas.config)
const VISUALS_DIR = __atlasPaths.visualsDir
// Source .md notes live in the vault root
const VAULT_DIR = __atlasPaths.vaultDir

const OUT_PATH = path.join(APP_DIR, 'src', 'gallery', 'manifest.json')

function buildEntry({ folder, slug, mdxPath }: DigestRef, vaultRelPaths: string[]): BuildingEntry {
  const raw = fs.readFileSync(mdxPath, 'utf8')
  const { data: fm } = matter(raw)

  const route = `/${folder}/${slug}`
  const sourceRelative = (fm.source as string | undefined) ?? `${folder}/${slug}.md`
  const sourcePath = path.join(VAULT_DIR, sourceRelative)

  let sourceBytes: string | null = null
  try {
    sourceBytes = fs.readFileSync(sourcePath, 'utf8')
  } catch {
    // source .md missing — freshness will be 'missing'
  }

  const storedHash = (fm.hash as string | undefined) ?? ''
  const freshness = computeFreshness(storedHash, sourceBytes)

  const entry = {
    folder,
    slug,
    route,
    title: (fm.title as string | undefined) ?? slug,
    type: (fm.type as string | undefined) ?? null,
    status: (fm.status as string | undefined) ?? null,
    source: sourceRelative,
    hash: storedHash,
    generated: isoDate(fm.generated),
    commit: (fm.commit as string | undefined) ?? null,
    freshness,
  } as BuildingEntry
  if (fm.hero != null) entry.hero = fm.hero as string
  entry._resolvedOutbound = sourceBytes
    ? (resolveOutbound(sourceBytes, vaultRelPaths) as ResolvedRef[])
    : []

  return entry
}

function main(): void {
  const vaultRelPaths = listVaultMd(VAULT_DIR, VAULT_DIR.length + 1)
  const mdxFiles = walkDigests(path.join(VISUALS_DIR, 'illustrated', 'default'))
  const entries = mdxFiles.map((f) => buildEntry(f, vaultRelPaths))

  // Second pass: join _resolvedOutbound to digest routes now that all entries exist.
  const digestByPath: DigestByPath = new Map(
    entries.map((e) => [e.source, { route: e.route, title: e.title }]),
  )
  for (const e of entries) {
    e.outbound = joinOutbound(e._resolvedOutbound, digestByPath)
  }

  const finalEntries: ManifestEntry[] = entries.map(({ _resolvedOutbound: _drop, ...rest }) => rest)

  const manifest = {
    generated: new Date().toISOString(),
    entries: finalEntries,
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`)

  console.log(
    `manifest: ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} → ${path.relative(process.cwd(), OUT_PATH)}`,
  )
}

// Only run when executed directly (not imported by tests)
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) main()
