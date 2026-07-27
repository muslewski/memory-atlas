/**
 * mdx.ts — Vite glob loader for MDX digests under the consumer vault visuals/.
 *
 * Legacy in-tree: ../../../illustrated/... relative to this file.
 * Package: Vite plugin rewrites the glob to absolute ATLAS_VISUALS_ROOT paths;
 * we rekey by illustrated/... for stable lookup.
 */
import type { ComponentType } from 'react'
import { toVisualsRelativeKey } from './content-keys'

// import.meta.glob returns { [key]: () => Promise<module> } by default (lazy).
// Plugin may rewrite to absolute vault path; we index by illustrated/… suffix.
const modulesRaw = import.meta.glob(['../../../**/*.mdx', '!../../../app/**'])

/** Map visuals-relative key → loader (and keep raw keys for fallback). */
function buildModuleIndex(): Record<string, () => Promise<unknown>> {
  const out: Record<string, () => Promise<unknown>> = {}
  for (const [k, loader] of Object.entries(modulesRaw)) {
    out[k] = loader
    out[toVisualsRelativeKey(k)] = loader
  }
  return out
}

const modules = buildModuleIndex()

export const DEFAULT_SKIN_DIR = 'default'

/**
 * Visuals-relative key for a digest (preferred lookup).
 * illustrated/<skin>/<folder>/<slug>.mdx
 */
export function routeToVisualsKey(
  folder: string,
  slug: string,
  skin: string = DEFAULT_SKIN_DIR,
): string {
  return `illustrated/${skin}/${folder}/${slug}.mdx`
}

/** @deprecated use routeToVisualsKey — kept for tests that assert legacy shape */
export function routeToModuleKey(
  folder: string,
  slug: string,
  skin: string = DEFAULT_SKIN_DIR,
): string {
  return `../../../illustrated/${skin}/${folder}/${slug}.mdx`
}

export async function loadByRoute(
  folder: string,
  slug: string,
  skin?: string,
): Promise<{ default: ComponentType } | null> {
  const keys: string[] = []
  if (skin && skin !== DEFAULT_SKIN_DIR) {
    keys.push(routeToVisualsKey(folder, slug, skin), routeToModuleKey(folder, slug, skin))
  }
  keys.push(routeToVisualsKey(folder, slug), routeToModuleKey(folder, slug))
  for (const key of keys) {
    const loader = modules[key]
    if (loader) return (await loader()) as { default: ComponentType }
  }
  // Suffix search (absolute glob keys after rewrite)
  const suffix = `illustrated/${skin && skin !== DEFAULT_SKIN_DIR ? skin : DEFAULT_SKIN_DIR}/${folder}/${slug}.mdx`
  const suffixDefault = `illustrated/${DEFAULT_SKIN_DIR}/${folder}/${slug}.mdx`
  for (const s of [suffix, suffixDefault]) {
    for (const [k, loader] of Object.entries(modules)) {
      if (k.endsWith(s) || k.endsWith('/' + s)) {
        return (await loader()) as { default: ComponentType }
      }
    }
  }
  return null
}

export function availableModuleKeys(): string[] {
  return Object.keys(modules)
}

export function missingModuleHint(folder: string, slug: string): string {
  return (
    `Digest /${folder}/${slug} is in the manifest but not in the running dev ` +
    `server's module graph — a new .mdx added since the server booted, or the ` +
    `gallery cannot see ATLAS_VISUALS_ROOT / ATLAS_VAULT. Restart with ` +
    `ATLAS_VAULT=<vault> atlas-visuals dev after content changes.`
  )
}
