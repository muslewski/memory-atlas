/**
 * Pure corpus / ownership checks (retrieval-shape + SSOT). No fs, no git —
 * callers inject resolvers (house pattern: lib/validate.mjs is pure,
 * lib/resolvers.mjs shells git). Ported logic from syndcast-mind's
 * corpus-quality checks; atlas config seams replace syndcast literals.
 */

/**
 * One artifact, one owner: a tracked file must not appear in more than one
 * mounted zone's expanded `owns.globs`. Unmounted zones are ignored (their
 * globs describe retired code). Exclude pathspecs never claim ownership —
 * `filesFor` already drops them / lets git subtract them.
 *
 * @param {Array<Record<string, unknown>>} zones
 * @param {(globs: string[]) => string[]} filesFor expand positive globs to tracked files
 * @returns {Array<{ zoneId: string, rule: string, message: string }>}
 */
export function findOwnershipConflicts(zones, filesFor) {
  const violations = []
  const fileOwners = new Map()

  for (const z of zones) {
    if (z.status === 'unmounted') continue
    const owns = z.owns ?? {}
    const globs = Array.isArray(owns.globs) ? owns.globs.map(String) : []
    for (const f of filesFor(globs)) {
      let owners = fileOwners.get(f)
      if (!owners) {
        owners = new Set()
        fileOwners.set(f, owners)
      }
      owners.add(String(z.id))
    }
  }

  for (const [file, owners] of fileOwners) {
    if (owners.size > 1) {
      const sorted = [...owners].sort()
      violations.push({
        zoneId: sorted[0],
        rule: 'dup-glob-file',
        message: `file "${file}" owned by ${sorted.length} zones: ${sorted.join(', ')}`,
      })
    }
  }

  return violations
}
