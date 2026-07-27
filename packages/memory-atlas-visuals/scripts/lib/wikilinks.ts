/** Vault-relative path resolution for Obsidian-style [[wikilinks]]. */

export type Resolved = {
  raw: string
  slug: string
  path: string | null
  exists: boolean
  ambiguous: boolean
}

/** Bare slug from a [[…]] inner: drop |alias, #heading, ^block. Keeps folder/ path. */
export function stripLink(raw: string): string {
  return raw.split('|')[0].split('#')[0].split('^')[0].trim()
}

/** Replace fenced + inline code with blanks so [[]] inside code is not matched. */
function blankCode(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(`+)[^\n]*?\1/g, (m) => ' '.repeat(m.length))
}

const LINK_RE = /!?\[\[([^\]]+?)\]\]/g

/** Ordered, deduped inner-link strings from a markdown body (embeds included). */
export function extractBodyLinks(body: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const text = blankCode(body)
  for (const m of text.matchAll(LINK_RE)) {
    const inner = m[1]
    if (!seen.has(inner)) {
      seen.add(inner)
      out.push(inner)
    }
  }
  return out
}

/** YYYY-MM-DD prefix of a basename, or '' if none (for newest-date tiebreak). */
function datePrefix(relPath: string): string {
  const base = relPath.slice(relPath.lastIndexOf('/') + 1)
  const m = base.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : ''
}

/**
 * Resolve a note body's [[]] to vault-relative paths.
 * @param body - markdown source containing [[wikilinks]]
 * @param vaultRelPaths - vault-relative .md paths, e.g. 'specs/x.md'
 * @returns Resolved[] — one entry per unique wikilink found in body
 */
export function resolveOutbound(body: string, vaultRelPaths: string[]): Resolved[] {
  // Index by basename-without-ext and by full path-without-ext.
  // Also index by slug-part (basename with date prefix removed).
  const byBase = new Map<string, string[]>() // base -> relPaths
  const bySlug = new Map<string, string[]>() // slug (base with date removed) -> relPaths
  const byPath = new Map<string, string>() // 'folder/base' (no ext) -> relPath
  for (const p of vaultRelPaths) {
    if (!p.endsWith('.md')) continue
    const noExt = p.slice(0, -3)
    byPath.set(noExt, p)
    const base = noExt.slice(noExt.lastIndexOf('/') + 1)
    if (!byBase.has(base)) byBase.set(base, [])
    // biome-ignore lint/style/noNonNullAssertion: map entry created immediately before .push()
    byBase.get(base)!.push(p)

    // Also index by slug part (after date prefix)
    const slug = base.replace(/^\d{4}-\d{2}-\d{2}-/, '')
    if (slug !== base) {
      if (!bySlug.has(slug)) bySlug.set(slug, [])
      // biome-ignore lint/style/noNonNullAssertion: map entry created immediately before .push()
      bySlug.get(slug)!.push(p)
    }
  }

  return extractBodyLinks(body).map((raw) => {
    const slug = stripLink(raw)
    // 1. path-qualified exact match wins, no ambiguity.
    if (slug.includes('/') && byPath.has(slug)) {
      // biome-ignore lint/style/noNonNullAssertion: exact path match confirmed by byPath.has(slug) above
      return { raw, slug, path: byPath.get(slug)!, exists: true, ambiguous: false }
    }
    // 2. otherwise resolve by basename (last segment for path-style misses).
    const base = slug.slice(slug.lastIndexOf('/') + 1)
    let hits = byBase.get(base) ?? []
    // If no exact match, try slug-part (with date prefix stripped)
    if (hits.length === 0) {
      hits = bySlug.get(base) ?? []
    }
    if (hits.length === 0) return { raw, slug, path: null, exists: false, ambiguous: false }
    if (hits.length === 1) return { raw, slug, path: hits[0], exists: true, ambiguous: false }
    // 3. collision: newest date prefix, else first (sorted for determinism). Flag it.
    const chosen = [...hits].sort(
      (a, b) => datePrefix(b).localeCompare(datePrefix(a)) || a.localeCompare(b),
    )[0]
    return { raw, slug, path: chosen, exists: true, ambiguous: true }
  })
}
