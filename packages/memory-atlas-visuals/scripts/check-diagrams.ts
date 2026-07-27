/**
 * check-diagrams.ts — fail if any Excalidraw scene has an UNLABELED leaf box or
 * a label that OVERFLOWS its box. Catches the silent defect where a scene is valid
 * JSON (so nothing errors) but renders with empty boxes or shifted/clipped text.
 *
 * A box label is authored one of three supported ways, ALL accepted here because
 * the render path (renderSceneToSvg) expands the first two into real bound text:
 *   1. `label: { text }` SKELETON SHORTHAND on the shape (preferred — auto-centered,
 *      auto-wrapped by convertToExcalidrawElements). exportToSvg ignores it raw, so
 *      it ONLY renders because the export path expands it; an UNexpanded path would
 *      show an empty box (the original bug).
 *   2. a bound `text` element (containerId + the shape's boundElements ref).
 *   3. a free `text` element positioned over the box (the proven legacy pattern) —
 *      assigned to the SMALLEST container whose bounds contain its origin.
 *
 * Rules per container:
 *   - a LEAF box (does not fully CONTAIN another box) MUST have a label by one of
 *     the three means above. Else → EMPTY (the empty-box bug).
 *   - a free label whose text box extends horizontally beyond the container
 *     (> TOL px either side) → OVERFLOW (the "shifted left / not fitting" bug).
 *     Zero-width free text is skipped (the export path re-measures + wraps it).
 *
 * Group/lane boxes (that contain a sub-box) are exempt from EMPTY — they frame
 * children; a header is optional. Run: pnpm check:diagrams
 */
import { readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
import { resolveAtlasPaths } from './lib/paths.mjs'
const __atlasPaths = resolveAtlasPaths()
const appDir = __atlasPaths.appDir
const diagramsDir = __atlasPaths.diagramsDir // syndcast-mind/visuals/files/diagrams

const TOL = 4 // px slack for overflow (anti-aliasing / measurement noise)
const CONTAINER_TYPES = new Set(['rectangle', 'ellipse', 'diamond'])

interface ExcalidrawElement {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  isDeleted?: boolean
  text?: string
  backgroundColor?: string
  label?: { text?: string }
  boundElements?: { type: string }[]
}

interface EmptyDefect {
  id: string
  bg: string | undefined
  w: number
  h: number
}
interface OverflowDefect {
  id: string
  bg: string | undefined
  text: string
  boxW: number
  textW: number
}

const originInside = (t: ExcalidrawElement, b: ExcalidrawElement): boolean =>
  t.x >= b.x - TOL && t.x <= b.x + b.width + TOL && t.y >= b.y - TOL && t.y <= b.y + b.height + TOL
const area = (b: ExcalidrawElement): number => Math.max(1, b.width) * Math.max(1, b.height)
// B fully contains O (all corners inside). Used for group/leaf: a small box must NOT
// be called a "group" just because a big lane's CENTER lands in it.
const contains = (B: ExcalidrawElement, O: ExcalidrawElement): boolean =>
  O.x >= B.x && O.y >= B.y && O.x + O.width <= B.x + B.width && O.y + O.height <= B.y + B.height

/** Returns defects for one scene's elements */
export function auditScene(elements: ExcalidrawElement[]): {
  empty: EmptyDefect[]
  overflow: OverflowDefect[]
} {
  const live = (elements ?? []).filter((e) => !e.isDeleted)
  const boxes = live.filter((e) => CONTAINER_TYPES.has(e.type) && e.width > 0 && e.height > 0)
  const texts = live.filter((e) => e.type === 'text' && (e.text ?? '').trim() !== '')

  // Assign each FREE text to the smallest container whose bounds contain its origin
  // (origin, not center — zero-width text has center === origin at the box's left).
  const labelsOf = new Map<string, ExcalidrawElement[]>(boxes.map((b) => [b.id, []]))
  for (const t of texts) {
    let best: ExcalidrawElement | null = null
    for (const b of boxes) {
      if (!originInside(t, b)) continue
      if (!best || area(b) < area(best)) best = b
    }
    // biome-ignore lint/style/noNonNullAssertion: map initialised for every box in the preceding loop
    if (best) labelsOf.get(best.id)!.push(t)
  }

  const empty: EmptyDefect[] = []
  const overflow: OverflowDefect[] = []
  for (const b of boxes) {
    // biome-ignore lint/style/noNonNullAssertion: map initialised for every box in the preceding loop
    const labels = labelsOf.get(b.id)!
    const hasShorthand = !!b.label?.text // expanded into bound text by the export path
    const hasBound = (b.boundElements ?? []).some((x) => x.type === 'text')
    const isGroup = boxes.some((o) => o !== b && contains(b, o)) // frames a sub-box → header optional
    if (!labels.length && !hasShorthand && !hasBound && !isGroup)
      empty.push({ id: b.id, bg: b.backgroundColor, w: b.width, h: b.height })
    for (const t of labels) {
      const w = t.width ?? 0
      if (w <= 0) continue // export path re-measures + wraps zero-width text
      if (t.x < b.x - TOL || t.x + w > b.x + b.width + TOL)
        overflow.push({
          id: b.id,
          bg: b.backgroundColor,
          text: (t.text ?? '').slice(0, 40),
          boxW: b.width,
          textW: w,
        })
    }
  }
  return { empty, overflow }
}

function main(): void {
  const files = readdirSync(diagramsDir)
    .filter((f) => f.endsWith('.excalidraw') && !f.startsWith('_'))
    .sort()
  let bad = 0
  for (const f of files) {
    const scene = JSON.parse(readFileSync(join(diagramsDir, f), 'utf8')) as {
      elements: ExcalidrawElement[]
    }
    const { empty, overflow } = auditScene(scene.elements)
    if (!empty.length && !overflow.length) continue
    bad++
    console.error(`✗ ${basename(f)}`)
    for (const e of empty)
      console.error(`    EMPTY box  ${(e.bg || '?').padEnd(9)} ${e.w}×${e.h} — no label`)
    for (const o of overflow)
      console.error(
        `    OVERFLOW   ${(o.bg || '?').padEnd(9)} box w=${o.boxW} < text w=${o.textW}  ${JSON.stringify(o.text)}`,
      )
  }
  if (bad) {
    console.error(`\ncheck:diagrams — ${bad} scene(s) with unlabeled or overflowing boxes`)
    process.exit(1)
  }
  console.log(`check:diagrams — OK (${files.length} scenes, every leaf box labeled and fitted)`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
