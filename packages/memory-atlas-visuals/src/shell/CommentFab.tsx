import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { formatPromptForCopy } from './formatPromptForCopy'
import { useNoteSource } from './useNoteSource'
import './comment-fab.css'

type Entry = { file: string; created: string; title: string; preview: string; body: string }
type View = 'list' | 'editor'

export default function CommentFab() {
  const source = useNoteSource()
  const { search } = useLocation()
  const [open, setOpen] = useState(false)
  const [existing, setExisting] = useState<Entry[]>([])
  const [view, setView] = useState<View>('list')
  const [query, setQuery] = useState('')

  // Editor (one note at a time). selected === null means a NEW note.
  const [selected, setSelected] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // List
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  // biome-ignore lint/correctness/useExhaustiveDependencies: openEntry is defined in component body and intentionally excluded — wrapping in useCallback would require further dep tracking; effect is correctly gated on source/search changes
  useEffect(() => {
    if (!source) return
    setView('list')
    setQuery('')
    setSelected(null)
    setDraftTitle('')
    setDraftBody('')
    setDeletingFile(null)
    fetch(`/api/raw-prompts?source=${encodeURIComponent(source)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Entry[]) => {
        setExisting(rows)
        // Deep-link: the Comments page links each note as <digest>?comment=<file> —
        // open the drawer straight into that note's editor.
        const target = new URLSearchParams(search).get('comment')
        const hit = target ? rows.find((e) => e.file === target) : undefined
        if (hit) {
          openEntry(hit)
          setOpen(true)
        }
      })
      .catch(() => setExisting([]))
  }, [source, search])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (view === 'editor') setView('list')
      else setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, view])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return existing
    return existing.filter((e) => `${e.title} ${e.body}`.toLowerCase().includes(q))
  }, [existing, query])

  if (!source) return null

  function load(): Promise<Entry[]> {
    // biome-ignore lint/style/noNonNullAssertion: source is truthy — the if (!source) return null guard at component level ensures this function is only reachable when source is set
    return fetch(`/api/raw-prompts?source=${encodeURIComponent(source!)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Entry[]) => {
        setExisting(rows)
        return rows
      })
      .catch(() => {
        setExisting([])
        return []
      })
  }

  const copy = (text: string): Promise<boolean> =>
    navigator.clipboard
      ?.writeText(text)
      .then(() => true)
      .catch(() => false) ?? Promise.resolve(false)

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function openNew() {
    setSelected(null)
    setDraftTitle('')
    setDraftBody('')
    setView('editor')
  }
  function openEntry(e: Entry) {
    setSelected(e.file)
    setDraftTitle(e.title)
    setDraftBody(e.body)
    setView('editor')
  }
  function backToList() {
    setView('list')
    setDeletingFile(null)
    load()
  }

  async function save() {
    if (!draftBody.trim() || isSaving) return
    setIsSaving(true)
    // biome-ignore lint/style/noNonNullAssertion: source is truthy — save() is only invoked via UI rendered under the if (!source) return null guard
    const prompt = formatPromptForCopy(source!, draftBody)
    try {
      const res = selected
        ? await fetch('/api/raw-prompt', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              file: selected,
              title: draftTitle || undefined,
              body: draftBody,
            }),
          })
        : await fetch('/api/raw-prompt', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              source,
              route: location.pathname,
              title: draftTitle || undefined,
              body: draftBody,
            }),
          })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        await load()
        // After creating a new note, keep editing it so further saves update, not duplicate.
        if (!selected && data?.path) setSelected(String(data.path).split('/').pop() || null)
        flash(selected ? 'Updated' : 'Saved')
      } else {
        // No dev server (prod/preview) — degrade to clipboard so capture is never lost.
        const copied = await copy(prompt)
        flash(copied ? 'No dev server — copied instead (not saved)' : 'Save failed (no dev server)')
      }
    } catch {
      const copied = await copy(prompt)
      flash(copied ? 'No dev server — copied instead (not saved)' : 'Save failed (no dev server)')
    }
    setIsSaving(false)
  }

  async function deleteRow(file: string) {
    try {
      const res = await fetch(`/api/raw-prompt?file=${encodeURIComponent(file)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await load()
        setDeletingFile(null)
        if (selected === file) openNew()
      } else flash('Delete failed')
    } catch {
      flash('Delete failed')
    }
  }

  const entryLabel = (e: Entry) => e.title || e.body.split('\n')[0].slice(0, 80) || e.file
  const entryMeta = (e: Entry) => e.created.slice(0, 16).replace('T', ' ')

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: internal gallery app, a11y refactor out of scope */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: internal gallery app, a11y refactor out of scope */}
      {open && <div className="cfab-backdrop" onClick={() => setOpen(false)} />}

      <aside
        className={`cfab-drawer${open ? ' cfab-drawer--open' : ''}`}
        role="dialog"
        aria-label="Comment prompts"
        aria-hidden={!open}
      >
        <div className="cfab-drawer-source">
          Commenting on: <code>{source}</code>
        </div>

        {view === 'list' ? (
          <div className="cfab-listview">
            <div className="cfab-list-top">
              <button
                type="button"
                data-testid="comment-new"
                className="cfab-new"
                onClick={openNew}
              >
                ＋ New note
              </button>
              <input
                data-testid="comment-search"
                className="cfab-search"
                placeholder={`Search ${existing.length} note${existing.length === 1 ? '' : 's'}…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {toast && <span className="cfab-toast">{toast}</span>}
            </div>
            <ul className="cfab-rows">
              {filtered.length === 0 && (
                <li className="cfab-empty">
                  {existing.length ? 'No matches' : 'No notes yet — start one.'}
                </li>
              )}
              {filtered.map((e) => (
                <li key={e.file} className="cfab-row">
                  <button
                    type="button"
                    data-testid="comment-entry"
                    className="cfab-row-main"
                    onClick={() => openEntry(e)}
                    title={entryLabel(e)}
                  >
                    <span className="cfab-row-title">{entryLabel(e)}</span>
                    <span className="cfab-row-meta">{entryMeta(e)}</span>
                  </button>
                  {deletingFile === e.file ? (
                    <span className="cfab-delete-confirm">
                      <button
                        type="button"
                        data-testid="comment-delete-confirm"
                        className="cfab-mini cfab-mini--danger"
                        onClick={() => deleteRow(e.file)}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="cfab-mini"
                        onClick={() => setDeletingFile(null)}
                      >
                        ✕
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-testid="comment-delete"
                      className="cfab-row-del"
                      aria-label="Delete note"
                      onClick={() => setDeletingFile(e.file)}
                    >
                      🗑
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="cfab-editor">
            <div className="cfab-editor-top">
              <button
                type="button"
                data-testid="comment-back"
                className="cfab-mini"
                onClick={backToList}
              >
                ← Notes
              </button>
              <span className="cfab-editor-mode">{selected ? 'Editing' : 'New note'}</span>
            </div>
            <input
              className="cfab-title"
              placeholder="title (optional)"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
            />
            <textarea
              data-testid="comment-textarea"
              className="cfab-editor-area"
              placeholder="Write a note about this source…"
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
            />
            <div className="cfab-editor-actions">
              <button
                type="button"
                data-testid="comment-save"
                className="cfab-save"
                onClick={save}
                disabled={isSaving}
              >
                {selected ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                data-testid="comment-copy"
                className="cfab-copy"
                // biome-ignore lint/style/noNonNullAssertion: source is truthy — this button only renders under the if (!source) return null guard
                onClick={() => copy(formatPromptForCopy(source!, draftBody))}
              >
                Copy prompt
              </button>
              <span className="cfab-spacer" />
              {toast && <span className="cfab-toast">{toast}</span>}
            </div>
          </div>
        )}
      </aside>

      {!open && (
        <div className="cfab-root">
          <button
            type="button"
            data-testid="comment-fab"
            className="cfab-btn"
            aria-label="Add a comment about this note"
            onClick={() => setOpen(true)}
          >
            ✎{existing.length > 0 && <span className="cfab-badge">{existing.length}</span>}
          </button>
        </div>
      )}
    </>
  )
}
