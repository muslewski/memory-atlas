/**
 * Normalize Vite import.meta.glob keys so they work both:
 *  - legacy in-tree app (keys like ../../../files/diagrams/foo.excalidraw)
 *  - package install (absolute keys under ATLAS_VISUALS_ROOT / consumer vault)
 *
 * Consumers pass visuals-relative paths: files/diagrams/…, files/stocks/…
 * Digests: illustrated/<skin>/<folder>/<slug>.mdx
 */

/** Strip to a stable visuals-relative path when possible. */
export function toVisualsRelativeKey(globKey: string): string {
  const norm = globKey.replace(/\\/g, '/')
  // Absolute or any path containing these roots
  const filesIdx = norm.lastIndexOf('/files/')
  if (filesIdx !== -1) return norm.slice(filesIdx + 1) // files/...
  const illIdx = norm.lastIndexOf('/illustrated/')
  if (illIdx !== -1) return norm.slice(illIdx + 1) // illustrated/...
  // Legacy relative from src/lib: ../../../files|illustrated/...
  const leg = norm.replace(/^(\.\.\/)+/, '')
  if (leg.startsWith('files/') || leg.startsWith('illustrated/')) return leg
  return norm
}

/** Build a map keyed by visuals-relative paths. */
export function rekeyByVisualsPath<T>(raw: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {}
  for (const [k, v] of Object.entries(raw)) {
    out[toVisualsRelativeKey(k)] = v
  }
  return out
}

/** Lookup with leading-slash tolerance. */
export function lookupVisualsPath<T>(
  map: Record<string, T>,
  src: string | null | undefined,
): T | null {
  if (!src) return null
  const clean = src.replace(/^\/+/, '')
  return map[clean] ?? null
}
