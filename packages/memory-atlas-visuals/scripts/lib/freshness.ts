import { createHash } from 'node:crypto'

/** First 12 hex chars of sha256. Stable for the same input. */
export function hash12(bytes: string | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 12)
}

/** Compare a stored hash against current file bytes.
 *  - 'missing'  — bytes gone OR the stored hash was never stamped (empty)
 *  - 'fresh'    — hash12(currentBytes) === storedHash
 *  - 'stale'    — hashes differ
 */
export function computeFreshness(
  storedHash: string,
  currentBytes: string | null,
): 'fresh' | 'stale' | 'missing' {
  if (currentBytes === null) return 'missing'
  if (!storedHash) return 'missing'
  return hash12(currentBytes) === storedHash ? 'fresh' : 'stale'
}
