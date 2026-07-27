/** One note, one URL. The view (illustrated vs source) is a `?view=` param on
 *  this URL, never a different route — that is what makes the toggle a *view*
 *  and not a *navigation*. */
export function noteHref(relPath: string): string {
  return `/note/${relPath.replace(/\.md$/, '')}`
}

export function relPathFromNoteParam(param: string): string {
  return `${param}.md`
}

/** Minimal note shape for legacy URL resolution (tests + router). */
export type NoteRouteRef = {
  relPath: string
  illustratedRoute: string | null
}

/**
 * Resolve a two-segment legacy URL (`/specs/foo`, formerly "illustrated route")
 * to the canonical `/note/…` href.
 *
 * Order:
 * 1. Exact match on `illustratedRoute` (digest snapshot path)
 * 2. Path synthesis: `/folder/slug` → vault `folder/slug.md` if that note exists
 *
 * Returns `null` when unknown — callers must **not** silently send the user home;
 * that made shared deep links look "broken" (stale preview / missing manifest).
 * Atlas / memory-atlas must keep the same contract: unknown path → honest miss.
 */
export function resolveLegacyPathname(
  pathname: string,
  notes: readonly NoteRouteRef[],
): string | null {
  const path = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname

  const byIll = notes.find((n) => n.illustratedRoute === path)
  if (byIll) return noteHref(byIll.relPath)

  // `/folder/slug` or `/folder/nested/slug` → vault-relative .md
  const m = /^\/(.+)$/.exec(path)
  if (!m || !m[1] || m[1].includes('..')) return null
  const rel = `${m[1]}.md`
  const byRel = notes.find((n) => n.relPath === rel)
  if (byRel) return noteHref(byRel.relPath)

  return null
}
