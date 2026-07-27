/**
 * visuals.config.ts — the single edit surface for the Vellum visuals gallery.
 *
 * Everything stated here is merged over defaults by defineVisuals(). Omit a key
 * to keep its default. This is the file a consuming project edits to retheme the
 * whole gallery — enable/disable skins, motion, features, pick single vs many
 * content, and override per-skin derivation prompts.
 */
import { defineVisuals } from './src/config/defineVisuals'

export default defineVisuals({
  // Active-skin allowlist: blog + tor + brutalist are selectable / gallery-listed. The
  //   other defined skins (magazine/frontier/blueprint) stay defined-but-hidden — this
  //   allowlist is the enable flag (ThemeSwitcher filters SKINS by it, main.tsx passes
  //   themes={visuals.skins}, the manifest scans skins/default only). blog reads the
  //   default tree untouched; tor carries the real second voice; brutalist = meat-no-bones.
  skins: ['blog', 'tor', 'brutalist'],
  defaultSkin: 'blog',
  // Syndcast Mind: both motion libraries on (defaults).
  motion: {
    // Scroll feel. true (default) = ScrollSmoother momentum, per-skin (brutalist
    //   snappy → frontier floaty). false = native scroll (reveals still animate).
    //   A number = fixed momentum in seconds, same for every skin (e.g. 0.8 snappier,
    //   1.6 floatier) — handy on a low-end machine. Needs gsap: true.
    smooth: true,
  },
  content: {
    // 'single' — every skin repaints ONE shared default digest (fewest tokens, identical
    //   words across skins). Skins restyle visually only; NO per-skin re-voicing. Set
    //   'many' to allow per-skin content overrides at skins/<skin>/<origin>/<slug>.mdx
    //   (only write overrides where a different voice is worth the token cost).
    mode: 'single',
    // true (default) — the note's Excalidraw diagram shows in EVERY skin: per-skin
    //   overrides must re-include the same one-line <Diagram src> (scenes are shared
    //   + skin-agnostic), and the build guard fails if an override drops it. Set false
    //   to let a skin point <Diagram src> at its own scene, or omit a diagram entirely.
    shareDiagram: true,
  },
})
