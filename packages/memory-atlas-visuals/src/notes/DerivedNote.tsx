import { Icon } from '../kit'
import {
  type DerivedHeading,
  deriveHeadings,
  deriveHook,
  deriveMetrics,
  deriveTags,
} from './derive'

/**
 * DerivedNote — tier 2 composition.
 *
 * Everything rendered here is derived, never authored: the hero from `title` + `summary`,
 * the metrics strip from real frontmatter fields, the tags from `tags`, the TOC from the
 * note's own h2/h3. It cannot drift, because there is no snapshot to drift from.
 *
 * A hand-authored digest (tier 3) supersedes this for the ~5% of notes that earn one — but
 * tier 2 has to stand on its own for the other 95%, and for every note in a stranger's
 * vault who will never author a digest at all.
 */
export function DerivedNote({
  data,
  body,
  relPath,
}: {
  data: Record<string, unknown>
  body: string
  relPath?: string
}) {
  const title = typeof data.title === 'string' ? data.title : undefined
  const hook = deriveHook(data)
  const metrics = deriveMetrics(data)
  const tags = deriveTags(data)
  const headings: DerivedHeading[] = deriveHeadings(body)

  return (
    <>
      <header className="derived-hero not-typeset">
        {title && <h1 className="derived-hero__title">{title}</h1>}
        {hook && <p className="derived-hero__hook">{hook}</p>}
        {metrics.length > 0 && (
          <dl className="derived-metrics" data-testid="derived-metrics">
            {metrics.map((m) => (
              <div className="derived-metric" key={m.label}>
                <dt>
                  <Icon name={m.icon} /> {m.label}
                </dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {tags.length > 0 && (
          <ul className="derived-tags" data-testid="derived-tags">
            {tags.map((t) => (
              <li key={t}>#{t}</li>
            ))}
          </ul>
        )}
        {relPath && <code className="derived-path">{relPath}</code>}
      </header>

      {headings.length > 0 && (
        <nav
          className="derived-toc not-typeset"
          data-testid="derived-toc"
          aria-label="On this note"
        >
          <ul>
            {headings.map((h) => (
              <li key={h.id} data-depth={h.depth}>
                <a href={`#${h.id}`}>{h.text}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  )
}
