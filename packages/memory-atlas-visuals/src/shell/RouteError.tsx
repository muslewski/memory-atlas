/**
 * RouteError.tsx — route-level error boundary fallback.
 *
 * Wired as `errorElement` on the root route so a render/loader error in ANY
 * view (a digest that fails to compile, a source note that won't render, a
 * future route) degrades to a friendly in-shell message instead of white-
 * screening the whole gallery. This is the systemic backstop: one bad note can
 * never take down the app.
 */
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

export function routeErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Something went wrong rendering this view.'
}

export default function RouteError() {
  const error = useRouteError()
  return (
    <main className="route-error" data-testid="route-error">
      <h1>This view couldn’t be rendered</h1>
      <p>The rest of the gallery is fine — only this page hit an error.</p>
      <pre className="route-error-detail">{routeErrorMessage(error)}</pre>
      <p>
        <Link to="/">← Back to gallery</Link>
      </p>
    </main>
  )
}
