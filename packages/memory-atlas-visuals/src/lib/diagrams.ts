/**
 * diagrams.ts — resolve a <Diagram src> path to a parsed Excalidraw scene.
 *
 * Content comes from virtual:atlas-diagrams (consumer vault), with a relative
 * glob fallback for in-tree visuals/app development.
 */
import { lookupVisualsPath, rekeyByVisualsPath } from './content-keys'

export interface ExcalidrawScene {
  type?: string
  version?: number
  elements: unknown[]
  appState?: Record<string, unknown>
  files?: Record<string, unknown>
}

// Prefer virtual module (package + vault). Fallback glob for monorepo in-tree app.
import virtualDiagrams from 'virtual:atlas-diagrams'
import virtualSvgs from 'virtual:atlas-diagram-svgs'

const legacyRaw = import.meta.glob('../../../files/diagrams/**/*.excalidraw', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const legacySvg = import.meta.glob('../../../files/diagrams/**/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const raw: Record<string, string> = {
  ...rekeyByVisualsPath(legacyRaw),
  ...(virtualDiagrams as Record<string, string>),
}

const svgRaw: Record<string, string> = {
  ...rekeyByVisualsPath(legacySvg),
  ...(virtualSvgs as Record<string, string>),
}

export function resolveDiagram(src?: string | null): ExcalidrawScene | null {
  const text = lookupVisualsPath(raw, src)
  if (!text) return null
  try {
    const scene = JSON.parse(text) as ExcalidrawScene
    return Array.isArray(scene.elements) ? scene : null
  } catch {
    return null
  }
}

export function resolvePrerenderedSvg(src?: string | null): string | null {
  if (!src) return null
  const clean = src.replace(/^\/+/, '').replace(/\.excalidraw$/, '.svg')
  return lookupVisualsPath(svgRaw, clean)
}

export function allDiagramSrcs(): string[] {
  return Object.keys(raw).filter((k) => k.endsWith('.excalidraw'))
}

export function stripSvgIntrinsicSize(svg: SVGSVGElement): void {
  svg.removeAttribute('width')
  svg.removeAttribute('height')
  svg.style.height = 'auto'
  svg.style.display = 'block'
}

export function sceneNeedsExpansion(elements: unknown[]): boolean {
  return elements.some((e) => {
    if (!e || typeof e !== 'object') return false
    const el = e as { type?: string; width?: number; label?: { text?: string } }
    if (el.label?.text) return true
    if (el.type === 'text' && !(typeof el.width === 'number' && el.width > 0)) return true
    return false
  })
}

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
  if (needsExpansion) growViewBoxToFitText(svg)
  return svg
}

const GLYPH_ADVANCE = 0.62

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
  if (contentRight === -Infinity) return
  const PAD = 6
  const newMinX = Math.min(minX, contentLeft - PAD)
  const newRight = Math.max(minX + w, contentRight + PAD)
  const newW = newRight - newMinX
  if (newMinX !== minX || newW !== w) svg.setAttribute('viewBox', `${newMinX} ${minY} ${newW} ${h}`)
}

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
