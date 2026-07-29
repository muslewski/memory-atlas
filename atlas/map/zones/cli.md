---
type: zone
summary: "The atlas command-line entry point: bin/atlas.mjs dispatch plus init/stamp/status/routine/wire/merge drivers; local telemetry and opt-in fleet-devlog v1 emit on finished commands."
tags: [cli]
status: active
created: 2026-07-09
updated: 2026-07-29
verifiedAt: f1ff93d5
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
    - "lib/merge-index.mjs"
    - "lib/merge-zone.mjs"
    - "lib/doctor.mjs"
    - "test/fleet-devlog.test.mjs"
    - "test/merge-index.test.mjs"
    - "test/merge-zone.test.mjs"
    - "test/wire.test.mjs"
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
skills: []
advances: []
related: []
sources:
  - [[0003-vault-named-atlas]]
  - [[2026-07-30-verifiedAt-after-merge-unverified]]
---

## What this is

`bin/atlas.mjs` is the single executable this package ships (`atlas` and
`memory-atlas` both point at it — see `package.json`'s `bin` map). It parses
`argv`, resolves the repo root + vault dir once (`resolveVault`), honors the
`enabled: false` kill switch for every subcommand except `init`, and
dispatches to a handler. `build` and `check` are implemented inline in
`bin/atlas.mjs` itself (sharing `buildCore` / `renderCore`); subcommands
live under `lib/*.mjs`. This zone also owns the portable concurrent-edit
safety net: `lib/wire.mjs` (`atlas wire merge-driver --write`),
`lib/merge-index.mjs` (regenerate `map/index.md` on conflict), and
`lib/merge-zone.mjs` (stamp-only conflicts → `verifiedAt: unverified`).

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

