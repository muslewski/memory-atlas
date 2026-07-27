import { resolveAtlasPaths } from './lib/paths.mjs'
const __atlasPaths = resolveAtlasPaths()
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { OutboundLink } from '../src/gallery/types'
import { noteHref } from '../src/note/note-route'
import { parseFrontmatter } from '../src/notes/frontmatter'
import { groupOf } from '../src/notes/note-groups'
import { resolveOutbound } from './lib/wikilinks'

export interface NoteMeta {
  relPath: string
  title: string
  type?: string
  status?: string
  date?: string
  group: string
  illustrated: boolean
  illustratedRoute: string | null
  /** Resolved outbound wikilinks from the source note (manifest-derived; never computed at runtime). */
  outbound: OutboundLink[]
}

function titleFor(
  rel: string,
  raw: string,
  fm: ReturnType<typeof parseFrontmatter>['data'],
): string {
  if (fm.title) return fm.title
  const h1 = /^#\s+(.+)$/m.exec(raw)
  if (h1) return h1[1].trim()
  // biome-ignore lint/style/noNonNullAssertion: filename always has extension
  const base = rel.split('/').pop()!.replace(/\.md$/, '')
  return base
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Pure core — injected file list + reader + digest entries, so it is unit-testable. */
export function buildNotesManifest(opts: {
  files: string[]
  read: (rel: string) => string
  digestEntries: { source?: string; route?: string }[]
  generated: string
  /** Full vault-relative .md paths (for wikilink resolution index). */
  vaultRelPaths: string[]
}): { generated: string; notes: NoteMeta[] } {
  const bySource = new Map(
    // biome-ignore lint/style/noNonNullAssertion: filtered to entries with source above
    opts.digestEntries.filter((e) => e.source).map((e) => [e.source!, e.route ?? null]),
  )
  const baseNotes = opts.files
    .filter((rel) => !rel.startsWith('visuals/app/'))
    .map((rel) => {
      const raw = opts.read(rel)
      const { data } = parseFrontmatter(raw)
      return {
        relPath: rel,
        title: titleFor(rel, raw, data),
        type: data.type,
        status: data.status,
        date: data.date,
        group: groupOf(rel),
        illustrated: bySource.has(rel),
        illustratedRoute: bySource.get(rel) ?? null,
      }
    })
    .sort((a, b) => a.relPath.localeCompare(b.relPath))

  // Build lookup for target info (used to set illustrated flag + canonical route for outbound)
  const noteInfoByPath = new Map(
    baseNotes.map((n) => [
      n.relPath,
      { title: n.title, illustrated: n.illustrated, route: noteHref(n.relPath) },
    ]),
  )

  // Second pass: resolve every note's [[wikilinks]] using the shared resolver (same as
  // illustrated manifest), then map to OutboundLink using notes data (all 1,110, not 60).
  const notes: NoteMeta[] = baseNotes.map((base) => {
    const raw = opts.read(base.relPath)
    const resolved = resolveOutbound(raw, opts.vaultRelPaths)
    const outbound: OutboundLink[] = resolved.map((r) => {
      if (r.path) {
        const info = noteInfoByPath.get(r.path)
        if (info) {
          return {
            title: info.title,
            slug: r.slug,
            illustrated: info.illustrated,
            route: info.route,
          }
        }
      }
      return { title: r.slug, slug: r.slug, illustrated: false, route: null }
    })
    return { ...base, outbound }
  })

  return { generated: opts.generated, notes }
}

// ---- fs entry (not run in tests) ----
const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = __atlasPaths.appDir
const vaultDir = __atlasPaths.vaultDir // syndcast-mind/

function walkMd(dir: string, base = ''): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.git' || e === 'dist') continue
    const abs = join(dir, e)
    const rel = base ? `${base}/${e}` : e
    if (statSync(abs).isDirectory()) out.push(...walkMd(abs, rel))
    else if (e.endsWith('.md')) out.push(rel)
  }
  return out
}

function main() {
  const files = walkMd(vaultDir)
  const manifest = JSON.parse(readFileSync(resolve(appDir, 'src/gallery/manifest.json'), 'utf8'))
  const vaultRelPaths = files.filter((rel) => !rel.startsWith('visuals/app/'))
  const out = buildNotesManifest({
    files,
    read: (rel) => readFileSync(resolve(vaultDir, rel), 'utf8'),
    digestEntries: manifest.entries ?? [],
    generated: new Date().toISOString().slice(0, 10),
    vaultRelPaths,
  })
  writeFileSync(
    resolve(appDir, 'src/notes/notes-manifest.json'),
    `${JSON.stringify(out, null, 2)}\n`,
    'utf8',
  )
  console.log(`notes:manifest — ${out.notes.length} notes`)
}

// Only run main() when executed directly (not when imported by the test).
if (process.argv[1]?.endsWith('build-notes-manifest.ts')) main()
