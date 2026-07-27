/**
 * DiagramModal.tsx — fullscreen diagram viewer with native zoom/pan.
 *
 * Reached only via Diagram.tsx's lazy import when the expand button is pressed,
 * so the (already-lazy) Excalidraw chunk is the only cost. Portals to <body> so
 * it escapes the snapshot's max-width column. Closes on Escape, backdrop click,
 * or the Close button; locks body scroll while open.
 *
 * The stage uses `contain: layout paint` (see Diagram.css) so Excalidraw's
 * position:fixed layers (canvas + zoom controls) anchor to the stage, not the
 * viewport — keeping the zoom UI inside the modal frame.
 */
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ExcalidrawScene } from '../lib/diagrams'
import DiagramZoom from './DiagramZoom'
import { Icon } from './Icon'

interface DiagramModalProps {
  scene: ExcalidrawScene
  src: string
  caption?: string
  onClose: () => void
}

export default function DiagramModal({ scene, src, caption, onClose }: DiagramModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: internal gallery app, a11y refactor out of scope
    <div
      className="skin-diagram-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Diagram fullscreen"
      data-testid="diagram-modal"
      onClick={onClose}
    >
      <button
        type="button"
        className="skin-diagram-modal-close"
        aria-label="Close diagram"
        data-testid="diagram-modal-close"
        onClick={onClose}
      >
        <Icon name="x" size={18} />
        <span>Close</span>
      </button>

      {/* biome-ignore lint/a11y/noStaticElementInteractions: internal gallery app, a11y refactor out of scope */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: internal gallery app, a11y refactor out of scope */}
      <div className="skin-diagram-modal-stage" onClick={(e) => e.stopPropagation()}>
        <DiagramZoom scene={scene} src={src} />
      </div>

      {caption && <p className="skin-diagram-modal-caption">{caption}</p>}
    </div>,
    document.body,
  )
}
