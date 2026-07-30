---
type: zone
summary: "The atlas command-line entry point: bin/atlas.mjs dispatch plus init/stamp/status/routine/wire/merge drivers; user-scope skill satisfaction and re-vendor drift checks; path-contained writes; local telemetry and opt-in fleet-devlog v1 emit on finished commands."
tags: [cli]
status: active
created: 2026-07-09
updated: 2026-07-30
verifiedAt: 88d7bf18
owns:
  routes: []
  testids: []
  globs:
    - "bin/**"
    - "lib/init.mjs"
    - "lib/stamp.mjs"
    - "lib/status.mjs"
    - "lib/routine.mjs"
    - "lib/telemetry.mjs"
    - "lib/fleet-devlog.mjs"
    - "lib/wire.mjs"
    - "lib/skills.mjs"
    - "lib/merge-index.mjs"
    - "lib/merge-zone.mjs"
    - "lib/doctor.mjs"
    - "lib/gate.mjs"
    - "lib/paths.mjs"
    - "test/fleet-devlog.test.mjs"
    - "test/merge-index.test.mjs"
    - "test/merge-zone.test.mjs"
    - "test/wire.test.mjs"
    - "test/paths-containment.test.mjs"
    - "test/cli-errors.test.mjs"
    - "test/gate.test.mjs"
    - "test/doctor.test.mjs"
  tools: []
depends:
  - [[verifier-core]]
  - [[vault-io]]
  - [[config]]
invariants:
  - rule: "atlas stamp requires explicit zone slugs; --all and no-args both exit 1 and touch no file — there is no blanket 'stamp everything' shortcut"
    enforcedBy: ["test/integration.test.mjs"]
  - rule: "atlas status --hook honors atlas.config.json's hooks.sessionStartStatus (silences the hook call site only); a direct human/script `atlas status` call always prints regardless of that toggle"
    enforcedBy: ["test/integration.test.mjs"]
  - rule: "atlas wire merge-driver is report-first (writes only with --write), refuses dirty trees unless --allow-dirty, and is idempotent on a second --write"
    enforcedBy: ["test/wire.test.mjs"]
  - rule: "atlas-index merge driver regenerates from the union of merge-parent zone cards and refuses (exit 1, no partial write) when parents disagree and the working tree still matches only one pure side, or when render is empty while zones exist"
    enforcedBy: ["test/merge-index.test.mjs"]
  - rule: "stamp and build refuse path traversal / out-of-vault symlinks — write targets must resolve inside the vault/repo root"
    enforcedBy: ["test/paths-containment.test.mjs", "test/stamp.test.mjs"]
  - rule: "atlas check loads atlas.config.json once (type-mismatch warnings emit once); build/stamp/check surface EACCES, unparseable zones, ENOTDIR, and ELOOP as one-line CLI errors without a Node stack"
    enforcedBy: ["test/cli-errors.test.mjs"]
  - rule: "when a package skill exists at user-scope (ATLAS_USER_SKILLS_DIR or ~/.claude/skills) and skills.vendorInRepo is false, wire does not copy it into the repo and records source:user-scope; doctor and gate share the same re-vendor redundant/drift findings without guessing which side is newer"
    enforcedBy: ["test/wire.test.mjs"]
skills: []
advances: []
related: []
sources:
  - [[0003-vault-named-atlas]]
  - [[2026-07-30-verifiedAt-after-merge-unverified]]
  - [[2026-07-30-index-merge-materialize-union]]
  - [[2026-07-30-user-scope-skills-satisfy-wiring]]
---

## What this is

`bin/atlas.mjs` is the single executable this package ships (`atlas` and
`memory-atlas` both point at it — see `package.json`'s `bin` map). It parses
`argv`, resolves the repo root + vault dir once (`resolveVault`), honors the
`enabled: false` kill switch for every subcommand except `init`, and
dispatches to a handler. Uncaught handler errors print a one-line CLI message
(not a raw Node stack). `build` and `check` are implemented inline in
`bin/atlas.mjs` itself (sharing `buildCore` / `renderCore`); subcommands
live under `lib/*.mjs`. This zone also owns the portable concurrent-edit
safety net: `lib/wire.mjs` (`atlas wire merge-driver --write`),
`lib/merge-index.mjs` (regenerate `map/index.md` from the **merged** zone
set — refuse rather than first-parent-guess; see
[[2026-07-30-index-merge-materialize-union]]), and
`lib/merge-zone.mjs` (stamp-only conflicts → `verifiedAt: unverified`).
`lib/paths.mjs` is the shared containment helper for stamp/build writes.
`lib/skills.mjs` is the shared user-scope skill resolver and re-vendor
redundant/drift checker used by wire, doctor, and gate (see
[[2026-07-30-user-scope-skills-satisfy-wiring]]). `atlas init` leaves a vault
whose empty index already matches `renderIndex`, so `atlas check` passes with
no further commands.

## Anchors

`bin/**` covers the one executable file. The four `lib/*.mjs` globs are each
a single file rather than a directory glob because none of them share a
directory with unrelated code — `lib/` is flat, one file per concern (see
[[vault-io]] and [[verifier-core]] for the other `lib/*.mjs` files, which
implement the verification engine `build`/`check` call into, not the CLI
layer itself).

## Invariants

Both invariants above are about a CLI safety property that would be easy to
regress silently: a stamp command that quietly grew an `--all` flag, or a
hook that printed on every session start regardless of config, would each be
a real footgun for an adopting repo. Both are exercised by
`test/integration.test.mjs`, which drives the real built `bin/atlas.mjs`
binary (via `execFileSync`) end-to-end rather than unit-testing the
handler functions in isolation.

## Lineage

The `--vault` flag on `atlas init` (`lib/init.mjs`'s `parseArgs`) is what
this very repository's own vault (named `atlas/`, not the default
`memory-atlas-atlas/`) exercises — see [[0003-vault-named-atlas]].

## Fleet-devlog (W7)

Finished CLI commands also append to the **shared** opt-in local stream at
`$XDG_STATE_HOME/fleet-devlog/events.jsonl` via vendored `lib/fleet-devlog.mjs`,
alongside the legacy `~/.cache/memory-atlas/events.jsonl` stream. Enable only via
`FLEET_DEVLOG` or machine config — never repo config. Contract `repo_id` is
`<basename>-<sha256-8>` of the main repo root (worktrees fold); the legacy
telemetry `repo_id` hash is unchanged so stored history stays valid.

