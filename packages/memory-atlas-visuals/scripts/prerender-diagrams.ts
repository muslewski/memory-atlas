/**
 * prerender-diagrams.ts — bake every Excalidraw scene to a committed static SVG so
 * reader pages ship ZERO Excalidraw (DiagramStatic injects the .svg directly).
 *
 * How: visits the dev server's /__diagram-export page (which runtime-renders each
 * scene to SVG via Excalidraw in the browser), reads each tagged <svg>, and writes
 * files/diagrams/<slug>.svg next to its .excalidraw.
 *
 * Usage:  pnpm dev   (in one terminal)   then   pnpm prerender:diagrams
 * Env:    BASE_URL (default http://localhost:4555)
 *
 * Requires Playwright (resolved from the workspace). For a standalone template:
 *   npm i -D playwright && npx playwright install chromium
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VISUALS_ROOT = resolve(__dirname, '../..') // syndcast-mind/visuals
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4555'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// biome-ignore lint/suspicious/noExplicitAny: playwright module type unavailable at import time, dynamic import
let chromium: any
try {
  ;({ chromium } = await import('playwright'))
} catch {
  console.error(
    '✗ Playwright not found. Install it: npm i -D playwright && npx playwright install chromium',
  )
  process.exit(1)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
try {
  await page.goto(`${BASE_URL}/__diagram-export`, { waitUntil: 'networkidle' })
  // Wait until every tagged block has produced an <svg>.
  await page.waitForFunction(
    () => {
      const blocks = [...document.querySelectorAll('[data-diagram-src]')]
      return blocks.length > 0 && blocks.every((b) => b.querySelector('svg'))
    },
    { timeout: 30000 },
  )

  const items: Array<{ src: string | null; svg: string | null }> = await page.$$eval(
    '[data-diagram-src]',
    (blocks: Element[]) =>
      blocks.map((b) => ({
        src: b.getAttribute('data-diagram-src'),
        svg: b.querySelector('svg')?.outerHTML ?? null,
      })),
  )

  let written = 0
  for (const { src, svg } of items) {
    if (!src || !svg) {
      console.warn(`  · skip (no svg): ${src}`)
      continue
    }
    const outRel = src.replace(/\.excalidraw$/, '.svg')
    const outAbs = resolve(VISUALS_ROOT, outRel)
    mkdirSync(dirname(outAbs), { recursive: true })
    writeFileSync(outAbs, `${svg}\n`, 'utf8')
    console.log(`  ✓ ${outRel}`)
    written++
  }
  console.log(`\nPrerendered ${written}/${items.length} diagram(s) → files/diagrams/*.svg`)
} finally {
  await browser.close()
}
