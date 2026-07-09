---
type: decision
summary: "This repo's own vault is named atlas/, not the default memory-atlas-atlas/ that atlas init would otherwise produce — a deliberate exercise of the vaultDir config knob."
tags: [dogfood, config]
status: active
created: 2026-07-09
updated: 2026-07-09
decided: 2026-07-09
supersededBy: ""
zones:
  - config
  - cli
related: []
sources: []
---

## Context

`atlas init`'s default vault name is `${path.basename(repoRoot)}-atlas`
(`lib/init.mjs`) — for this repository, that default would be
`memory-atlas-atlas/`, which reads as a doubled, slightly awkward name for
the one repo whose whole purpose is to define what an Atlas is.
`atlas init --vault <name>` exists specifically to override the default,
and `atlas.config.json`'s `vaultDir` field records whatever name was
chosen.

## Decision

This repo's vault was scaffolded with `node bin/atlas.mjs init --vault atlas`,
producing `atlas/` at the repo root instead of `memory-atlas-atlas/`.
`atlas.config.json`'s `vaultDir` is `"atlas"`.

## Why

Two reasons. First, readability: `atlas/map/index.md` reads better than
`memory-atlas-atlas/map/index.md` for a repo already named `memory-atlas`.
Second, and more importantly, this is a deliberate demonstration that the
vault's name is genuinely arbitrary to the tooling — `lib/detect.mjs`'s
`findVaultDir` discovers a vault by structure (a directory containing
`map/zones/` or `map/index.md`), never by name; a legacy name-suffix
fallback (see `lib/detect.mjs`) is only used for the case where no
structural hit exists yet (e.g. a vault directory that was just created and
has no `map/` content). Naming this repo's own vault something other than the
default, and having every command still work unmodified, is the concrete
proof that "discover by structure, never by name" (SPEC.md's Interop
section) actually holds.
