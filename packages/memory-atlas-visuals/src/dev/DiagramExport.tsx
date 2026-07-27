/**
 * DiagramExport — a dev-only page that runtime-renders every diagram scene to SVG,
 * each tagged with its src. The `pnpm prerender:diagrams` script visits this page
 * (against the running dev server), reads each SVG, and writes a committed
 * files/diagrams/<slug>.svg so reader pages ship zero Excalidraw.
 *
 * Registered only under import.meta.env.DEV (see routes.tsx); never in production.
 */

import DiagramStatic from '../kit/DiagramStatic'
import { allDiagramSrcs, resolveDiagram } from '../lib/diagrams'

export default function DiagramExport() {
  const srcs = allDiagramSrcs()
  return (
    <div data-diagram-export style={{ background: '#fff', padding: 16 }}>
      {srcs.map((src) => {
        const scene = resolveDiagram(src)
        return (
          <div key={src} data-diagram-src={src} style={{ width: 1200, marginBottom: 24 }}>
            {scene && <DiagramStatic scene={scene} src={src} forceRender />}
          </div>
        )
      })}
    </div>
  )
}
