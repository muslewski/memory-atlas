---
title: "Configuration"
description: "atlas.config.json field reference — vault layout, modules, anchors, checks, hooks."
section: reference
order: 30
---

# `atlas.config.json` reference

`atlas.config.json` lives at the **repository root** (not inside the vault)
and is the single source of truth for how a specific repo's Atlas is wired:
folder remapping, optional modules, `owns` resolver classes, retrieval
exclusions, hook toggles, and self-maintenance routines. SPEC.md's
Configuration section points here for the normative, field-level shape —
this document is that shape.

Every command loads this file through a tolerant deep merge onto the full
default shape shown below: a missing file, a partial file, or an unknown key
never crashes a command — unknown keys and type mismatches print one stderr
warning line each and fall back to the default. An editor pointed at
`schema/atlas.config.schema.json` (via the `$schema` key below) gets
per-field descriptions and autocomplete.

```json
{
  "$schema": "./node_modules/memory-atlas/schema/atlas.config.schema.json",
  "version": 1,
  "enabled": true,
  "vaultDir": "acme-shop-atlas",
  "folders": {
    "zones": "map/zones", "decisions": "map/decisions", "flows": "map/flows",
    "specs": "specs", "plans": "plans", "programs": "programs",
    "ideas": "ideas", "techDebt": "tech-debt", "vision": "vision",
    "reference": "reference", "archive": "archive", "drafts": "drafts",
    "templates": "templates"
  },
  "modules": { "flows": false, "programs": false, "vision": false,
               "reference": false, "archive": false, "backlog": false,
               "drafts": false },
  "anchors": {
    "testids": { "enabled": false, "pattern": "data-testid=\"{id}\"", "root": "src" },
    "tools":   { "enabled": false, "pattern": "'{id}'", "root": "" },
    "routes":  { "enabled": false, "fileGlobs": [], "stripPrefix": "", "stripSuffix": "" }
  },
  "check": {
    "strictFreshness": false,
    "ownership": true,
    "corpus": { "enabled": false, "maxSummaryLen": 500 }
  },
  "retrieval": {
    "engine": "ctx-search",
    "excludeFromSearch": ["drafts/", "visuals/"]
  },
  "skills": { "dir": ".claude/skills", "nav": "atlas-nav" },
  "hooks": { "sessionStartStatus": true, "sessionStartIndexRefresh": true },
  "routines": { "enabled": false, "cadenceDays": 7, "tasks": ["gardening"] }
}
```

`atlas init` writes exactly this shape (with `vaultDir` set to the vault it
just scaffolded) — open a fresh repo's `atlas.config.json` and it already
documents every key.

## Field reference

### `version`

Type `integer`, default `1`. The config *shape* version — bumps only on a
breaking change to this schema, independent of the package's own semver.

### `enabled`

Type `boolean`, default `true`. The master kill switch. Set to `false` and:

- every `atlas` subcommand except `init` prints nothing and exits 0;
- the ctx-search adapter's SessionStart invocation exits immediately,
  without spawning its reindex worker.

This is the safe default for a repo that vendored the convention but paused
the practice — nothing errors, nothing runs, no code needs to change back.

### `vaultDir`

Type `string | null`, default `null` (in practice always set by `atlas
init`). Repo-relative path to the vault directory. This field is
**informational** for external/companion tooling (SPEC.md Interop:
companion tools should read `vaultDir`/`folders` rather than assuming
layout). This CLI itself always discovers the vault by structure — the
first directory containing `map/index.md` or `map/zones/` — never by
trusting this field, per SPEC.md's "discover by structure, never by name"
rule.

### `folders`

