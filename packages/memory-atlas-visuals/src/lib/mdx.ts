/**
 * mdx.ts — Vite glob loader for MDX digests.
 *
 * The digests live in syndcast-mind/visuals/<folder>/, i.e. one level ABOVE
 * the app/ root. This file is at app/src/lib/mdx.ts, so the path back to a
 * digest is THREE `../` (lib → src → app → visuals):
 *   ../../../ideas/my-idea.mdx
 *   ../../../tech-debt/some-debt.mdx
 *
 * import.meta.glob resolves these relative to THIS file, exactly as the dev
 * server and the production build do. The app/ sub-tree (including its own
 * node_modules) is excluded so we never pull a packaged .mdx (Ouroboros guard).
 *
 * loadByRoute(folder, slug) resolves the matching lazy import.
 */

import type { ComponentType } from 'react'

// import.meta.glob returns { [key]: () => Promise<module> } by default (lazy).
const modules = import.meta.glob(['../../../**/*.mdx', '!../../../app/**'])

/** All digest content lives under illustrated/<skin>/; `default` is the base/fallback tree. */
export const DEFAULT_SKIN_DIR = 'default'

/**
 * Convert a folder+slug pair to the module key used by import.meta.glob.
 * Keys are relative to this file (src/lib/mdx.ts):
 *   ../../../illustrated/<skin>/<folder>/<slug>.mdx   (skin defaults to `default`)
 * Every skin — including the fallback `default` — has its own tree, grouped by skin,
 * so an origin folder is never cluttered with one file per skin.
 */
export function routeToModuleKey(
  folder: string,
  slug: string,
  skin: string = DEFAULT_SKIN_DIR,
): string {
  return `../../../illustrated/${skin}/${folder}/${slug}.mdx`
}

/**
 * Lazily import the MDX module for a given route.
 *
 * Many mode: pass the active `skin` to try `illustrated/<skin>/…` first and fall back to
 * `illustrated/default/…`. Single mode: omit `skin` (default tree only). Returns the
 * dynamic-import promise or null if neither key exists in the glob map.
 */
export async function loadByRoute(
  folder: string,
  slug: string,
  skin?: string,
): Promise<{ default: ComponentType } | null> {
  const keys =
    skin && skin !== DEFAULT_SKIN_DIR
      ? [routeToModuleKey(folder, slug, skin), routeToModuleKey(folder, slug)]
      : [routeToModuleKey(folder, slug)]
  for (const key of keys) {
    const loader = modules[key]
    if (loader) return (await loader()) as { default: ComponentType }
  }
  return null
}

/**
 * All available module keys (for debugging / route generation).
 */
export function availableModuleKeys(): string[] {
  return Object.keys(modules)
}

/**
 * Actionable message for "route is in the manifest but its .mdx module is absent
 * from the glob map". This only happens in dev: digests live OUTSIDE app/, so a
 * `.mdx` added after the server booted isn't in the boot-time import.meta.glob
 * snapshot. The `watch-external-digests` plugin (vite.config.ts) normally
 * full-reloads to re-glob; this hint is the defense-in-depth fallback if a reader
 * still hits the gap. Says WHY + the one-step fix, not just "not found".
 */
export function missingModuleHint(folder: string, slug: string): string {
  return (
    `Digest /${folder}/${slug} is in the manifest but not in the running dev ` +
    `server's module graph — a new .mdx added since the server booted. Digests ` +
    `live outside app/, so Vite doesn't always hot-watch them. Restart the dev ` +
    `server (pnpm dev) to re-scan, then reload.`
  )
}
