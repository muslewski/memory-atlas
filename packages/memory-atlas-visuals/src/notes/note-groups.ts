/** Derive a display group from a note's vault-relative path. Top-level folder, except
 * `map/*` splits one level deeper (zones/decisions/gaps are distinct reader units).
 * NO hardcoded folder allow-list — any new folder groups itself. */
export function groupOf(relPath: string): string {
  const parts = relPath.split('/')
  if (parts.length < 2) return '(root)'
  if (parts[0] === 'map' && parts.length >= 3) return `${parts[0]}/${parts[1]}`
  return parts[0]
}

/** Humanize a group key for display: title-case each segment, join sub-groups with ·. */
export function prettyGroup(group: string): string {
  if (group === '(root)') return 'Root'
  return group
    .split('/')
    .map((seg) =>
      seg
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
    )
    .join(' · ')
}

/** Soft display order: common groups first, the rest alphabetical. A SORT HINT only —
 * groups not listed here are still included (appended), never filtered out. */
export const GROUP_ORDER = [
  'map/zones',
  'map/decisions',
  'map/gaps',
  'specs',
  'plans',
  'programs',
  'ideas',
  'tech-debt',
  'reports',
  'reference',
]

export function sortGroups(groups: string[]): string[] {
  const seen = new Set(groups)
  const head = GROUP_ORDER.filter((g) => seen.has(g))
  const rest = groups.filter((g) => !GROUP_ORDER.includes(g)).sort((a, b) => a.localeCompare(b))
  return [...head, ...rest]
}
