---
title: "Documentation"
description: "Code-verified architecture vaults for agent fleets — what it is, install, concepts, reference, troubleshooting."
section: home
order: 0
---

# memory-atlas documentation

**memory-atlas** is a per-repo knowledge vault for coding agents: plain-markdown **zone cards** with an honest `verifiedAt` freshness signal. npm ships the engine; your vault lives **in the repo** as data.

Site: [atlas.muslewski.com](https://atlas.muslewski.com) · npm: [`memory-atlas`](https://www.npmjs.com/package/memory-atlas)

Thirty-second install path (empty vault → `atlas check: ok`): root [`README.md`](../README.md).

## Start here

Read top to bottom the first time:

| Path | For |
|------|-----|
| [On-ramp](./ONRAMP.md) | Wire CLAUDE.md / AGENTS.md, SessionStart hooks, skills after `atlas init` |
| [Adoption](./ADOPTION.md) | Brownfield migrate: existing docs/ADRs/mind → Atlas shape |
| [Containment and honesty](./containment.md) | Write-path realpath checks; exit codes; index regenerate vs text-merge |
| [Recollecting in parallel](./recollecting-in-parallel.md) | Worker vs integrator; `check.indexSync`; local merge driver |
| [Command reference](./COMMANDS.md) | Every `atlas` verb: flags, writes, exit codes, observed output |
| [Configuration](./CONFIG.md) | `atlas.config.json` field reference |
| [Troubleshooting](./troubleshooting.md) | Literal error messages, fixes, and `atlas doctor` inventory semantics |
| [Works with](./works-with.md) | Fleet siblings (sage, herald, oracle, armory, ferry) |
| [Visuals companion](./VISUALS.md) | Optional presentation plane (`memory-atlas-visuals`) — not part of this package |
| [CI recipe](./CI.md) | Optional local/`check` recipe you can paste into *your* automation — this package has no hosted CI |

## Doctrine (short)

1. **Verified, not believed** — claims tie to git (`owns.globs`, `verifiedAt`), not session transcripts.
2. **Map vs ledger** — present-tense zones separate from frozen decisions/specs/plans.
3. **Recollection on finish** — update + stamp zones in the same change as the code.
4. **Solo-first** — zero sibling packages required; interop is optional file contracts.

## Where other knowledge lives

| Kind | Location |
|------|----------|
| **Public product docs** | `docs/` (this tree) |
| **Architecture mind (dogfood)** | [`atlas/`](../atlas/) — zones, decisions, specs, plans |
| **Normative product spec** | [`SPEC.md`](../SPEC.md) (repo root — not duplicated here) |
| **Agent on-ramp (this repo)** | [`CLAUDE.md`](../CLAUDE.md) / [`AGENTS.md`](../AGENTS.md) |
| **Changelog** | [`CHANGELOG.md`](../CHANGELOG.md) |

Design specs and implementation plans for *this* toolkit live under `atlas/specs/` and `atlas/plans/` (and advisor-plans for program tracking) — not under public `docs/`.
