---
type: zone
summary: "atlas.config.json's loader: the v1 default shape, a tolerant deep merge (missing/partial/unknown-key configs never crash a command), check.indexSync as on-disk vs render (not git HEAD), and the JSON schema that gives editors autocomplete."
tags: [config]
status: active
created: 2026-07-09
updated: 2026-07-30
verifiedAt: 67d09307
owns:
  routes: []
  testids: []
  globs:
    - "lib/config.mjs"
    - "schema/**"
    - "docs/CONFIG.md"
  tools: []
depends: []
invariants:
  - rule: "loadConfig never throws — a missing file, invalid JSON, non-object root, unknown key, or wrong-typed value each warn once (to stderr) and fall back to the matching default, recursively"
    enforcedBy: ["test/config.test.mjs"]
  - rule: "loadConfig refuses non-regular atlas.config.json (FIFO, directory, socket) with one warning and defaults — never blocks forever on a FIFO"
    enforcedBy: ["test/config.test.mjs", "test/cli-errors.test.mjs"]
skills: []
advances: []
related: []
sources:
  - [[0003-vault-named-atlas]]
---

## What this is

`lib/config.mjs` is the single source of the default folder/module/anchor/
hook/routine shape (`DEFAULTS`, plus the individual `DEFAULT_*` exports
every other module imports rather than re-typing a literal path). `loadConfig`
reads `atlas.config.json` from the repo root and deep-merges it onto that
shape via `mergeObject`/`mergeValue`. `schema/atlas.config.schema.json` is
the JSON Schema an editor resolves through the `$schema` key `atlas init`
writes, giving per-field descriptions and autocomplete without this package
needing a runtime schema-validation dependency. `docs/CONFIG.md` is the
field-level writeup SPEC.md's Configuration section points to.

## Anchors

`lib/config.mjs` is one file; `schema/**` is currently one file
(`atlas.config.schema.json`) but globbed as a directory since a schema
naturally grows (e.g. a v2 shape) without the zone card needing an edit.
`docs/CONFIG.md` is included here rather than in [[agent-onramp]] because it
documents this zone's own file format, not the agent on-ramp.

## Invariants

This is the tolerance property that makes `atlas.config.json` safe to
hand-edit: a typo'd key or a `"true"` string where a boolean was expected
degrades to one stderr warning line and the default value, never a crash —
"every optional feature defaults off/safe" per this module's own header
comment.

## Lineage

`vaultDir` (this zone's field, default `null`, always set by `atlas init`)
is what lets a repo's vault be named anything — `atlas/` here rather than
the default `memory-atlas-atlas/` — see [[0003-vault-named-atlas]]. Note
this CLI never trusts `vaultDir` for its own discovery (that's
[[vault-io]]'s structural detection); the field is informational, for
companion tooling, per `docs/CONFIG.md`.
