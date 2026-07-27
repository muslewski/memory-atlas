import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import illustratedManifest from '../gallery/manifest.json'
import { resolveHero } from '../lib/heroes'
import { noteHref } from '../note/note-route'
import { notesManifest } from '../notes/notes-manifest'
import './comments-index.css'

type Comment = {
  file: string
  source: string
  route: string
  created: string
  title: string
  preview: string
  body: string
}

// source (vault-relative .md) → the NOTE. Covers all 1,110, not just the illustrated 60.
const noteBySource = new Map(notesManifest.notes.map((n) => [n.relPath, n]))

// The illustrated manifest contributes ONE thing: the hero image, when there is one.
const heroBySource = new Map(
  (illustratedManifest.entries as Array<{ source?: string; hero?: string }>)
    .filter((e) => e.source)
    .map((e) => [e.source as string, e.hero]),
)

function matches(c: Comment, q: string): boolean {
  if (!q) return true
  const hay = `${c.title} ${c.body} ${c.source}`.toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t))
}

const SHOWN = 5 // comments shown per card before the show-more toggle

export default function CommentsIndex({ comments: propComments }: { comments?: Comment[] } = {}) {
  const [fetched, setFetched] = useState<Comment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggle = (s: string) => setExpanded((e) => ({ ...e, [s]: !e[s] }))

  useEffect(() => {
    if (propComments !== undefined) {
      setLoaded(true)
      return
    }
    fetch('/api/raw-prompts')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Comment[]) => {
        setFetched(rows)
        setLoaded(true)
      })
      .catch(() => {
        setFetched([])
        setLoaded(true)
      })
  }, [propComments])

  const all = propComments !== undefined ? propComments : fetched

  // One card per commented source, newest activity first ("heat").
  const cards = useMemo(() => {
    const filtered = all.filter((c) => matches(c, q))
    const by = new Map<string, Comment[]>()
    for (const c of filtered) {
      const key = c.source || '(unknown source)'
      if (!by.has(key)) by.set(key, [])
      // biome-ignore lint/style/noNonNullAssertion: map entry set in the preceding by.set(key, []) branch
      by.get(key)!.push(c)
    }
    return [...by.entries()]
      .map(([source, items]) => {
        items.sort((a, b) => b.created.localeCompare(a.created))
        const note = noteBySource.get(source)
        const hero = heroBySource.get(source)
        return {
          source,
          items,
          latest: items[0],
          count: items.length,
          title: note?.title || source,
          route: note ? noteHref(note.relPath) : items[0].route || '',
          type: note?.type ?? null,
          hero: resolveHero(hero),
        }
      })
      .sort((a, b) => b.latest.created.localeCompare(a.latest.created))
  }, [all, q])

  const totalComments = all.length
  const shownComments = cards.reduce((n, c) => n + c.count, 0)

  return (
    <main className="comments-index" data-testid="comments-index">
      <header className="comments-head">
        <p className="comments-eyebrow">Marginalia</p>
        <h1>Comments</h1>
        <p className="comments-sub">
          Notes you wrote in the margin of a visual — newest activity first.{' '}
          {shownComments === totalComments
            ? `${totalComments}`
            : `${shownComments} of ${totalComments}`}{' '}
          comment
          {totalComments === 1 ? '' : 's'} across {cards.length} visual
          {cards.length === 1 ? '' : 's'}.
        </p>
        <input
          className="comments-search"
          data-testid="comments-search"
          type="search"
          placeholder="Search comments…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search comments"
        />
      </header>

      {loaded && totalComments === 0 && (
        <p className="comments-empty">
          No comments yet. Open a digest and use the ✎ button to write one. (Comments are saved by
          the dev server — a production build has none.)
        </p>
      )}
      {loaded && totalComments > 0 && cards.length === 0 && (
        <p className="comments-empty">No comments match “{q}”.</p>
      )}

      <div className="comments-grid">
        {cards.map((c) => {
          const isOpen = !!expanded[c.source]
          const shown = isOpen ? c.items : c.items.slice(0, SHOWN)
          const extra = c.count - SHOWN
          return (
            <article className="cmt-card" data-testid="comments-card" key={c.source}>
              {/* Header — small thumbnail + title, linking to the digest (where the ✎ drawer lives) */}
              <Link
                className="cmt-head"
                to={c.route || '/comments'}
                data-testid="comments-card-link"
                title={c.title}
              >
                {c.hero ? (
                  <img className="cmt-thumb" src={c.hero} alt="" loading="lazy" />
                ) : (
                  <span className="cmt-thumb cmt-thumb--blank" aria-hidden="true">
                    ✦
                  </span>
                )}
                <span className="cmt-headbox">
                  <span className="cmt-card-title">{c.title}</span>
                  <span className="cmt-card-meta">
                    {c.type && <span className="cmt-type">{c.type}</span>}
                    {c.count} comment{c.count === 1 ? '' : 's'} · {c.latest.created.slice(0, 10)}
                  </span>
                </span>
              </Link>

              {/* The notes themselves, hanging off a thread spine */}
              <ul className="cmt-thread">
                {shown.map((item) => (
                  <li className="cmt-note" key={item.file}>
                    {/* Links into the digest with the note pre-opened in the ✎ editor drawer. */}
                    <Link
                      className="cmt-note-link"
                      to={`${c.route}?comment=${encodeURIComponent(item.file)}`}
                      data-testid="comments-card-item"
                      title={`Edit “${item.title || 'note'}”`}
                    >
                      {item.title && <span className="cmt-note-title">{item.title}</span>}
                      <span className="cmt-note-body">
                        {item.preview}
                        {item.body.length > item.preview.length ? '…' : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {extra > 0 && (
                <button
                  type="button"
                  className="cmt-more"
                  data-testid="comments-card-more"
                  onClick={() => toggle(c.source)}
                >
                  {isOpen ? '− Show less' : `+ Show ${extra} more`}
                </button>
              )}
            </article>
          )
        })}
      </div>
    </main>
  )
}
