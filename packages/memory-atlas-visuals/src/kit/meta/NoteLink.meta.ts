import type { PrimitiveMeta } from './types'

export const NoteLinkMeta: PrimitiveMeta = {
  name: 'NoteLink',
  category: 'structure',
  useWhen:
    "A prose mention in the body references another note — turn it into navigation. Resolves ONLY against the source .md's own [[]] connections (it cannot invent an edge); the source must [[]]-link the target first.",
  props: {
    to: "string — the target note's bare slug as it appears in the source [[]] (alias/#heading/^block are stripped before matching)",
    variant:
      "'inline' (default, text link) | 'button' (compact pill CTA — keep the label SHORT, e.g. \"View →\"; long labels are ellipsis-capped)",
    children: 'ReactNode — the visible link text (short for the button variant)',
  },
  example: `<NoteLink to="2026-06-23-syndcast-skills-v1-design" variant="button">View →</NoteLink>`,
}
