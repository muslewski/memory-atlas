---
title: "Adoption"
description: "Brownfield migrate existing docs, ADRs, and mind trees into Atlas shape without faking verification."
section: guide
order: 20
---

# Adopting the Atlas convention in an existing repository

`docs/ONRAMP.md` is the copy-paste kit for wiring a repo into the
convention once a vault exists. This document is the harder path: migrating
a repo that already has years of scattered docs, ADRs, spec folders, and
TODO lists into that shape without losing anything or faking verification
along the way.

## Greenfield vs brownfield

A greenfield repo (no prior knowledge-base convention) just runs
`atlas init`, seeds a handful of zone cards from a fresh reading of the
code, and follows `docs/ONRAMP.md`'s install flow. That path needs no
further guidance — this document is for everything else: a repo whose
knowledge already lives somewhere, in some shape, and needs migrating
rather than starting from a blank vault.

## Inventory what you have

Before running `atlas init`, list every place decisions, designs, and plans
already live. Most repos have some subset of these:

| What you likely have | Maps to |
|---|---|
| `docs/adr/*`, `ARCHITECTURE_DECISIONS.md`, or similar | `map/decisions/` |
| `docs/specs/`, or output from any spec-writing workflow | `specs/` |
| Loose `TODO.md`, `KNOWN_ISSUES.md`, or debt lists | `tech-debt/` |
| Brainstorm notes, `IDEAS.md`, scratch design docs | `ideas/` |

Nothing here requires a big-bang migration. `atlas init` run again in an
existing vault runs in additive mode — it only creates what's missing — so
inventory and import can happen incrementally, folder by folder.

## Normalize as you move

The point of migrating is to stop carrying multiple shapes for the same
kind of note. Four normalizations matter most, because they're exactly what
a verifier checks:

- **One tech-debt shape.** Every deferred-work note becomes `type: debt`
  with `severity` and `effort` fields (see `templates/notes/debt.md`) —
  not a mix of GitHub issues, a markdown checklist, and a spreadsheet.
- **Lifecycle statuses match SPEC.md §4's enums**, not whatever your prior
  tool called them. Common renames, illustrative rather than exhaustive:

  | Legacy status | Real status | Type |
  |---|---|---|
  | `in-progress`, `wip` | `executing` | plan |
  | `merged`, `shipped` | `done` | plan |
  | `todo`, `backlog` | `open` | debt |
  | `fixed`, `resolved` | `done` | debt |

  `approved` is already a valid `spec` status — no rename needed there.
  `atlas check` (via its ledger pass) flags any `specs/`/`plans/` note whose
  `status` isn't in its type's real enum, by file path, so a missed rename
  surfaces immediately rather than silently.
- **`verifiedAt` only ever holds `unverified` or a commit SHA** — never an
  ISO date, an empty string, or "TODO". If your prior convention stamped
  dates, convert them: either `unverified` (safe default, re-verify later)
  or the SHA nearest that date if you can recover it from `git log`.
- **Decision numbering is unique and ascending.** If two legacy ADR sets
  collide on a number during import, renumber the later one and keep a
  `formerly: NNNN-old-slug` breadcrumb in its frontmatter (a plain extra
  key — nothing in the core taxonomy depends on it, and it's harmless to a
  verifier that doesn't know the key). This isn't something `atlas check`
  enforces today; it's a discipline for the humans doing the import.

## Seed zones honestly

Whether a zone card is written by hand or drafted by an agent reading the
codebase, it starts `status: seeded` / `verifiedAt: unverified` — SPEC.md
calls this "load-bearing": a generator must never promote a card out of
`seeded` itself. `atlas stamp <slug...>` is the only path to `active`, and
it refuses a blanket "stamp everything" call (no `--all` shortcut exists) —
so a migration that machine-generates twenty zone cards in one pass cannot
also machine-verify them in the same pass. Budget real review time per
zone; a `seeded` card sitting in the index is honest signal, not a bug to
suppress.

## Wire the gate

Run `atlas check` locally first, and fix real failures (a glob that matches
no tracked file almost always means the code moved and the card didn't
follow). Once errors are clean, add `atlas check` to CI. Staleness
(`verifiedAt` older than the last change to a zone's `owns.globs`) is
advisory by default — it warns, it doesn't fail the build — so a large
migration can land with every zone `active` but several stale, and burn
that list down over following weeks. Once the stale count is at or near
zero, flip on `--strict` (or set `"check": { "strictFreshness": true }` in
`atlas.config.json` so CI doesn't need to remember the flag) to make
staleness block merges.

## Coexistence

Adopting the Atlas doesn't require replacing whatever already produces
specs and plans. Keep the producing tool and redirect its output into the
vault: point it at `specs/` and `plans/` via whatever path preference
mechanism it honors (a CLAUDE.md "pipeline" line naming the target
directory works for any tool that reads user path preferences from its
instruction file, rather than hardcoding its own default location).
Finished artifacts move into the Ledger during recollection; nothing about
this requires the producing tool to know the Atlas exists.

## Rollback

The vault is plain markdown files in one directory, plus one JSON file
(`atlas.config.json`) at the repo root. There is no database, no build
step, and no generated artifact outside `map/index.md`. Deleting both
fully and cleanly uninstalls the convention — nothing else in the repo
depends on either existing.
