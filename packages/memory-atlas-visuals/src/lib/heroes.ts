/**
 * heroes.ts — resolve a digest's frontmatter `hero` path to a bundled image URL.
 *
 * Paths are visuals-relative (`files/stocks/….jpg`). Glob is rewritten to the
 * consumer vault by `atlas-rewrite-content-globs` when packaged.
 */
import { lookupVisualsPath, rekeyByVisualsPath } from './content-keys'

const urlsGlob = import.meta.glob('../../../files/**/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const urls = rekeyByVisualsPath(urlsGlob)

export function resolveHero(heroPath?: string | null): string | null {
  return lookupVisualsPath(urls, heroPath)
}
