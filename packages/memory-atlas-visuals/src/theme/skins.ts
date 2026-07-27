// A skin is a tone archetype: a look AND a derivation voice. Blurbs are voice-first
// (what you'll READ), with a hint of the look. See [[0046-skins-as-tone-archetypes]].
export const SKINS = [
  {
    id: 'blog',
    label: 'Blog',
    blurb: 'Personal & conversational — a human thinking out loud. Calm, airy.',
  },
  {
    id: 'brutalist',
    label: 'Brutalist',
    blurb: 'Meat, no bones — terse, hard, zero fluff. Raw mono, thick borders.',
  },
  {
    id: 'magazine',
    label: 'Old magazine',
    blurb: '1990s print feature — composed, narrative. Serif, columns, cream.',
  },
  {
    id: 'frontier',
    label: 'Frontier',
    blurb: 'Visionary — what it unlocks, past the known edge. Dark, neon glow.',
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    blurb: 'Technical spec — defined terms, parts, constraints. Navy grid.',
  },
  {
    id: 'tor',
    label: 'Tor',
    blurb:
      'Leaked dossier — clipped, redacted, surveillance register. White paper, onion-purple, stamped mono.',
  },
] as const

export type SkinId = (typeof SKINS)[number]['id']
export const SKIN_IDS = SKINS.map((s) => s.id) as SkinId[]
