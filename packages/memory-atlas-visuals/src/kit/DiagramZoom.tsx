/**
 * DiagramZoom — fullscreen pan + zoom of a diagram's SVG. No Excalidraw.
 *
 * The fullscreen view used to mount the full Excalidraw editor (~1.3MB, mount jank)
 * just to give zoom/pan on a read-only diagram. We already have the scene as an SVG,
 * so this opens INSTANTLY.
 *
 * CRISP zoom: we do NOT CSS-`scale()` the SVG — that scales the cached raster layer
 * and pixelates at high zoom. Instead we set the SVG's pixel WIDTH (= k × fit-width);
 * the browser re-rasterizes the vector at the new size, so it stays sharp at any zoom,
 * like Excalidraw's canvas. Panning is a cheap `translate` on the layer.
 *
 * The SVG comes from loadDiagramSvg (prebaked → zero Excalidraw; runtime export is the
 * same graceful fallback). transform-origin 0 0 + the px size keep the zoom-around-cursor
 * math exact.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExcalidrawScene } from '../lib/diagrams'
import { loadDiagramSvg, stripSvgIntrinsicSize } from '../lib/diagrams'
import { Icon } from './Icon'

const MIN = 0.4
const MAX = 16
const clamp = (k: number) => Math.min(MAX, Math.max(MIN, k))

interface DiagramZoomProps {
  scene: ExcalidrawScene
  src: string
}

export default function DiagramZoom({ scene, src }: DiagramZoomProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const baseW = useRef(0) // SVG width in px at k = 1 (fit to stage)
  const aspect = useRef(1) // height / width
  const [t, setT] = useState({ x: 0, y: 0, k: 1 })
  const [ready, setReady] = useState(false)
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)

  const svgEl = () => layerRef.current?.querySelector('svg') as SVGSVGElement | null

  // Fit the diagram to the stage (also the Reset action). Reads the viewBox for the
  // intrinsic aspect, sizes the SVG to fill ~92% of the stage, and centres it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only reads stable refs (stageRef, layerRef, aspect, baseW) and stable setT — no reactive deps needed
  const fitToStage = useCallback(() => {
    const stage = stageRef.current
    const svg = svgEl()
    if (!stage || !svg) return false
    const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number)
    const W = vb[2] || svg.getBoundingClientRect().width || 1
    const H = vb[3] || W
    aspect.current = H / W
    const s = Math.min(stage.clientWidth / W, stage.clientHeight / H) * 0.92
    baseW.current = W * s
    const w = baseW.current
    const h = w * aspect.current
    setT({ k: 1, x: (stage.clientWidth - w) / 2, y: (stage.clientHeight - h) / 2 })
    return true
  }, [])

  // Inject the SVG markup once (prebaked → no Excalidraw), then fit.
  // biome-ignore lint/correctness/useExhaustiveDependencies: svgEl is a stable inline helper reading layerRef (a ref); layerRef itself needs no dep entry
  useEffect(() => {
    let cancelled = false
    loadDiagramSvg(scene, src).then((markup) => {
      if (cancelled || !layerRef.current || !markup) return
      layerRef.current.innerHTML = markup
      const svg = svgEl()
      if (svg) {
        // Runtime exportToSvg ships explicit px width/height attributes; without
        // stripping them the px-width re-raster below leaves the height attribute
        // intact → box aspect ≠ viewBox → the drawing letterboxes far off-centre
        // (the fullscreen white-screen bug). Prebaked SVGs already lack them, so
        // this is a no-op there. Shared rule with DiagramStatic.
        stripSvgIntrinsicSize(svg)
        svg.style.maxWidth = 'none'
        svg.style.maxHeight = 'none'
        svg.style.pointerEvents = 'none'
      }
      // wait a frame so the SVG is in the DOM with a measurable viewBox, then fit
      requestAnimationFrame(() => {
        if (!cancelled && fitToStage()) setReady(true)
      })
    })
    return () => {
      cancelled = true
    }
  }, [scene, src, fitToStage])

  // Apply the current zoom as a pixel WIDTH → vector re-raster (crisp).
  // biome-ignore lint/correctness/useExhaustiveDependencies: baseW is a ref (baseW.current) intentionally excluded; ready gates the first run without being a dep
  useEffect(() => {
    const svg = svgEl()
    if (svg && baseW.current) svg.style.width = `${t.k * baseW.current}px`
  }, [t.k, ready])

  const zoomAround = useCallback((factor: number, cx: number, cy: number) => {
    setT((p) => {
      const k = clamp(p.k * factor)
      const r = k / p.k
      return { k, x: cx - (cx - p.x) * r, y: cy - (cy - p.y) * r }
    })
  }, [])

  // Native non-passive wheel listener: React's onWheel is passive, so a trackpad pinch
  // (delivered as ctrl+wheel) would zoom the whole PAGE. Here we preventDefault and
  // route it to the diagram. Exponential factor keeps mouse-wheel + fine pinch smooth.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const sensitivity = e.ctrlKey ? 0.02 : 0.0018
      zoomAround(Math.exp(-e.deltaY * sensitivity), e.clientX - rect.left, e.clientY - rect.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAround])

  const zoomBtn = (factor: number) => {
    // biome-ignore lint/style/noNonNullAssertion: stageRef.current is always set — zoomBtn is only called from button onClick handlers rendered inside the same component
    const rect = stageRef.current!.getBoundingClientRect()
    zoomAround(factor, rect.width / 2, rect.height / 2)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { px: e.clientX, py: e.clientY, ox: t.x, oy: t.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    setT((p) => ({ ...p, x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }))
  }
  const onPointerUp = () => {
    drag.current = null
  }

  return (
    <div
      ref={stageRef}
      className="skin-diagram-zoom"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div
        ref={layerRef}
        className="skin-diagram-zoom-layer"
        style={{
          transform: `translate(${t.x}px, ${t.y}px)`,
          transformOrigin: '0 0',
          opacity: ready ? 1 : 0,
        }}
      />
      <div className="skin-diagram-zoom-ctrls" onPointerDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          aria-label="Zoom in"
          data-testid="diagram-zoom-in"
          onClick={() => zoomBtn(1.25)}
        >
          <Icon name="plus" size={16} />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          data-testid="diagram-zoom-out"
          onClick={() => zoomBtn(1 / 1.25)}
        >
          <Icon name="minus" size={16} />
        </button>
        <button
          type="button"
          aria-label="Reset zoom"
          data-testid="diagram-zoom-reset"
          onClick={() => fitToStage()}
        >
          <Icon name="maximize" size={15} />
        </button>
      </div>
    </div>
  )
}
