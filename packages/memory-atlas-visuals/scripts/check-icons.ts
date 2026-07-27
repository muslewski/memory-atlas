/**
 * check-icons.ts — fail if any <Icon name="..."> literal in the MDX corpus or
 * the kit references a name that is neither a lucide icon nor a known alias.
 * Dynamic (non-literal) names are skipped with a notice. Run: pnpm check:icons
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
// Plain Node ESM: import the explicit file (lucide ships no exports map) and read
// the icon names from the dynamicIconImports map keys (no React in this script).
import dynamicIconImports from 'lucide-react/dynamicIconImports.mjs'
// Single source of truth for the alias map — same JSON the app's icon-aliases.ts
// imports, so the guard and the runtime can never drift.
import ICON_ALIASES from '../src/kit/icon-aliases.json' with { type: 'json' }

const iconNames = Object.keys(dynamicIconImports)

const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(__dirname, '..')
const visualsDir = resolve(appDir, '../..') // syndcast-mind/visuals

const resolveName = (n: string): string => (ICON_ALIASES as Record<string, string>)[n] ?? n
const known = new Set(iconNames)

// <Icon name="..."> literals (kit .tsx + digest .mdx).
const ICON_RE = /<Icon\b[^>]*?\bname=(?:"([^"]+)"|'([^']+)'|\{['"]([^'"]+)['"]\})/g
const DYNAMIC_RE = /<Icon\b[^>]*?\bname=\{(?!['"])/g
// `icon="..."` PROPS on kit components in digests (Card/Section/Metric/Callout)
// flow straight to <Icon name> at runtime — validate them too, else a bad name only
// surfaces as a browser console error. MDX-only: kit .tsx uses `icon` for prop type
// defs / forwarding, which aren't names.
const ICON_PROP_RE = /\bicon=(?:"([^"]+)"|'([^']+)'|\{['"]([^'"]+)['"]\})/g
const ICON_PROP_DYNAMIC_RE = /\bicon=\{(?!['"])/g

function walk(dir: string, exts: string[], out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist' || e === '.git') continue
    const p = join(dir, e)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, exts, out)
    else if (exts.some((x) => p.endsWith(x))) out.push(p)
  }
  return out
}

const mdxFiles = walk(visualsDir, ['.mdx'])
const kitFiles = walk(resolve(appDir, 'src/kit'), ['.tsx'])
const files = [...mdxFiles, ...kitFiles]

const bad: string[] = []
let dynamic = 0
const check = (src: string, f: string, re: RegExp): void => {
  for (const m of src.matchAll(re)) {
    const name = m[1] ?? m[2] ?? m[3]
    if (!known.has(resolveName(name))) bad.push(`${f}: "${name}"`)
  }
}
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  check(src, f, ICON_RE) // <Icon name="...">
  dynamic += [...src.matchAll(DYNAMIC_RE)].length
}
// icon="..." props are validated in digests only (see ICON_PROP_RE note above).
for (const f of mdxFiles) {
  const src = readFileSync(f, 'utf8')
  check(src, f, ICON_PROP_RE)
  dynamic += [...src.matchAll(ICON_PROP_DYNAMIC_RE)].length
}

if (dynamic)
  console.log(`check:icons — skipped ${dynamic} dynamic name={expr}/icon={expr} usage(s)`)
if (bad.length) {
  console.error(`check:icons — ${bad.length} unknown icon name(s):`)
  for (const b of bad) console.error(`  ${b}`)
  process.exit(1)
}
console.log(`check:icons — OK (${files.length} files scanned, all names valid)`)
