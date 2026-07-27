/**
 * heroes.ts — resolve a digest's frontmatter `hero` path to a bundled image URL.
 *
 * Hero images live in syndcast-mind/visuals/files/** (outside app/), and the
 * frontmatter stores a visuals-relative path, e.g. "files/stocks/2890762.jpg".
 * We import them through a Vite asset glob so the URL resolves in BOTH the dev
 * server and the production Rollup build (no /@fs hack, no 404). Keys are
 * relative to THIS file (src/lib/heroes.ts): ../../../files/<...>.
 */

const urls = import.meta.glob('../../../files/**/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/**
 * Resolve a visuals-relative hero path to its bundled URL, or null when the
 * path is empty or no matching asset was bundled.
 */
export function resolveHero(heroPath?: string | null): string | null {
  if (!heroPath) return null
  const clean = heroPath.replace(/^\/+/, '') // tolerate a leading slash
  return urls[`../../../${clean}`] ?? null
}
