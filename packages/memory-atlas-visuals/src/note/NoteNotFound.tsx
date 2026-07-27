/**
 * Honest miss for unknown note / legacy paths.
 *
 * Never redirect unknown deep links to `/` — that looks like "the app ate my URL"
 * and is especially bad for shared illustrated links + Atlas promotion. Surface
 * the path and the canonical shape instead.
 */
import { Link } from 'react-router-dom'

export default function NoteNotFound({
  pathname,
  hint,
}: {
  pathname: string
  /** Optional extra line (e.g. stale preview rebuild). */
  hint?: string
}) {
  return (
    <main className="route-error" data-testid="note-not-found">
      <h1>Note not found</h1>
      <p>
        No vault note matches <code>{pathname}</code>.
      </p>
      {hint ? <p className="route-error-detail">{hint}</p> : null}
      <p>
        Canonical note URLs look like <code>/note/specs/your-slug</code> (source{' '}
        <code>specs/your-slug.md</code>). Legacy illustrated paths{' '}
        <code>/specs/your-slug</code> only resolve when that note is in the built
        notes manifest — rebuild the gallery if you just skinned a new note.
      </p>
      <p>
        <Link to="/">← Back to gallery</Link>
      </p>
    </main>
  )
}
