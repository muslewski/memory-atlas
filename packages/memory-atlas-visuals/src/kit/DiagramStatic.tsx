/**
 * DiagramStatic.tsx — the INLINE diagram render: a static SVG, no live canvas.
 *
 * Why no live Excalidraw inline? The page lives inside ScrollSmoother's
 * #smooth-content, which gets a fresh transform every scroll frame. A live <canvas>
 * inside that layer re-rasters every frame → scroll jank. An SVG is a cheap, static
 * compositing input. (Interactivity still exists — the expand button opens
 * DiagramModal with the real Excalidraw, portaled OUTSIDE #smooth-content.)
 *
 * Two sources for the inline SVG, in order:
 *  1. A committed prerendered `.svg` (pnpm prerender:diagrams) — injected directly,
 *     so the page loads ZERO Excalidraw. Preferred.
 *  2. Fallback: dynamically import exportToSvg and render at runtime. The import is
 *     dynamic so Excalidraw stays OUT of the eager bundle — it loads only when a
 *     scene has no prerendered SVG (and never on pages without diagrams).
 */
import { useEffect, useRef } from 'react'
import type { ExcalidrawScene } from '../lib/diagrams'
import { renderSceneToSvg, resolvePrerenderedSvg, stripSvgIntrinsicSize } from '../lib/diagrams'

// Strip the intrinsic px width/height so the viewBox + CSS (.skin-diagram-static svg)
// drive sizing; keeps aspect ratio and lets it fit the frame.
function fluidSvgString(s: string): string {
  return s
    .replace(/(<svg[^>]*?)\swidth="[^"]*"/, '$1')
    .replace(/(<svg[^>]*?)\sheight="[^"]*"/, '$1')
}
function fluidSvgEl(svg: SVGSVGElement): void {
  // Shared rule (removes intrinsic px w/h, sets height auto + display block) so the
  // inline render and the fullscreen zoom size identically — see DiagramZoom.
  stripSvgIntrinsicSize(svg)
  svg.style.maxWidth = '100%'
  svg.style.maxHeight = '100%'
}

interface DiagramStaticProps {
  scene: ExcalidrawScene
  /** The scene's `files/diagrams/…excalidraw` src — used to find its prerendered SVG. */
  src: string
  /** Bypass the prerendered SVG and always runtime-render (the prerender route uses this). */
  forceRender?: boolean
}

export default function DiagramStatic({ scene, src, forceRender = false }: DiagramStaticProps) {
  const ref = useRef<HTMLDivElement>(null)
  const prebaked = forceRender ? null : resolvePrerenderedSvg(src)

  useEffect(() => {
    if (prebaked) return // static SVG injected below — no Excalidraw loaded
    let cancelled = false
    // Shared export path: expands `label` shorthand + re-measures zero-width text
    // so every box shows its centered label (see renderSceneToSvg).
    renderSceneToSvg(scene)
      .then((svg: SVGSVGElement) => {
        if (cancelled || !ref.current) return
        fluidSvgEl(svg)
        ref.current.replaceChildren(svg)
      })
      .catch(() => {
        /* missing/invalid scene already handled upstream; stay silent */
      })
    return () => {
      cancelled = true
    }
  }, [scene, prebaked])

  if (prebaked) {
    return (
      <div
        ref={ref}
        className="skin-diagram-static"
        // Author-time SVG string — our own committed asset, not user input.
        // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG content from trusted Excalidraw export, not user input
        dangerouslySetInnerHTML={{ __html: fluidSvgString(prebaked) }}
      />
    )
  }
  return <div ref={ref} className="skin-diagram-static" />
}
