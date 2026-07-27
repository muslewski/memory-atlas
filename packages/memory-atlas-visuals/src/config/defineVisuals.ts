/**
 * config/defineVisuals.ts — defaults + the defineVisuals() merge helper.
 *
 * defineVisuals(input) merges a partial config over sensible defaults (one level
 * deep on nested objects), so visuals.config.ts only states what differs. The
 * per-skin prompts encode each skin's VOICE for many-mode authoring — they are the
 * single source of truth the skin agent reads when re-voicing a note per skin.
 */
import { SKIN_IDS, type SkinId } from '../theme/skins'
import type { SkinDescriptor, VisualsConfig, VisualsConfigInput } from './types'

/**
 * How the .md is re-voiced PER SKIN in many mode. Each descriptor is a strong,
 * unmistakable tone (`voice`) plus optional SOFT bias toward/away from kit
 * primitives (`favour`/`avoid`) — picking the skin should clearly give that voice
 * (the caveman lesson). The skin agent reads this at authoring time; nothing is
 * build-enforced. See [[0046-skins-as-tone-archetypes]].
 */
const DEFAULT_PERSKIN_PROMPTS: Partial<Record<SkinId, SkinDescriptor>> = {
  blog: {
    voice:
      'Write it as a personal blog post. First person, conversational, a real human thinking out loud — "here’s what I found and why it matters." Warm and direct, the occasional aside, but every claim still backed by the note. Approachable, not academic.',
    favour: [],
    avoid: [],
  },
  brutalist: {
    voice:
      'Meat, no bones. Strip every non-essential word. Hard claims, short fragments, dense bullets, zero hedging or throat-clearing. The reader who wants nuance opens the .md; here they get the load-bearing facts and nothing else.',
    favour: [],
    avoid: [],
  },
  magazine: {
    voice:
      'Write it as a long-form print feature from a 1990s magazine: a dateline lede, section subheads, an unhurried editorial cadence, the occasional pull-quote. Evoke the era’s print voice — composed and human, not breathless.',
    favour: [],
    avoid: [],
  },
  frontier: {
    voice:
      'Write from the edge of what’s possible. Forward-looking and exploratory — what this opens up, the ground still unmapped, where it leads. Bold but grounded: trace every possibility back to something real in the note. Give the reader a glimpse past the known edge.',
    favour: [],
    avoid: [],
  },
  blueprint: {
    voice:
      'Write it as a precise technical spec: define terms, lay out the parts and how they connect, state inputs/invariants/outputs, list constraints. Measured, structured, unambiguous — a drafting sheet, not prose.',
    favour: [],
    avoid: [],
  },
  tor: {
    voice:
      'Write it as a leaked classified dossier — an old intelligence file the reader was never cleared to see. Clipped, factual, redacted register: short declarative lines, case-file headings, the occasional [REDACTED] where the source would name names. Surveillance tone, never breathless; the facts of the note are the evidence on record.',
    favour: ['CodeBlock', 'Callout (warn)', 'Chip (redacted/Concept)', 'mono Pointer'],
    avoid: ['PullQuote', 'DropCap', 'Parallax', 'glossy Metrics dashboard'],
  },
}

/**
 * Merge per-skin descriptors field-by-field: an input may state any single field
 * (just `favour`, say) and the others fall back to the default descriptor. A skin
 * absent from `input` keeps its default unchanged; an input-only skin seeds empty
 * arrays for the fields it omits.
 */
function mergePerSkin(
  base: Partial<Record<SkinId, SkinDescriptor>>,
  input?: Partial<Record<SkinId, Partial<SkinDescriptor>>>,
): Partial<Record<SkinId, SkinDescriptor>> {
  const out: Partial<Record<SkinId, SkinDescriptor>> = { ...base }
  for (const key of Object.keys(input ?? {}) as SkinId[]) {
    const b = base[key] ?? { voice: '', favour: [], avoid: [] }
    // biome-ignore lint/style/noNonNullAssertion: input is narrowed by the for..of over Object.keys(input ?? {}), so it cannot be undefined here
    const i = input![key] ?? {}
    out[key] = {
      voice: i.voice ?? b.voice,
      favour: i.favour ?? b.favour,
      avoid: i.avoid ?? b.avoid,
    }
  }
  return out
}

const DEFAULT_BASE_PROMPT =
  'Derive a faithful, scannable digest of the source note: lead with the core point, structure it with the kit primitives, preserve every load-bearing fact, and encode meaning with callouts/metrics/icons. Clear, trustworthy, neutral — reads well under any skin (this backs the default fallback tree).'

const DEFAULTS: VisualsConfig = {
  skins: [...SKIN_IDS],
  defaultSkin: 'blog',
  motion: { gsap: true, framer: true, smooth: true },
  content: { mode: 'single', shareDiagram: true },
  features: { hero: true, diagram: true },
  prompts: { base: DEFAULT_BASE_PROMPT, perSkin: { ...DEFAULT_PERSKIN_PROMPTS } },
}

/** Merge user input over defaults; nested objects merge one level deep. */
export function defineVisuals(input: VisualsConfigInput = {}): VisualsConfig {
  const skins = (input.skins as SkinId[] | undefined) ?? DEFAULTS.skins
  const wantDefault = (input.defaultSkin as SkinId | undefined) ?? DEFAULTS.defaultSkin
  const defaultSkin = skins.includes(wantDefault) ? wantDefault : skins[0]
  return {
    skins,
    defaultSkin,
    motion: { ...DEFAULTS.motion, ...input.motion },
    content: { ...DEFAULTS.content, ...input.content },
    features: { ...DEFAULTS.features, ...input.features },
    prompts: {
      base: input.prompts?.base ?? DEFAULTS.prompts.base,
      perSkin: mergePerSkin(DEFAULTS.prompts.perSkin, input.prompts?.perSkin),
    },
  }
}
