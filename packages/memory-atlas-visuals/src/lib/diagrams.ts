/**
 * diagrams.ts — resolve a <Diagram src> path to a parsed Excalidraw scene.
 *
 * Scenes live in syndcast-mind/visuals/files/diagrams/**.excalidraw (JSON),
 * outside app/. Imported through a Vite glob (raw text) so they resolve in dev
 * AND the Rollup build. Keys are relative to THIS file: ../../../files/<...>.
 * Mirrors heroes.ts.
 */
export interface ExcalidrawScene {
  type?: string
  version?: number
  elements: unknown[]
  appState?: Record<string, unknown>
  files?: Record<string, unknown>
}

const raw = import.meta.glob('../../../files/diagrams/**/*.excalidraw', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

// Author-time prerendered SVGs (committed next to each .excalidraw). When present,
// the inline embed injects this static SVG and NEVER loads Excalidraw — reader pages
// ship zero Excalidraw. Generate with `pnpm prerender:diagrams`. Optional: without it,
// DiagramStatic dynamically imports exportToSvg at runtime (graceful fallback).
const svgRaw = import.meta.glob('../../../files/diagrams/**/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

export function resolveDiagram(src?: string | null): ExcalidrawScene | null {
  if (!src) return null
  const clean = src.replace(/^\/+/, '')
  const text = raw[`../../../${clean}`]
  if (!text) return null
  try {
    const scene = JSON.parse(text) as ExcalidrawScene
    return Array.isArray(scene.elements) ? scene : null
  } catch {
    return null
  }
}

/** The committed static SVG for a scene, or null if not prerendered yet. */
export function resolvePrerenderedSvg(src?: string | null): string | null {
  if (!src) return null
  const clean = src.replace(/^\/+/, '').replace(/\.excalidraw$/, '.svg')
  return svgRaw[`../../../${clean}`] ?? null
}

/** Every scene's `files/diagrams/...excalidraw` src — used by the prerender route. */
export function allDiagramSrcs(): string[] {
  return Object.keys(raw).map((k) => k.replace('../../../', ''))
}

/**
 * Neutralize an Excalidraw SVG's intrinsic px size so its `viewBox` drives the
 * aspect ratio. Runtime `exportToSvg` emits explicit `width`/`height` ATTRIBUTES
 * (prebaked SVGs do not). Left in place, a CSS `width` with no CSS `height` makes
 * the rendered box aspect diverge from the viewBox, and `preserveAspectRatio="meet"`
 * letterboxes the drawing far off-centre — the fullscreen "white screen, diagram
 * way below" bug. Shared by the inline static render AND the fullscreen zoom so
 * every diagram — prebaked or runtime, now or future — sizes by viewBox.
 */
export function stripSvgIntrinsicSize(svg: SVGSVGElement): void {
  svg.removeAttribute('width')
  svg.removeAttribute('height')
  svg.style.height = 'auto'
  svg.style.display = 'block'
}

/**
 * True when a scene needs the Excalidraw element transform before export:
 *  - an element carries the `label: { text }` SKELETON SHORTHAND — `exportToSvg`
 *    renders only real `text` elements, so a label shorthand shows an EMPTY box
 *    until expanded into a bound text child (the empty-box bug).
 *  - a `text` element has a degenerate `width` (≤ 0) — it renders left-anchored
 *    and mis-centered ("text shifted left, not fitting") until re-measured.
 * Scenes already authored with sized, real text (the proven-working ones) skip the
 * transform entirely — their stored widths are accurate (measured in the Excalidraw
 * app with Virgil loaded), so exportToSvg's bounds are correct and need no fix-ups.
 * Only the shorthand / zero-width scenes go through convert, where re-measurement
 * happens without Virgil loaded and the viewBox needs growViewBoxToFitText after.
 */
export function sceneNeedsExpansion(elements: unknown[]): boolean {
  return elements.some((e) => {
    if (!e || typeof e !== 'object') return false
    const el = e as { type?: string; width?: number; label?: { text?: string } }
    if (el.label?.text) return true
    if (el.type === 'text' && !(typeof el.width === 'number' && el.width > 0)) return true
    return false
  })
}

// Text-element fields that, if present, make convertToExcalidrawElements treat the
// element as ALREADY converted and skip re-measuring it. We drop them so a free text
// becomes a true SKELETON that convert measures from its string.
const TEXT_IDENTITY_FIELDS = [
  'id',
  'seed',
  'version',
  'versionNonce',
  'width',
  'height',
  'updated',
  'index',
]

/**
 * Turn each FREE (non-container-bound) `text` element into a measurement skeleton —
 * drop its width/height and element identity so convertToExcalidrawElements RE-MEASURES
 * it from the string. Author-guessed widths under-state the real glyph advance, so the
 * export's bounding box comes out too small and the right edge CLIPS. Re-measuring is
 * the only reliable size; container-bound text (has containerId) is left untouched so
 * its binding survives.
 */
function normalizeForExport(elements: unknown[]): unknown[] {
  return elements.map((e) => {
    if (!e || typeof e !== 'object') return e
    const el = e as Record<string, unknown>
    if (el.type !== 'text' || el.containerId) return e
    const skeleton: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(el)) if (!TEXT_IDENTITY_FIELDS.includes(k)) skeleton[k] = v
    return skeleton
  })
}

/**
 * Render a scene to an SVG element via a DYNAMIC Excalidraw import (kept out of the
 * eager bundle). Expands `label` shorthand → bound text and re-measures all text
 * (see normalizeForExport) so labels center/wrap and the viewBox encloses every
 * glyph (no clipped right edge). `regenerateIds: false` preserves element ids,
 * keeping arrow bindings intact. Browser-only — measuring text needs the DOM.
 */
export async function renderSceneToSvg(scene: ExcalidrawScene): Promise<SVGSVGElement> {
  const mod = await import('@excalidraw/excalidraw')
  const needsExpansion = sceneNeedsExpansion(scene.elements)
  const elements = needsExpansion
    ? mod.convertToExcalidrawElements(normalizeForExport(scene.elements) as never, {
        regenerateIds: false,
      })
    : scene.elements
  const svg = await mod.exportToSvg({
    elements: elements as never,
    appState: { ...(scene.appState ?? {}), exportBackground: false } as never,
    files: (scene.files ?? null) as never,
  })
  // Only correct bounds for converted scenes: convert re-measures text without Virgil
  // loaded, so its viewBox under-shoots and clips. Passthrough scenes keep their
  // accurate exportToSvg bounds untouched (estimating would wrongly enlarge them).
  if (needsExpansion) growViewBoxToFitText(svg)
  return svg
}

/** Average glyph advance as a fraction of font size for Excalidraw's hand-drawn
 * Virgil font — deliberately generous so the viewBox never under-shoots (extra
 * margin is harmless; a clipped glyph is the bug). */
const GLYPH_ADVANCE = 0.62

/**
 * Grow the SVG viewBox so it encloses every `<text>` glyph. Excalidraw measures
 * text with a fallback font (Virgil isn't loaded when it computes element widths),
 * so the exported viewBox can be NARROWER than the embedded Virgil glyphs actually
 * render — the right edge then clips. We re-estimate each text's horizontal extent
 * from its string length + font size (NOT getBBox — that needs layout/attachment
 * and would not work for the detached fullscreen export), and only ever EXPAND the
 * box. Idempotent and cheap.
 */
export function growViewBoxToFitText(svg: SVGSVGElement): void {
  const vb = (svg.getAttribute('viewBox') ?? '').split(/\s+/).map(Number)
  if (vb.length !== 4 || vb.some((n) => Number.isNaN(n))) return
  const [minX, minY, w, h] = vb
  let contentLeft = Infinity
  let contentRight = -Infinity
  for (const t of Array.from(svg.querySelectorAll('text'))) {
    const fontSize = parseFloat(t.getAttribute('font-size') ?? '16') || 16
    const len = (t.textContent ?? '').length
    const width = len * fontSize * GLYPH_ADVANCE
    // absolute x = sum of ancestor translate() x + the text's own x attribute
    let absX = parseFloat(t.getAttribute('x') ?? '0') || 0
    for (let n: Element | null = t; n && n !== svg; n = n.parentElement) {
      const m = /translate\(\s*(-?[\d.]+)/.exec(n.getAttribute('transform') ?? '')
      if (m) absX += parseFloat(m[1])
    }
    const anchor = t.getAttribute('text-anchor') ?? 'start'
    const left = anchor === 'middle' ? absX - width / 2 : anchor === 'end' ? absX - width : absX
    const right = anchor === 'middle' ? absX + width / 2 : anchor === 'end' ? absX : absX + width
    if (left < contentLeft) contentLeft = left
    if (right > contentRight) contentRight = right
  }
  if (contentRight === -Infinity) return // no text
  const PAD = 6
  // Only expand: the new box is the union of the existing viewBox and the padded
  // text extent — PAD applies to the text side only, so a box that already fits is untouched.
  const newMinX = Math.min(minX, contentLeft - PAD)
  const newRight = Math.max(minX + w, contentRight + PAD)
  const newW = newRight - newMinX
  if (newMinX !== minX || newW !== w) svg.setAttribute('viewBox', `${newMinX} ${minY} ${newW} ${h}`)
}

/**
 * The diagram's SVG markup string — prebaked if available (zero Excalidraw), else a
 * runtime export (graceful fallback). Used by the fullscreen zoom, which sizes the
 * SVG in px so it re-rasterizes crisply on zoom.
 */
export async function loadDiagramSvg(scene: ExcalidrawScene, src: string): Promise<string | null> {
  const pre = resolvePrerenderedSvg(src)
  if (pre) return pre
  try {
    const el = await renderSceneToSvg(scene)
    return el.outerHTML
  } catch {
    return null
  }
}
