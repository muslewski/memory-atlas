import { createBrowserRouter, Navigate, useLocation, useParams } from 'react-router-dom'
import App from './App'
import CommentsIndex from './comments/CommentsIndex'
import DiagramExport from './dev/DiagramExport'
import Gallery from './gallery/Gallery'
import NoteNotFound from './note/NoteNotFound'
import NotePage from './note/NotePage'
import { noteHref, resolveLegacyPathname } from './note/note-route'
import { notesManifest } from './notes/notes-manifest'
import RouteError from './shell/RouteError'

// Dev-only: the SVG prerender source (no App shell → no nav/smoother). Stripped in prod.
const devRoutes = import.meta.env.DEV
  ? [{ path: '__diagram-export', element: <DiagramExport /> }]
  : []

/** `/source/specs/foo.md` → `/note/specs/foo` */
function SourceRedirect() {
  const params = useParams()
  return <Navigate to={noteHref(params['*'] ?? '')} replace />
}

/**
 * Legacy illustrated URLs (`/specs/foo`, `/ideas/bar`, …) → canonical `/note/…`.
 *
 * IRON: never silent-Navigate to `/` on miss. That made deep links look "broken"
 * when the preview dist was stale (new skin not in baked notes-manifest) and
 * would poison Atlas/memory-atlas share URLs. Unknown → honest NoteNotFound.
 */
function LegacyIllustratedRedirect() {
  const { pathname } = useLocation()
  const href = resolveLegacyPathname(pathname, notesManifest.notes)
  if (href) return <Navigate to={href} replace />
  return (
    <NoteNotFound
      pathname={pathname}
      hint="If you just added this skin, rebuild the gallery (pnpm preview rebuilds; long-running vite preview on :4555 does not auto-pick up new digests)."
    />
  )
}

export const router = createBrowserRouter([
  ...devRoutes,
  {
    path: '/',
    element: <App />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Gallery /> },
      { path: 'notes', element: <Navigate to="/" replace /> },
      { path: 'comments', element: <CommentsIndex /> },
      { path: 'note/*', element: <NotePage /> },
      { path: 'source/*', element: <SourceRedirect /> },
      // splat so nested vault folders (map/zones/foo) can still hit legacy resolve if ever linked
      { path: '*', element: <LegacyIllustratedRedirect /> },
    ],
  },
])
