---
title: "Visuals companion"
description: "Optional presentation plane over an Atlas vault — memory-atlas-visuals, zero-dep core, three tiers."
section: reference
order: 35
---

# Optional visuals companion

`memory-atlas` is the **data plane**: plain-markdown vaults, a zero-dependency
CLI, and verifier invariants. A **presentation plane** over those vaults is
optional and lives in a separate package.

| Package | Role | Runtime deps |
|---------|------|--------------|
| **`memory-atlas`** | Vault layout, `atlas` CLI, check/build/stamp/wire | **None** (Node only) |
| **`memory-atlas-visuals`** | Gallery app, digests, typeset/derived presentation | Heavy UI (React, Vite, etc.) |

Installing `memory-atlas` never pulls React, a bundler, or a gallery. The
companion is opt-in, separately versioned, and never imported by the core
package.

## Zero-dependency rule (load-bearing)

Core **must not** ship presentation UI. Config keys under
`atlas.config.json` → `visuals` are **declarative only**: this package reads
and merges them, documents paths, and may forward to a companion binary when
present. It never `require`s / `import`s `memory-atlas-visuals`. Zero
runtime dependencies on the core package stay intact.

## Reserved `visuals/` tree

- Name **`visuals/`** is reserved under the vault (default
  `retrieval.excludeFromSearch` includes `"visuals/"`; loaders always skip a
  `visuals` directory).
- Agents and search indexes **omit** it by default — presentation artifacts
  are not Map/Ledger corpus.
- SPEC defines **no** digest or gallery contract; the companion owns its own
  versioning.

Content that *belongs* to the vault presentation tree (still outside agent
search by default):

| Path (vault-relative defaults) | Holds |
|--------------------------------|--------|
| `visuals/illustrated/` | Skinned digests (`.mdx` only — see Ouroboros) |
| `visuals/files/` | Binary / diagram assets (Excalidraw, stock heroes, …) |
| `visuals/visuals.config.json` | Companion config |
| `visuals/app/` (or package-owned app) | Gallery runtime — not Atlas source notes |

## Enable

1. Declare intent in `atlas.config.json` (keys default off — see
   [CONFIG.md](./CONFIG.md#visuals)):

   ```json
   "visuals": { "enabled": true }
   ```

2. Install the companion as a **dev** dependency:

   ```bash
   npm i -D memory-atlas-visuals
   ```

3. Scaffold the vault tree (writes under `visuals/` when the companion CLI is
   available):

   ```bash
   atlas visuals init --write
   ```

4. Wire on-ramp / hooks as usual (optional; does not load React into core):

   ```bash
   atlas wire all
   ```

5. Run the gallery:

   ```bash
   atlas-visuals dev
   # or, when the core CLI forwards:
   atlas visuals dev
   ```

Default local port is **`visuals.port`** (4555). Override in config if needed.

### `concurrentDev`

When `visuals.concurrentDev` is `true` (default once keys are present),
**consumer** dogfood/dev scripts may start the gallery **alongside** the
product app. That concurrent start is the **adopting repo’s responsibility**
— memory-atlas does not spawn product servers or couple to a framework.
Core only exposes the flag so scripts and companions can agree.

## Ouroboros rule

Presentation must not re-enter the Atlas corpus:

- **No `.md` under `visuals/`** that agents would treat as Map/Ledger notes.
- **Digests are `.mdx` only** under `illustrated/` (or the configured
  `visuals.illustrated` path).
- The gallery app and its `node_modules` stay outside every Atlas generator,
  ownership glob, and retrieval index.

Violating this creates a self-referential loop (the display layer becomes
“architecture memory”).

## Three presentation tiers (brief)

The companion presents vault notes in three tiers. Coverage of digests is
**not** a goal; most notes never leave the first two tiers.

| Tier | What | Cost | Typical coverage |
|------|------|------|------------------|
| **Typeset** | Source markdown in a shared typeset stylesheet | One CSS surface | Every note |
| **Derived** | Deterministic chrome from frontmatter + headings (hero hook, metrics, tags, TOC) | Code only — **zero LLM** | Every note |
| **Digest** | Hand-authored editorial MDX (stock hero, diagram, synthesized cards, motion) | LLM session + review | The few notes that earn it |

Typeset + Derived are the product floor for a stranger’s vault. Digests are
earned per genre (often programs, load-bearing specs/decisions) — not a
coverage KPI.

## What stays in memory-atlas

- Verifier, stamp, build, wire, adopt, migrate, search
- `visuals` config shape + schema + defaults
- Hard exclusion of `visuals/` from note loading and default search

## What lives only in memory-atlas-visuals

- React/Vite gallery, skins, MDX kit
- Digest authoring pipeline / skin skills
- Diagram and stock asset tooling

## See also

- [Configuration — `visuals`](./CONFIG.md#visuals) — field table
- [Works with](./works-with.md) — fleet row for the companion
- [SPEC.md](../SPEC.md) — `visuals/` reserved; presentation remains a non-goal **of this standard**
