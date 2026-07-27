export interface FrontmatterData {
  title?: string
  type?: string
  status?: string
  date?: string
  tags?: string[]
}

const SCALAR_KEYS = ['title', 'type', 'status', 'date'] as const
const unquote = (v: string) => v.replace(/^['"]|['"]$/g, '').trim()

/**
 * Split a leading `---\n…\n---\n` YAML frontmatter block and parse the handful of
 * fields the reader surfaces (scalars + a `tags` list, inline `[a, b]` or block `- a`).
 * Deliberately tiny — no gray-matter/js-yaml. A `---` that is not the very first line
 * is body content, not frontmatter. Unknown keys are ignored.
 */
export function parseFrontmatter(raw: string): { data: FrontmatterData; body: string } {
  // Tolerate CRLF (`\r\n`) line endings — Obsidian notes saved on Windows would
  // otherwise miss the match, leaking raw YAML into the body AND poisoning the
  // build-time manifest (wrong title/group/type).
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!m) return { data: {}, body: raw }
  const block = m[1]
  const body = raw.slice(m[0].length)
  const data: FrontmatterData = {}
  const lines = block.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lines[i])
    if (!kv) continue
    const key = kv[1]
    const val = kv[2].trim()
    if ((SCALAR_KEYS as readonly string[]).includes(key)) {
      if (val) (data as Record<string, unknown>)[key] = unquote(val)
    } else if (key === 'tags') {
      if (val.startsWith('[')) {
        data.tags = val
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map((t) => unquote(t))
          .filter(Boolean)
      } else {
        const items: string[] = []
        for (let j = i + 1; j < lines.length; j++) {
          const li = /^\s*-\s*(.+)$/.exec(lines[j])
          if (!li) break
          items.push(unquote(li[1]))
        }
        if (items.length) data.tags = items
      }
    }
  }
  return { data, body }
}
