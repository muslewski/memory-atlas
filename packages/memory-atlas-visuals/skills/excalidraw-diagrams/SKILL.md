---
name: excalidraw-diagrams
description: Author an Excalidraw diagram for an Atlas Visuals digest — when a note explains a flow/sequence/architecture, compose a scene with the Excalidraw MCP, save it under {visualsDir}/files/diagrams/, and embed it with <Diagram src>.
---

# Excalidraw Diagrams for Atlas Visuals

The `<Diagram>` kit primitive embeds an Excalidraw scene read-only inside an
Atlas Visuals digest (package **memory-atlas-visuals**). Use this skill when
authoring the scene itself.

Resolve paths from the consuming repo:

| Token | Source |
|-------|--------|
| `{vaultDir}` | `atlas.config.json` → vault dir |
| `{visualsDir}` | `config.visuals.dir` if set, else `{vaultDir}/visuals` |
| `{appDir}` | `{visualsDir}/app` |

CLI gates: `pnpm exec atlas-visuals …` or `npx atlas-visuals …` (or
`pnpm --dir {appDir} …`).

## When to reach for a diagram

**Default-on: every digest gets a diagram of its core structure.** A picture
makes a human grasp the note at a glance — that is the whole point of the visual
layer. Pick the angle that most *clarifies* the note, not always a flow:

- **flow / pipeline / sequence** — steps that feed each other (render loop, request path)
- **relationship map** — how parts connect (zones, substrates, ownership)
- **hierarchy / tree** — nesting or containment (collections, layers)
- **lifecycle / state machine** — a thing moving through states (content, jobs)
- **decision / branch** — a fork and its paths (manual vs delegate)
- **before → after** — a failure and its fix (the cascade-delete diagram)

**One diagram = one idea**, and it must *clarify* (not decorate) — prose still
carries the nuance, the diagram carries the shape. Skip a diagram ONLY when a
note genuinely has no structure to draw (a flat list with no relationships) —
rare. When in doubt, include one.

## Craft bar (the one that actually fails human review)

`check:diagrams` only proves **labels exist and fit**. It will happily green-light a
title + three boxes + three arrows that say nothing. Humans reject those. Before you
write JSON, answer:

1. **What one claim does this picture carry?** Pull it from the note's `summary` /
   Gist / "one picture" / architecture section — not from the title alone.
2. **Would a reader who never opened the note get the shape in 5 seconds?** If the
   scene is only a fan-out tree with the same noun thrice, it is decoration — rewrite.
3. **Copy good fixtures, don't invent a new dialect** when the package or consuming
   vault ships example scenes under `files/diagrams/` (e.g. hierarchy with iron-law
   footer, branch manual-vs-delegate, short pipeline). Prefer matching those shapes.
4. **Prefer layers that match the note:** who observes · who supervises · who works ·
   what stays out of band · what we still must build (gap strip).
5. **Never ship:** orphan `boundElements` pointing at missing text ids; boxes with
   only a title and no verbs; unlabeled group lanes that dominate the canvas;
   a scene whose caption restates the title instead of the claim.

## Authoring workflow

1. **Load this skill** (required from `atlas-skin` step 4b — never skip when a digest
   needs a diagram).
2. **Compose the scene** — Excalidraw MCP if connected; else hand-author JSON matching
   a good fixture above. Keep it legible: ~6–12 nodes, clear arrows, short labels.
   One atmosphere, one idea (the craft-bar claim).
3. **Export as `.excalidraw`** to
   `{visualsDir}/files/diagrams/<slug>.excalidraw` — MCP file output or Write.
   Prefer **`label: { "text": "…" }` on leaf boxes** (auto-center + wrap on export) OR
   free `text` elements with real `width` (legacy fixtures). Do **not** mix broken
   `boundElements` refs to non-existent text ids.
4. **Gate:** `pnpm exec atlas-visuals check:diagrams` (or
   `pnpm --dir {appDir} check:diagrams`) must pass. Then re-read the craft bar —
   green check ≠ good picture.
5. **Embed it in the MDX**:
   `<Diagram src="files/diagrams/<slug>.excalidraw" caption="…" />`
   (import `Diagram` from `@/kit`). Optional `maxHeight` (px, default 460). Caption =
   the claim, not the title.

## Box labels — the one that bites (read this)

A box's text must be a REAL Excalidraw text element. The renderer (`exportToSvg`)
only draws actual `text` elements — it **silently ignores** two shorthands that
look fine in the JSON, producing empty boxes or labels that sit shifted-left
outside their box:

- **`label: { text }` on a shape** is SKELETON shorthand. The export path expands
  it into a centered, wrapped, bound text via `convertToExcalidrawElements` — so
  the shorthand is the **preferred** way to label a box (it auto-centers + wraps).
  But it renders ONLY because of that expansion; never assume raw `label` shows.
- **a `text` element with `width: 0`** anchors left and mis-centers. The export
  path re-measures it, but prefer giving in-box labels a real binding (shorthand
  or `containerId` + the shape's `boundElements`) so they center and wrap.

Standalone text (titles, lane headers, arrow annotations) is fine as a free
`text` element — give it a real `width`. **Gate every scene with
`pnpm exec atlas-visuals check:diagrams`** — it fails on any leaf box with no
label and on a sized label that overflows its box. It is the regression net for
both bugs.

## Rules

- Scenes are `.excalidraw` / `.svg` only — **never `.md` under `{visualsDir}/`**
  (Ouroboros). They live in `files/diagrams/`, outside every generator/lint glob.
- **Bake to SVG after authoring/editing** (`pnpm dev` in one terminal, then
  `pnpm exec atlas-visuals prerender:diagrams` or
  `pnpm --dir {appDir} prerender:diagrams`) so reader pages ship the corrected
  static SVG and zero runtime Excalidraw. Re-bake whenever a scene changes;
  verify the baked result visually.
- The diagram keeps its **OWN colours** (fixed hand-drawn palette); it does NOT
  theme per skin. The kit frames it on a light plate so it stays legible on dark
  skins (futuristic / editorial-dark) — you do not need to do anything for that.
- The viewer is heavy (Excalidraw) but **lazy-loaded** — only diagram pages pay.
  Fine; the app is off-prod.
- A committed fixture under `files/diagrams/` (when the package ships one) shows the
  minimal scene shape; Excalidraw backfills omitted optional element fields.
- **New scene → restart the dev server.** Scenes resolve via an eager Vite glob
  snapshotted at server start, so a freshly-added `.excalidraw` renders as
  "diagram not found" until you restart `pnpm dev` (HMR alone won't pick up a new
  glob match). Editing an already-globbed scene hot-reloads fine.
- See the `Diagram` entry in `kit-catalog.json` for the exact props.
