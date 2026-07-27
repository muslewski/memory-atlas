/**
 * types.ts — canonical ManifestEntry shape for the Mind Visuals app.
 *
 * This interface mirrors FIELD-FOR-FIELD what `scripts/build-manifest.mjs`
 * writes into `src/gallery/manifest.json`. Sourced from:
 *   - buildEntry() in build-manifest.mjs (core fields)
 *   - the second-pass joinOutbound() call (outbound)
 *   - kit/outbound.ts (OutboundLink shape)
 *
 * Gallery.tsx and IllustratedView.tsx each had an inline copy — those will import
 * this type once wired in a later task.
 */
import type { OutboundLink } from '../kit/outbound'

export type { OutboundLink }

export interface ManifestEntry {
  folder: string
  slug: string
  route: string
  title: string
  type: string | null
  status: string | null
  source: string
  hash: string
  /** Illustrated date (frontmatter `generated`), normalised to YYYY-MM-DD or null. */
  generated: string | null
  /** Repo HEAD at illustrated time (frontmatter `commit`) or null. */
  commit: string | null
  freshness: 'fresh' | 'stale' | 'missing'
  /** Visuals-relative path to a banner image, e.g. "files/stocks/2890762.jpg". Present only when frontmatter `hero` is set. */
  hero?: string
  /** Resolved outbound wikilinks from the source note. Always present in builder output; optional here for defensive typing against older manifest snapshots. */
  outbound?: OutboundLink[]
}
