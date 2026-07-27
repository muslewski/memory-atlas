/**
 * config/types.ts — the Vellum config shape.
 *
 * One typed surface controls the whole gallery: which skins are selectable, which
 * animation libraries run, whether content is single (one .mdx per note) or many
 * (per-skin .mdx with fallback), optional content features, and the authoring-time
 * derivation prompts. See visuals.config.ts (app root) for the edit surface.
 */
import type { SkinId } from '../theme/skins'

export type ContentMode = 'single' | 'many'

/**
 * A skin's authoring brief, read by the skin AGENT at authoring time (mind-skin) —
 * never at runtime. `voice` is the tone; `favour`/`avoid` are SOFT bias toward/away
 * from kit primitives or content shapes. Soft means hint-only: no build guard ever
 * enforces them (the check:illustrated / check:diagrams / links guards stay unchanged).
 */
export interface SkinDescriptor {
  voice: string
  favour: string[]
  avoid: string[]
}

export interface VisualsConfig {
  /** Selectable skins. Order = switcher order. */
  skins: SkinId[]
  /** Skin shown first; coerced into `skins` if the requested one is disabled. */
  defaultSkin: SkinId
  /**
   * Animation libraries + scroll feel.
   * - `gsap` / `framer`: disable both for a lightweight/static build.
   * - `smooth`: ScrollSmoother momentum scroll. true = on (per-skin momentum);
   *   false = native scroll (reveals still animate); a number = fixed smooth seconds
   *   (overrides the per-skin value — higher = floatier, lower = snappier). Requires
   *   `gsap: true`. Default true.
   */
  motion: { gsap: boolean; framer: boolean; smooth: boolean | number }
  /**
   * `mode`: single = one digest every skin restyles; many = per-skin overrides,
   *   falling back to illustrated/default (a skin reuses default by omitting its override).
   * `shareDiagram`: true = the note's diagram appears in EVERY skin (per-skin overrides
   *   must re-include the same <Diagram src>; guard-enforced). false = a skin may use
   *   its own diagram or none. (Distinct from features.diagram, the show/hide toggle.)
   */
  content: { mode: ContentMode; shareDiagram: boolean }
  /** Optional content features (banner image, diagram embeds). */
  features: { hero: boolean; diagram: boolean }
  /** Derivation instructions read by the skin AGENT at authoring time (not runtime). */
  prompts: { base: string; perSkin: Partial<Record<SkinId, SkinDescriptor>> }
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

// `prompts` is overridden explicitly: a Partial<Record<…>> value carries `| undefined`,
// which defeats DeepPartial's `extends object` recursion — so the descriptor would not
// become partial. State it by hand so the edit surface can set any single descriptor
// field (e.g. just `favour`); mergePerSkin fills the rest from the default descriptor.
export type VisualsConfigInput = DeepPartial<Omit<VisualsConfig, 'prompts'>> & {
  prompts?: { base?: string; perSkin?: Partial<Record<SkinId, Partial<SkinDescriptor>>> }
}
