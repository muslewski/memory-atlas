/** Group an array of entries by their `folder` property.
 *  Pure — no node imports; safe to import in browser bundles.
 */
export function groupByFolder<T extends { folder: string }>(entries: T[]): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const entry of entries) {
    // biome-ignore lint/suspicious/noAssignInExpressions: ??= initialise-and-push idiom, intent is clear
    ;(result[entry.folder] ??= []).push(entry)
  }
  return result
}
