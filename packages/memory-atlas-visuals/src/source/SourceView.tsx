import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { noteHref } from '../note/note-route'
import { DerivedNote } from '../notes/DerivedNote'
import { parseFrontmatter } from '../notes/frontmatter'
import { notesManifest } from '../notes/notes-manifest'
import { linkifyWikilinks } from '../notes/wikilinks-md'
import './source.css'

// Lazy raw glob of note-bearing vault dirs only — not `**` (see tech-debt
// 2026-06-24-source-view-bundles-all-vault-md). Keys are relative to this file
// (src/source/ → ../../../../ reaches the vault root at syndcast-mind/),
// normalised to vault-relative. Lazy so each note is only fetched on demand.
// Patterns must be string literals (Vite static analysis). Excludes
// human-drafts/, templates/, visuals/, llms.txt/, etc.
const PREFIX = '../../../../'
const rawNotes = import.meta.glob(
  [
    '../../../../specs/**/*.md',
    '../../../../ideas/**/*.md',
    '../../../../tech-debt/**/*.md',
    '../../../../plans/**/*.md',
    '../../../../programs/**/*.md',
    '../../../../map/**/*.md',
    '../../../../reports/**/*.md',
    '../../../../reference/**/*.md',
    '../../../../vision/**/*.md',
    '../../../../archive/**/*.md',
    '../../../../BACKLOG.md',
    '../../../../Home.md',
    '../../../../README.md',
  ],
  { query: '?raw', import: 'default' },
)
export const noteKeys = Object.keys(rawNotes).map((k) => k.slice(PREFIX.length))

/**
 * Security gate: the path must be (a) free of `..` and (b) an exact key of the
 * bundled glob. Only a path that was statically known at build time — and that
 * didn't escape the vault — can pass. Accepts an optional `keys` override so
 * unit tests can inject a predictable set without triggering real glob machinery.
 */
export function isAllowedNotePath(relPath: string, keys: string[] = noteKeys): boolean {
  if (relPath.includes('..')) return false
  return keys.includes(relPath)
}

/**
 * Coerce an import.meta.glob result into the raw string. Vite hands back the
 * module NAMESPACE ({ default: "<raw>" }) for a `?raw` import — so the value must
 * be unwrapped, never cast. Anything that isn't ultimately a string yields null,
 * so the caller shows the not-available state instead of crashing the renderer.
 */
export function extractRaw(mod: unknown): string | null {
  if (typeof mod === 'string') return mod
  if (
    mod &&
    typeof mod === 'object' &&
    typeof (mod as { default?: unknown }).default === 'string'
  ) {
    return (mod as { default: string }).default
  }
  return null
}

/**
 * Returns raw note content iff relPath is an allowed key; never touches /@fs.
 * The loader is keyed by the glob map, not by concatenating user input into a path.
 */
export async function loadNoteRaw(relPath: string): Promise<string | null> {
  if (!isAllowedNotePath(relPath)) return null
  const loader = rawNotes[PREFIX + relPath]
  return loader ? extractRaw(await loader()) : null
}

const undated = (s: string) => s.replace(/(^|\/)\d{4}-\d{2}-\d{2}-/, '$1')

/**
 * Resolve a [[wikilink]] target to a route. Every resolvable target now goes to the
 * canonical /note/<relPath> (one note, one URL). The view toggle (not the link target)
 * decides illustrated vs source.
 */
export function resolveTarget(target: string): string | null {
  const t = target.toLowerCase()
  const match = notesManifest.notes.find((n) => {
    // biome-ignore lint/style/noNonNullAssertion: split('/') always returns a non-empty array
    const slug = n.relPath.replace(/\.md$/, '').split('/').pop()!.toLowerCase()
    return slug === t || undated(slug) === undated(t)
  })
  return match ? noteHref(match.relPath) : null
}

export function SourceBody({ relPath }: { relPath: string }) {
  const [raw, setRaw] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    let ignore = false
    loadNoteRaw(relPath).then((b) => {
      if (!ignore) setRaw(b)
    })
    return () => {
      ignore = true
    }
  }, [relPath])

  if (raw === undefined) return <p>Loading…</p>
  if (raw === null) {
    return (
      <p>
        That note isn&apos;t available here. <Link to="/">Back to Notes</Link>
      </p>
    )
  }

  const { data, body } = parseFrontmatter(raw)
  const linked = linkifyWikilinks(body, resolveTarget)

  // Outer .source-view owns the column measure (same 860px as .snap-root / note chrome).
  // Without it, DerivedNote + article sit full-bleed while the Illustrated view is
  // centred — switching ?view=source "breaks" max-width. Atlas: one note, same column.
  return (
    <div className="source-view" data-testid="source-view">
      <DerivedNote data={data as Record<string, unknown>} body={body} relPath={relPath} />
      <article className="typeset typeset-measure note-md" data-testid="note-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug, rehypeSanitize]}>
          {linked}
        </ReactMarkdown>
      </article>
    </div>
  )
}
