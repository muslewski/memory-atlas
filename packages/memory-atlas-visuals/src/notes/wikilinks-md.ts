// Strip alias/#heading/^block from a raw [[ref]] target, mirroring scripts/lib/wikilinks.ts.
function targetOf(raw: string): string {
  return raw.split('|')[0].split('#')[0].split('^')[0].trim()
}
function aliasOf(raw: string): string {
  const alias = raw.includes('|') ? raw.split('|')[1] : raw.split('#')[0].split('^')[0]
  return alias.trim()
}

/**
 * Replace [[target|alias]] with a markdown link when `resolve(target)` returns an href,
 * else leave the literal [[…]] (inert — Mind owns connections, never invent an edge).
 * Skips matches inside inline code spans and fenced code blocks by splitting on code
 * first and only transforming the non-code segments.
 */
export function linkifyWikilinks(body: string, resolve: (target: string) => string | null): string {
  const parts = body.split(/(```[\s\S]*?```|`[^`]*`)/g)
  return parts
    .map((seg, i) => {
      if (i % 2 === 1) return seg // odd segments are the captured code spans/fences
      return seg.replace(/\[\[([^\]]+)\]\]/g, (whole, inner) => {
        const href = resolve(targetOf(inner))
        if (!href) return whole
        return `[${aliasOf(inner)}](${href})`
      })
    })
    .join('')
}
