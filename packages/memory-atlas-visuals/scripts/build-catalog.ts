/**
 * scripts/build-catalog.ts
 * Run: tsx scripts/build-catalog.ts  (or pnpm catalog)
 *
 * Walks src/kit/meta/*.meta.ts, extracts every PrimitiveMeta export, sorts
 * by category then name, and writes kit-catalog.json.
 */
import { readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const metaDir = resolve(__dirname, '../src/kit/meta')
const outPath = resolve(__dirname, '../kit-catalog.json')

const CATEGORY_ORDER = ['typography', 'data', 'orientation', 'motion', 'structure'] as const

async function main() {
  const files = readdirSync(metaDir)
    .filter((f) => f.endsWith('.meta.ts'))
    .sort()

  const primitives: Array<Record<string, unknown>> = []

  for (const file of files) {
    const filePath = join(metaDir, file)
    const url = pathToFileURL(filePath).href
    const mod = await import(url)

    // Collect every exported value that looks like a PrimitiveMeta
    for (const value of Object.values(mod)) {
      if (value && typeof value === 'object' && 'category' in value && 'name' in value) {
        primitives.push(value as Record<string, unknown>)
      }
    }
  }

  // Sort by category order then name alphabetically
  primitives.sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category as (typeof CATEGORY_ORDER)[number])
    const catB = CATEGORY_ORDER.indexOf(b.category as (typeof CATEGORY_ORDER)[number])
    if (catA !== catB) return catA - catB
    return String(a.name).localeCompare(String(b.name))
  })

  const catalog = {
    generated: new Date().toISOString(),
    primitives,
  }

  writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf-8')

  // Summary
  const counts: Record<string, number> = {}
  for (const p of primitives) {
    const cat = String(p.category)
    counts[cat] = (counts[cat] ?? 0) + 1
  }
  console.log(`kit-catalog.json written — ${primitives.length} primitives`)
  for (const cat of CATEGORY_ORDER) {
    console.log(`  ${cat}: ${counts[cat] ?? 0}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
