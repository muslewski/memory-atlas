/**
 * Diagram.tsx — embed an Excalidraw scene read-only.
 *
 * <Diagram src="files/diagrams/<slug>.excalidraw" caption="..." />
 *
 * The INLINE embed is a static SVG (DiagramStatic) — NOT a live canvas. A live
 * Excalidraw canvas inside ScrollSmoother's per-frame-transformed #smooth-content
 * re-rasters every scroll frame and janks the scroll; an SVG composites for free.
 * Fixed hand-drawn palette — the scene keeps its own colours, identical across all
 * 5 skins. The .skin-diagram frame gives it a light plate so it stays legible on
 * dark skins.
 *
 * The expand button opens a fullscreen modal (DiagramModal, lazy) that mounts the
 * REAL interactive Excalidraw with native zoom/pan — portaled to <body>, outside
 * #smooth-content, so it pays no scroll-transform cost. That's where pan/zoom lives.
 */
import { lazy, Suspense, useState } from 'react'
import { visuals } from '../config'
import { resolveDiagram } from '../lib/diagrams'
import { Icon } from './Icon'
import './Diagram.css'

const DiagramStatic = lazy(() => import('./DiagramStatic'))
const DiagramModal = lazy(() => import('./DiagramModal'))

interface DiagramProps {
  src: string
  caption?: string
  maxHeight?: number
}

export function Diagram({ src, caption, maxHeight = 460 }: DiagramProps) {
  const scene = resolveDiagram(src)
  const [open, setOpen] = useState(false)

  // features.diagram off → omit the diagram entirely (digest still renders).
  if (!visuals.features.diagram) return null

  if (!scene) {
    return (
      <figure className="skin-diagram skin-diagram--missing">
        <div className="skin-diagram-frame skin-diagram-frame--missing">
          diagram not found: {src}
        </div>
      </figure>
    )
  }

  return (
    <figure className="skin-diagram">
      {/* Inline = static SVG. Clicking ANYWHERE on it (or the expand button) opens the
          fullscreen pan/zoom view — which is also just the SVG, so it opens instantly
          (no Excalidraw mount). */}
      <button
        type="button"
        className="skin-diagram-frame skin-diagram-frame--clickable"
        style={{ height: maxHeight }}
        aria-label="Open diagram fullscreen"
        title="Click to zoom"
        data-testid="diagram-open"
        onClick={() => setOpen(true)}
      >
        <Suspense fallback={<span className="skin-diagram-loading">Loading diagram…</span>}>
          <DiagramStatic scene={scene} src={src} />
        </Suspense>
        <span className="skin-diagram-expand" aria-hidden="true" data-testid="diagram-expand">
          <Icon name="maximize-2" size={16} />
        </span>
      </button>
      {caption && <figcaption className="skin-diagram-caption">{caption}</figcaption>}
      {open && (
        <Suspense fallback={null}>
          <DiagramModal scene={scene} src={src} caption={caption} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </figure>
  )
}
