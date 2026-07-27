/**
 * heroes.ts — resolve frontmatter `hero` path to a bundled image URL.
 */
import { lookupVisualsPath, rekeyByVisualsPath } from './content-keys'
import virtualHeroes from 'virtual:atlas-heroes'

const legacy = import.meta.glob('../../../files/**/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const urls: Record<string, string> = {
  ...rekeyByVisualsPath(legacy),
  ...(virtualHeroes as Record<string, string>),
}

export function resolveHero(heroPath?: string | null): string | null {
  return lookupVisualsPath(urls, heroPath)
}
