import type { PrimitiveMeta } from './types'

export const DiagramMeta: PrimitiveMeta = {
  name: 'Diagram',
  category: 'orientation',
  useWhen:
    'Default-on: every digest gets ONE diagram of its core structure so a human grasps the note at a glance — flow / relationship map / hierarchy / lifecycle / decision split / before→after. Pick the angle that most clarifies; skip only when a note has nothing structural to draw (rare). The scene is authored via the Excalidraw MCP and saved to files/diagrams/. Fixed hand-drawn palette, same across all skins (not themed). See the excalidraw-diagrams skill for the authoring workflow.',
  props: {
    src: 'string — visuals-relative path to the scene, e.g. "files/diagrams/render-loop.excalidraw"',
    caption: 'string? — short caption under the diagram',
    maxHeight: 'number? — frame height in px (default 460)',
  },
  // The inline embed has an expand button → fullscreen modal with Excalidraw's
  // native zoom/pan, so authors can draw dense diagrams freely; the reader zooms.
  example: `<Diagram src="files/diagrams/render-loop.excalidraw" caption="Script → Render pipeline" />`,
}
