import { resolveAtlasPaths } from './lib/paths.mjs'
const __atlasPaths = resolveAtlasPaths()
/**
 * check-illustrated.ts — fail if an illustrated note uses a data primitive in a way that
 * renders SILENTLY EMPTY. The kit primitives Metrics/Gist/Ledger/Timeline/
 * Takeaways take children (or, forgivingly, an `items=` prop). A self-closing
 * tag with no `items=`, or an empty `<Comp></Comp>`, renders nothing with no
 * error — the exact trap that bit two illustrated notes. This lint makes it loud.
 *
 * Run: pnpm check:illustrated
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compile } from '@mdx-js/mdx'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { walkDigests } from './lib/illustrated'

const DATA_PRIMITIVES = ['Metrics', 'Gist', 'Ledger', 'Timeline', 'Takeaways']

// Compile a digest with the SAME MDX options as vite.config.ts, so a parse error
// (e.g. a `{…}` that MDX reads as a JS expression, or a code span broken across a
// newline) fails this gate instead of shipping silently and only exploding when a
// reader navigates to that route (vite compiles digests lazily, per-route).
// Returns an error string, or null if it compiles.
export async function findCompileError(text: string): Promise<string | null> {
  try {
    await compile(text, { remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter] })
    return null
  } catch (err) {
    const e = err as { line?: number; column?: number; reason?: string; message?: string }
    const pos = e.line ? ` (${e.line}:${e.column})` : ''
    return (
      `MDX will not compile${pos}: ${(e.reason || e.message || '').split('\n')[0]}. ` +
      `Most often a literal \`{\` MDX reads as a JS expression — wrap code containing braces in a ` +
      `single-line inline-code span (\`like({ this })\`), never let a code span break across a newline.`
    )
  }
}

/**
 * Pure detector — returns a list of issue strings for one digest's source text.
 * Exported so it can be unit-tested without the filesystem.
 */
export function findDigestIssues(text: string): string[] {
  const issues: string[] = []
  for (const comp of DATA_PRIMITIVES) {
    // self-closing `<Comp ... />` that carries no `items=` → empty render
    for (const m of text.matchAll(new RegExp(`<${comp}\\b[^>]*?/>`, 'g'))) {
      if (!/\bitems\s*=/.test(m[0])) {
        issues.push(
          `<${comp} … /> is self-closing with no \`items=\` → renders EMPTY. Pass children (e.g. <${comp}>…</${comp}>) or an items= array.`,
        )
      }
    }
    // `<Comp …></Comp>` with nothing between → empty render
    for (const _m of text.matchAll(new RegExp(`<${comp}\\b[^>]*?>\\s*</${comp}>`, 'g'))) {
      issues.push(
        `<${comp}>…</${comp}> is empty → renders nothing. Add children or an items= array.`,
      )
    }
  }
  // CodeBlock inside a Cards grid → cramped/clipped code (cards are narrow,
  // multi-column). Code needs the full content width — put CodeBlocks at top level.
  for (const m of text.matchAll(/<Cards\b[\s\S]*?<\/Cards>/g)) {
    if (/<CodeBlock\b/.test(m[0])) {
      issues.push(
        '<CodeBlock> inside <Cards> → code is cramped/clipped in the narrow multi-column grid. Move CodeBlocks to the full content width (top level of the Section), not inside Cards.',
      )
    }
  }
  return issues
}

// ── CLI ────────────────────────────────────────────────────────────────────
function isMainModule() {
  return process.argv[1] && import.meta.url === `file://${process.argv[1]}`
}

if (isMainModule()) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const visualsDir = __atlasPaths.visualsDir

  function walkMdx(dir: string, out: string[] = []): string[] {
    for (const e of readdirSync(dir)) {
      if (e === 'node_modules' || e === 'dist' || e === '.git' || e === 'app') continue
      const p = join(dir, e)
      const s = statSync(p)
      if (s.isDirectory()) walkMdx(p, out)
      else if (p.endsWith('.mdx')) out.push(p)
    }
    return out
  }

  const files = walkMdx(visualsDir)

  // The corpus lives at visuals/illustrated/<theme>/. The old visuals/skins/ path is
  // retired — but mind-skin and any autopilot spec-skin still write there from memory,
  // and a stray .mdx at the old path is INVISIBLE to the glob rather than an error.
  // Fail loudly instead of losing an illustration.
  const legacyDir = join(visualsDir, 'skins')
  if (existsSync(legacyDir)) {
    const strays = walkDigests(legacyDir)
    if (strays.length > 0) {
      console.error(
        `check:illustrated — ${strays.length} .mdx still under the retired visuals/skins/ path:\n` +
          strays.map((f) => `    ${f}`).join('\n') +
          `\n  The corpus moved to visuals/illustrated/<theme>/. Move these:\n` +
          `    git mv syndcast-mind/visuals/skins/<theme>/<origin>/<slug>.mdx syndcast-mind/visuals/illustrated/<theme>/<origin>/<slug>.mdx\n` +
          `  (An .mdx at the old path is not an error to the glob — it is simply never loaded.)`,
      )
      process.exit(1)
    }
  }

  let bad = 0
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    const issues = findDigestIssues(text)
    const compileErr = await findCompileError(text)
    if (compileErr) issues.push(compileErr)
    if (issues.length) {
      bad += issues.length
      console.error(`✗ ${f}`)
      for (const i of issues) console.error(`    ${i}`)
    }
  }

  // Cross-file: the note's diagram is shared across skins. If content.shareDiagram is
  // on (default), a per-skin override must not DROP a <Diagram> its illustrated/default has.
  let shareDiagram = true
  try {
    const cfg = readFileSync(resolve(__dirname, '../visuals.config.ts'), 'utf8')
    const m = cfg.match(/shareDiagram\s*:\s*(true|false)/)
    if (m) shareDiagram = m[1] === 'true'
  } catch {
    /* default true */
  }

  if (shareDiagram) {
    const illustratedRoot = join(visualsDir, 'illustrated')
    const hasDiagram = (f: string): boolean => /<Diagram\b/.test(readFileSync(f, 'utf8'))
    for (const f of files) {
      if (!f.startsWith(`${illustratedRoot}/`)) continue
      const [skin, ...rest] = f.slice(illustratedRoot.length + 1).split('/')
      if (skin === 'default' || rest.length === 0) continue
      const defaultFile = join(illustratedRoot, 'default', rest.join('/'))
      if (existsSync(defaultFile) && hasDiagram(defaultFile) && !hasDiagram(f)) {
        bad += 1
        console.error(`✗ ${f}`)
        console.error(
          '    per-skin override drops the <Diagram> its illustrated/default has → re-include the same <Diagram src="…"/> (shareDiagram is on), or set content.shareDiagram:false to allow per-skin diagrams.',
        )
      }
    }
  }

  if (bad) {
    console.error(
      `\ncheck:illustrated — ${bad} issue(s) across ${files.length} illustrated note(s)`,
    )
    process.exit(1)
  }
  console.log(
    `check:illustrated — OK (${files.length} illustrated notes scanned, all compile, no empty data blocks)`,
  )
}
