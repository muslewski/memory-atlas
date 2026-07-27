/**
 * icon-aliases.ts — map the 14 legacy hand-sprite names to their lucide
 * kebab-case equivalents so existing <Icon name> usages keep working after the
 * sprite is replaced by lucide-react. Names not in the map pass through
 * unchanged — any lucide icon name is valid.
 *
 * The map lives in icon-aliases.json so the build-time guard (scripts/check-icons.mjs,
 * a plain .mjs that can't import this .ts) reads the SAME source — no drift.
 */
import aliases from './icon-aliases.json'

export const ICON_ALIASES: Record<string, string> = aliases

/** Resolve a kit icon name to its lucide name (alias if mapped, else passthrough). */
export function resolveIconName(name: string): string {
  return ICON_ALIASES[name] ?? name
}