Type `object`. Vault-relative paths (relative to `vaultDir`) for each
note-type module. Every loader (`notes`, `ledger`, `status`, `init`'s
additive-scaffolding mode, `routine`'s vault-routines lookup) resolves
directory locations through this map — remapping any entry is free:

```json
"folders": { "ideas": "notes/sparks", "techDebt": "debt" }
```

`atlas init`, run again in an existing vault, will create `notes/sparks/`
and `debt/` instead of the defaults `ideas/` and `tech-debt/`. `map/index.md`
itself is not remappable — it's a fixed generated-file location per SPEC.md's
vault layout, independent of this map.

### `modules`

Type `object`, all `boolean`, default `false`. Optional vault modules beyond
the core skeleton (`map/zones`, `map/decisions`, `specs`, `plans`, `ideas`,
`tech-debt`, `templates`) — SPEC.md requires an Atlas never scaffold an
empty optional module by default, so each stays off until enabled here or
via `atlas init --modules <name>,<name>`.

### `anchors`

Type `object`. Optional `owns.*` resolver classes beyond the always-on,
always-required `owns.globs`. Each class (`testids`, `tools`, `routes`) MUST
be declared here (`enabled: true`) before a verifier enforces it — SPEC.md
§5. `testids`/`tools` are HARD anchors (an unresolved id is an error);
`routes` is SOFT (an unresolved route warns, it doesn't fail `atlas check`).

### `check`

Type `object`.

- `strictFreshness` (`boolean`, default `false`): when `true`, any stale
  zone fails `atlas check`. Useful for CI. Staleness stays advisory under
  plain `atlas check` and under `atlas check --strict` — only this config
  key hardens it (SPEC.md owner decision 3).
- `ownership` (`boolean`, default `true`): enforce one-artifact-one-owner
  across mounted zones' `owns.globs`.
- `corpus` (`object`, default `{ enabled: false, maxSummaryLen: 500 }`):
  opt-in retrieval-shape lint (summary cap, required headers, body links,
  orphans).

### `retrieval`

Type `object`.

- `engine` — one of `ctx-search | obsidian-skills | grep | none`, default
  `ctx-search`. Informational in v0.1: no retrieval engine is ever required,
  this just documents which one a repo uses so its skills/adapters can
  message correctly.
- `excludeFromSearch` — array of vault-relative folder names (trailing
  slash), default `["drafts/", "visuals/"]`. Hidden from *automatic*
  agent-facing indexing, search results, and orientation sweeps — the same
  `.clineignore`-style precedent: an agent explicitly asked to read one
  specific excluded file may still do so. Hidden, not sealed.

### `skills`

Type `object`. `dir` (default `.claude/skills`) and `nav` (default
`atlas-nav`): where this repo keeps its Atlas-navigation skills, and which
one is the entry ramp. Documents the wiring described in `docs/ONRAMP.md`.

### `hooks`

Type `object`, all `boolean`, default `true`. Per-hook toggles so a repo can
disable one SessionStart helper without touching `.claude/settings.json`:

- `sessionStartStatus` — gates `atlas status --hook` only. A direct
  `atlas status` (no `--hook`) always prints, regardless of this toggle —
  SPEC.md Interop requires a CLI invoked by both a hook and a human to
  distinguish the two call sites with a `--hook` flag, and this is that
  flag.
- `sessionStartIndexRefresh` — gates the ctx-search adapter's automatic
  SessionStart invocation (no flags). A deliberate `--worker`/`--force` run
  of the adapter script still runs regardless of this toggle.

Every hook body here returns in under a second and fails open (prints
nothing, exits 0) — never surfaces an error on a normal session start.

### `routines`

Type `object`. Configuration for `atlas routine` — see below. This package
never schedules anything; `enabled`/`cadenceDays`/`tasks` describe how a
repo *wants* to run routines, for the human (or the human's own scheduler)
to act on.

## `atlas routine`

`atlas routine <name>` prints a self-contained maintenance-prompt template
with `{{CADENCE_DAYS}}` substituted (from `routines.cadenceDays`) and a live
counts footer (current zone/seeded/stale/open-debt counts) appended — a
paste-ready prompt for an agent session, not something this package runs
itself. `atlas routine` with no name lists available routines: the vault's
own `<folders.templates>/routines/*.md` first, then this package's built-in
`templates/routines/*.md` — a vault-level routine shadows a built-in of the
same name, so a repo can add or override routines without forking anything.

## Recipes

### Hide two extra human folders from retrieval

```json
"retrieval": { "excludeFromSearch": ["drafts/", "visuals/", "scratch/", "raw-notes/"] }
```

### Remap `ideas` to a different folder name

```json
"folders": { "ideas": "notes/sparks" }
```

### Disable everything except `atlas status`

```json
{ "enabled": false }
```

then wire only `atlas status --hook` in `.claude/settings.json` — every
other command, and the ctx-search adapter, becomes a silent no-op. (This
disables `status` too, since the kill switch is global — there is no
"disable everything but one command" toggle; use per-hook toggles under
`hooks` instead if you specifically want to keep `status` alive while
turning off the index-refresh hook.)

### Strict CI freshness (config only — not the `--strict` flag)

```json
"check": { "strictFreshness": true }
```

### Point skills at a custom directory

```json
"skills": { "dir": "tools/agent-skills", "nav": "repo-nav" }
```
