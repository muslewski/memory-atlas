import { describe, expect, it } from 'vitest'
import {
  growViewBoxToFitText,
  resolveDiagram,
  sceneNeedsExpansion,
  stripSvgIntrinsicSize,
} from './diagrams'

const SVG_NS = 'http://www.w3.org/2000/svg'

function svgWithText(
  viewBox: string,
  translateX: number,
  text: string,
  fontSize = 16,
  anchor = 'start',
) {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', viewBox)
  const g = document.createElementNS(SVG_NS, 'g')
  g.setAttribute('transform', `translate(${translateX} 10) rotate(0)`)
  const t = document.createElementNS(SVG_NS, 'text')
  t.setAttribute('x', '0')
  t.setAttribute('font-size', `${fontSize}px`)
  t.setAttribute('text-anchor', anchor)
  t.textContent = text
  g.appendChild(t)
  svg.appendChild(g)
  return svg
}
// biome-ignore lint/style/noNonNullAssertion: guaranteed by preceding expect().toBeTruthy()
const vbWidth = (svg: SVGSVGElement) => Number(svg.getAttribute('viewBox')!.split(/\s+/)[2])
// biome-ignore lint/style/noNonNullAssertion: guaranteed by preceding expect().toBeTruthy()
const vbMinX = (svg: SVGSVGElement) => Number(svg.getAttribute('viewBox')!.split(/\s+/)[0])

describe('stripSvgIntrinsicSize', () => {
  it('removes explicit width/height attributes (the runtime-export case)', () => {
    // Mirrors what Excalidraw exportToSvg emits: viewBox + px width/height attrs.
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('viewBox', '0 0 660 516')
    svg.setAttribute('width', '660')
    svg.setAttribute('height', '516')

    stripSvgIntrinsicSize(svg)

    expect(svg.hasAttribute('width')).toBe(false)
    expect(svg.hasAttribute('height')).toBe(false)
    // viewBox is preserved — it now drives the aspect ratio.
    expect(svg.getAttribute('viewBox')).toBe('0 0 660 516')
  })

  it('sets style.height auto + display block so a px width re-rasters by viewBox aspect', () => {
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('viewBox', '0 0 930 526')
    stripSvgIntrinsicSize(svg)
    expect(svg.style.height).toBe('auto')
    expect(svg.style.display).toBe('block')
  })

  it('is harmless on an already-fluid (prebaked) SVG', () => {
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('viewBox', '0 0 400 80')
    svg.style.height = 'auto'
    stripSvgIntrinsicSize(svg)
    expect(svg.hasAttribute('width')).toBe(false)
    expect(svg.style.height).toBe('auto')
  })
})

describe('growViewBoxToFitText', () => {
  it('widens the viewBox when a text overflows the right edge (the clip bug)', () => {
    // text at x=80, ~40 chars * 16 * 0.62 ≈ 397 wide → right ≈ 477, far past viewBox 100.
    const svg = svgWithText('0 0 100 50', 80, 'x'.repeat(40))
    growViewBoxToFitText(svg)
    expect(vbWidth(svg)).toBeGreaterThan(100)
  })

  it('extends minX left when an end-anchored text overflows the left edge', () => {
    const svg = svgWithText('0 0 100 50', 5, 'x'.repeat(20), 16, 'end')
    growViewBoxToFitText(svg)
    expect(vbMinX(svg)).toBeLessThan(0)
  })

  it('never shrinks a viewBox that already encloses its text', () => {
    const svg = svgWithText('0 0 1000 50', 10, 'short')
    growViewBoxToFitText(svg)
    expect(vbWidth(svg)).toBe(1000)
    expect(vbMinX(svg)).toBe(0)
  })

  it('is a no-op when there is no viewBox', () => {
    const svg = document.createElementNS(SVG_NS, 'svg')
    growViewBoxToFitText(svg)
    expect(svg.hasAttribute('viewBox')).toBe(false)
  })
})

describe('sceneNeedsExpansion', () => {
  it('is true when a shape carries label shorthand', () => {
    expect(sceneNeedsExpansion([{ type: 'rectangle', label: { text: 'hi' } }])).toBe(true)
  })
  it('is true when a text element has degenerate (zero) width — needs re-measure', () => {
    expect(sceneNeedsExpansion([{ type: 'text', text: 'x', width: 0 }])).toBe(true)
  })
  it('is false for a scene of correctly-sized text, shapes, and arrows (passthrough)', () => {
    expect(
      sceneNeedsExpansion([
        { type: 'text', text: 'x', width: 100 },
        { type: 'rectangle', width: 10, height: 10 },
        { type: 'arrow' },
      ]),
    ).toBe(false)
  })
})

describe('resolveDiagram', () => {
  it('resolves the fixture .excalidraw to a parsed scene with elements', () => {
    const scene = resolveDiagram('files/diagrams/_example-render-loop.excalidraw')
    expect(scene).toBeTruthy()
    expect(Array.isArray(scene?.elements)).toBe(true)
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by preceding expect().toBeTruthy()
    expect(scene!.elements.length).toBeGreaterThan(0)
  })

  it('tolerates a leading slash', () => {
    expect(resolveDiagram('/files/diagrams/_example-render-loop.excalidraw')).toBeTruthy()
  })

  it('returns null for empty or unknown src', () => {
    expect(resolveDiagram(undefined)).toBeNull()
    expect(resolveDiagram('')).toBeNull()
    expect(resolveDiagram('files/diagrams/nope.excalidraw')).toBeNull()
  })
})
