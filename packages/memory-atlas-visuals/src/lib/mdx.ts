/**
 * mdx.ts — load MDX digests from the consumer vault (virtual loaders + legacy glob).
 */
import type { ComponentType } from 'react'
import { toVisualsRelativeKey } from './content-keys'
import virtualMdx from 'virtual:atlas-mdx-loaders'

const legacy = import.meta.glob(['../../../**/*.mdx', '!../../../app/**']) as Record<
  string,
  () => Promise<unknown>
>

function buildIndex(): Record<string, () => Promise<unknown>> {
  const out: Record<string, () => Promise<unknown>> = {
    ...(virtualMdx as Record<string, () => Promise<unknown>>),
  }
  for (const [k, loader] of Object.entries(legacy)) {
    out[k] = loader
    out[toVisualsRelativeKey(k)] = loader
  }
  return out
}

const modules = buildIndex()

export const DEFAULT_SKIN_DIR = 'default'

export function routeToVisualsKey(
  folder: string,
  slug: string,
  skin: string = DEFAULT_SKIN_DIR,
): string {
  return `illustrated/${skin}/${folder}/${slug}.mdx`
}

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
  const preferred = [
    skin && skin !== DEFAULT_SKIN_DIR ? routeToVisualsKey(folder, slug, skin) : null,
    routeToVisualsKey(folder, slug),
    skin && skin !== DEFAULT_SKIN_DIR ? routeToModuleKey(folder, slug, skin) : null,
    routeToModuleKey(folder, slug),
  ].filter(Boolean) as string[]

  for (const key of preferred) {
    const loader = modules[key]
    if (loader) return (await loader()) as { default: ComponentType }
  }

  const suffixes = [
    skin && skin !== DEFAULT_SKIN_DIR
      ? `illustrated/${skin}/${folder}/${slug}.mdx`
      : null,
    `illustrated/${DEFAULT_SKIN_DIR}/${folder}/${slug}.mdx`,
  ].filter(Boolean) as string[]

  for (const s of suffixes) {
    for (const [k, loader] of Object.entries(modules)) {
      if (k === s || k.endsWith('/' + s) || k.endsWith(s)) {
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
    `Digest /${folder}/${slug} is missing from the module graph. ` +
    `Ensure ATLAS_VAULT / ATLAS_VISUALS_ROOT points at the vault and restart atlas-visuals dev.`
  )
}
