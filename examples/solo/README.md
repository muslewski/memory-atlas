# Solo baseline: no companion tools

The Atlas works standalone — neither agentic-sage nor token-oracle is
required. This is the walkthrough with zero companions installed, so the
`with-agentic-sage/` and `with-token-oracle/` examples read as additive,
never as prerequisites.

## 1. Init

`npx memory-atlas init` scaffolds `<repo>-atlas/` (core skeleton plus
`atlas.config.json` at the repo root). Add `--modules backlog,drafts` for
optional modules from the start; see `docs/CONFIG.md`.

## 2. Seed

Write 4–8 zone cards under `map/zones/` from the copied `templates/zone.md`
scaffold, one per coherent subsystem. Every generated card starts
`status: seeded` / `verifiedAt: unverified` until a human (or a supervised
agent) actually verifies its claims — nothing self-promotes (SPEC.md →
"Zone cards and anchors").

## 3. Onramp

Paste the CLAUDE.md and/or AGENTS.md blocks from `docs/ONRAMP.md` so agent
sessions orient from `map/index.md` before exploring code directly.

## 4. Check

`npx memory-atlas build` regenerates `map/index.md`; `npx memory-atlas check`
verifies zone claims against the tree, confirms the **working-tree**
`map/index.md` matches a fresh render, and lints the ledger. Run
`npx memory-atlas check` locally before you call the work done.

Full detail lives in `docs/ONRAMP.md` and `docs/CONFIG.md` — this file is
only the map of where to look.
