---
type: zone
summary: "The copy-paste kit that wires an adopting repo's agents into the convention: three portable skills, the ctx-search and Obsidian retrieval adapters, and docs/ONRAMP.md's instruction-file blocks."
tags: [onramp]
status: active
created: 2026-07-09
updated: 2026-07-29
verifiedAt: f1ff93d5
owns:
  routes: []
  testids: []
  globs:
    - "skills/**"
    - "adapters/**"
    - "docs/ONRAMP.md"
    - "docs/recollecting-in-parallel.md"
  tools: []
depends: []
invariants:
  - rule: "the skill names and script paths docs/ONRAMP.md's install flow references (atlas-nav, writing-for-retrieval, atlas-recollection under skills/; adapters/ctx-search/nav-refresh-index.mjs) must stay in sync with what actually ships under skills/ and adapters/"
    enforcedBy: []
skills:
  - [[atlas-nav]]
  - [[atlas-recollection]]
  - [[writing-for-retrieval]]
advances: []
related: []
sources:
  - [[2026-07-30-verifiedAt-after-merge-unverified]]
---

## What this is

`skills/atlas-nav/`, `skills/atlas-recollection/`, and
`skills/writing-for-retrieval/` are the three portable Claude Code skills an
adopting repo copies in (or points a skill search path at). `adapters/`
holds two retrieval-integration options: `ctx-search/` (a detached
SessionStart-refresh script for the context-mode MCP plugin) and
`obsidian-skills/` (a pointer to `kepano/obsidian-skills`, the upstream
project — "nothing here is code", per that adapter's own README).
`docs/ONRAMP.md` is the copy-paste kit itself: the CLAUDE.md/AGENTS.md
blocks, the hook-wiring JSON, and the five-step install flow — this
repo's own `CLAUDE.md` (added in this same change) is its first real
render, substituting `<repo>-atlas` with this repo's actual vault name,
`atlas/`.

## Anchors

Notably, nothing under `skills/` or `adapters/` imports anything from
`lib/` — confirmed by grepping every file's imports; the ctx-search
adapter script only imports Node built-ins. This is deliberate: these are
meant to be copied *out* into a consumer repo, where `lib/` wouldn't even
exist, so `depends: []` here is not an oversight — it is the zone's whole
design point (SPEC.md Interop: "the Atlas never imports a sibling tool's
code").

## Invariants

Unlike the other four zones, this one currently has **no automated test**
covering it — `git grep` across `test/*.mjs` for `skills/`, `adapters/`,
or any of the three skill names by name returns nothing. The invariant
above is real and worth stating, but its `enforcedBy` is honestly empty,
which SPEC.md's verifier treats as a soft warning ("file tech-debt") rather
than an error — see [[agent-onramp-invariant-untested]] in `tech-debt/` for
the concrete follow-up this produced.

## Lineage

None yet — this zone was seeded directly from reading the shipped
`skills/`, `adapters/`, and `docs/ONRAMP.md` trees, not from a prior spec
or plan note in this vault.
