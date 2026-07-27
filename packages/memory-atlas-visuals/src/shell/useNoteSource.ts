import { useLocation } from 'react-router-dom'
// Same default import IllustratedView uses (src/note/IllustratedView.tsx line ~21).
// manifest is { generated, entries: ManifestEntry[] } — not a bare array.
import manifest from '../gallery/manifest.json'

interface ManifestEntry {
  folder: string
  slug: string
  source: string
}

/** Derive the durable vault source path (e.g. 'map/zones/timeline.md') from a route pathname.
 *  For /note/* this works for ANY note (illustrated or not) without a manifest lookup.
 *  Legacy two-segment illustrated routes still resolve via the (60-entry) manifest.
 */
export function noteSourceFromPath(pathname: string): string | null {
  // Canonical note URLs: /note/<relPath sans .md> → append .md for source key.
  if (pathname.startsWith('/note/')) {
    let rest = pathname.slice('/note/'.length)
    if (!rest) return null
    // strip trailing slash if any, but typically not
    if (rest.endsWith('/')) rest = rest.slice(0, -1)
    if (!rest) return null
    return rest.endsWith('.md') ? rest : `${rest}.md`
  }

  // Legacy illustrated routes (e.g. /backlog/BACKLOG) — only 60 of them exist.
  // /source/* are redirected before render, but tolerate a leading /source/ by stripping.
  let p = pathname
  if (p.startsWith('/source/')) p = p.slice('/source/'.length)
  if (p.startsWith('/')) p = p.slice(1)
  const segs = p.split('/').filter(Boolean)
  if (segs.length < 2) return null
  const [folder, slug] = segs
  if (!folder || !slug) return null
  // avoid treating /note or /comments or /source as legacy folder
  if (['note', 'comments', 'source'].includes(folder)) return null
  const entries = (manifest as unknown as { entries: ManifestEntry[] }).entries
  const entry = entries.find((e) => e.folder === folder && e.slug === slug) ?? null
  return entry?.source ?? null
}

export function useNoteSource(): string | null {
  const { pathname } = useLocation()
  return noteSourceFromPath(pathname)
}
