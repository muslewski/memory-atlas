import { AnimatePresence, motion } from 'framer-motion'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useReducedMotion } from '../kit/useReducedMotion'
import { groupOf, prettyGroup } from '../notes/note-groups'
import { notesManifest } from '../notes/notes-manifest'
import { SourceBody } from '../source/SourceView'
import Connections from './Connections'
import IllustratedView from './IllustratedView'
import NoteNotFound from './NoteNotFound'
import { relPathFromNoteParam } from './note-route'
import './note-page.css'

/**
 * One note, one URL, two views.
 *
 * A note that HAS an illustration opens illustrated — it is the more considered
 * artifact, and a reader who wanted the raw file would have opened the raw file.
 * `?view=source` is the opt-out.
 *
 * A note with NO illustration renders source with NO toggle. 95% of the vault must
 * not look like it is missing something; it isn't.
 */
export default function NotePage() {
  const params = useParams()
  const relPath = relPathFromNoteParam(params['*'] ?? '')
  const [search, setSearch] = useSearchParams()
  const reduced = useReducedMotion()

  const meta = notesManifest.notes.find((n) => n.relPath === relPath)
  // Unknown /note/… path → honest miss (never empty shell that looks like home).
  if (!meta) {
    return <NoteNotFound pathname={`/note/${(params['*'] ?? '').replace(/\.md$/, '')}`} />
  }
  const illustrated = !!meta.illustrated && !!meta.illustratedRoute
  const view = illustrated && search.get('view') !== 'source' ? 'illustrated' : 'source'

  // '/specs/foo' → folder 'specs', slug 'foo'
  const [, folder, slug] = illustrated
    ? // biome-ignore lint/style/noNonNullAssertion: guarded by `illustrated`
      // biome-ignore lint/suspicious/noSparseArray: destructuring placeholder for ignored match[0]
      (/^\/([^/]+)\/(.+)$/.exec(meta!.illustratedRoute as string) ?? [, '', ''])
    : // biome-ignore lint/suspicious/noSparseArray: destructuring placeholder for ignored match[0]
      [, '', '']

  const setView = (next: 'illustrated' | 'source') => {
    const params = new URLSearchParams(search)
    if (next === 'source') params.set('view', 'source')
    else params.delete('view')
    setSearch(params, { replace: true })
  }

  const fade = reduced
    ? { initial: false, animate: {}, exit: {}, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.22, ease: 'easeOut' as const },
      }

  return (
    <main className="note-page" data-testid="note-page">
      {/* Same 860px measure as .snap-root — never full-bleed under the left TOC rail. */}
      <header className="note-page-chrome" data-testid="note-page-chrome">
        <nav className="note-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Notes</Link> <span aria-hidden>/</span>{' '}
          <span>{prettyGroup(groupOf(relPath))}</span>
        </nav>

        {illustrated && (
          /* biome-ignore lint/a11y/useSemanticElements: presentational view toggle (two buttons); fieldset would add form semantics we don't want */
          <div
            className="note-view-toggle"
            data-testid="view-toggle"
            data-view={view}
            role="group"
            aria-label="View"
          >
            <button
              type="button"
              aria-pressed={view === 'illustrated'}
              onClick={() => setView('illustrated')}
              data-testid="view-illustrated"
            >
              Illustrated
            </button>
            <button
              type="button"
              aria-pressed={view === 'source'}
              onClick={() => setView('source')}
              data-testid="view-source"
            >
              Source
            </button>
          </div>
        )}
      </header>

      <motion.div layout={!reduced}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={view} {...fade}>
            {view === 'illustrated' ? (
              <IllustratedView folder={folder} slug={slug} />
            ) : (
              <SourceBody relPath={relPath} />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <Connections relPath={relPath} />
    </main>
  )
}
