/**
 * check-conflict-markers.ts — fail if any visuals source still carries an unresolved
 * git conflict marker.
 *
 * A conflicted file is, to Vite, just a syntax error: `<<<<<<< HEAD` inside a digest
 * or a scene produces an opaque parse failure in the dev overlay (e.g. "Failed to parse
 * JSON file, invalid JSON syntax found at position 42241") that names the plugin, not
 * the merge. The generated manifests are no longer tracked, so they can't conflict —
 * but every .mdx digest and .excalidraw scene still can, whenever two branches skin
 * near each other. Run: pnpm check:conflict-markers
 *
 * Only `<<<<<<<` and `>>>>>>>` are flagged. A bare `=======` line is legal markdown
 * (a setext H1 underline), so matching it would fire on healthy notes.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(__dirname, '..')

const ROOTS = [
  resolve(appDir, '../skins'), // the .mdx digests
  resolve(appDir, '../files'), // heroes + .excalidraw scenes + prerendered .svg
  resolve(appDir, 'src'),
  resolve(appDir, 'scripts'),
]

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.vite'])
const BINARY = /\.(jpg|jpeg|png|webp|avif|gif|ico|woff2?|ttf|mp4|pdf)$/i

// NB: written as `<{7}` rather than seven literal characters so this file — and the
// fixtures in its test — never trip the very check they implement.
const START = /^<{7}[ \t]/
const END = /^>{7}[ \t]/

export interface Conflict {
  line: number
  text: string
}

/** Every conflict-marker line in one file's text, 1-indexed. */
export function findConflictMarkers(text: string): Conflict[] {
  const out: Conflict[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (START.test(line) || END.test(line)) out.push({ line: i + 1, text: line.slice(0, 60) })
  }
  return out
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir)) {
    if (SKIP_DIRS.has(e)) continue
    const abs = join(dir, e)
    if (statSync(abs).isDirectory()) out.push(...walk(abs))
    else if (!BINARY.test(e)) out.push(abs)
  }
  return out
}

function main(): void {
  const files = ROOTS.flatMap(walk)
  let bad = 0
  for (const abs of files) {
    const hits = findConflictMarkers(readFileSync(abs, 'utf8'))
    if (!hits.length) continue
    bad++
    console.error(`✗ ${relative(appDir, abs)}`)
    for (const h of hits) console.error(`    ${h.line}: ${h.text}`)
  }
  if (bad) {
    console.error(`\ncheck:conflict-markers — ${bad} file(s) with an unresolved merge conflict`)
    process.exit(1)
  }
  console.log(`check:conflict-markers — OK (${files.length} files, no unresolved conflicts)`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
