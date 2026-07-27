/**
 * kit/index.ts — MDX component map.
 *
 * Structure:
 *   SECTION 1: named primitives (Hero, Section, Prose, PullQuote, DropCap, Divider, …)
 *   (SECTION 2, the bare-element overrides, is GONE — shadcn Typeset styles h1–h6, p,
 *    ul/ol/li, blockquote, a, code, pre and table via zero-specificity :where() rules
 *    inside `.typeset`. See [[2026-07-11-visuals-typeset-migration-design]].)
 *
 * Token-only constraint: no CSS value is hard-coded here; all styling is in kit.css.
 */

import './kit.css'

import { Callout } from './Callout'
import { Card, Cards } from './Cards'
import { Chip } from './Chip'
import { CodeBlock } from './CodeBlock'
import { Concept } from './Concept'
import { Divider } from './Divider'
import { DropCap } from './DropCap'
import { Gist } from './Gist'
import { Hero } from './Hero'
import { Ledger, Row } from './Ledger'
import { Metric, Metrics } from './Metrics'
import { Prose } from './Prose'
import { PullQuote } from './PullQuote'
import { ReadingProgress } from './ReadingProgress'
import { Reveal } from './Reveal'
import { Section } from './Section'
import { Stagger } from './Stagger'
import { StickyTOC } from './StickyTOC'
import { Timeline } from './Timeline'

export { useReducedMotion } from './useReducedMotion'

import { Counter } from './Counter'
import { Diagram } from './Diagram'
import { Icon } from './Icon'
// B5 structure/ritual primitives + Icon
import { More } from './More'
// Inline note-link (body-level nav, resolves via the note's Mind-owned outbound)
import { NoteLink } from './NoteLink'
import { ReadingMode } from './ReadingMode'
import { ScrollScene } from './ScrollScene'
// GSAP cinematic motion primitives
import { SplitReveal } from './SplitReveal'
import { Takeaways } from './Takeaways'

export { type OutboundLink, OutboundProvider, resolveNoteLink, useOutbound } from './outbound'
// ── Re-export primitives for direct use outside MDX ────────────────────────
// B3 orientation primitives
// B4 motion primitives
// B5 structure/ritual primitives
// Diagram (Excalidraw embed)
// GSAP cinematic motion primitives
// Inline note-link + outbound context (body-level connections)
export {
  Callout,
  Card,
  Cards,
  Chip,
  CodeBlock,
  Concept,
  Counter,
  Diagram,
  Divider,
  DropCap,
  Gist,
  Hero,
  Icon,
  Ledger,
  Metric,
  Metrics,
  More,
  NoteLink,
  Prose,
  PullQuote,
  ReadingMode,
  ReadingProgress,
  Reveal,
  Row,
  ScrollScene,
  Section,
  SplitReveal,
  Stagger,
  StickyTOC,
  Takeaways,
  Timeline,
}

// ── mdxComponents — the map MDX.Provider / useMDXComponents consumes ────────
//
// APPEND pattern for later tasks:
//   SECTION 1 — add named primitive under the named section

export const mdxComponents = {
  // ── SECTION 1: named primitives ──────────────────────────────────────────
  Hero,
  Section,
  Prose,
  PullQuote,
  DropCap,
  Divider,
  // B2 named primitives
  Cards,
  Card,
  Chip,
  Callout,
  Metrics,
  Metric,
  Ledger,
  Row,
  Timeline,
  CodeBlock,
  Gist,
  // B3 orientation primitives
  ReadingProgress,
  StickyTOC,
  Concept,
  // B4 motion primitives
  Reveal,
  Stagger,
  // B5 structure/ritual primitives
  More,
  ReadingMode,
  Takeaways,
  Icon,
  // Diagram (Excalidraw embed)
  Diagram,
  // GSAP cinematic motion primitives
  SplitReveal,
  ScrollScene,
  Counter,
  // Inline note-link (body-level nav)
  NoteLink,
} as const
