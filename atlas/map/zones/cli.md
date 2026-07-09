---
type: zone
summary: "The atlas command-line entry point: bin/atlas.mjs's dispatch table plus the four subcommand implementations it delegates to (init, stamp, status, routine)."
tags: [cli]
status: active
created: 2026-07-09
updated: 2026-07-09
verifiedAt: 705fbdc8
owns:
  routes: []
  testids: []
  globs:
    - "bin/**"
    - "lib/init.mjs"
    - "lib/stamp.mjs"
    - "lib/status.mjs"
    - "lib/routine.mjs"
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
skills: []
advances: []
related: []
sources:
  - [[0003-vault-named-atlas]]
---

## What this is

`bin/atlas.mjs` is the single executable this package ships (`atlas` and
`memory-atlas` both point at it — see `package.json`'s `bin` map). It parses
`argv`, resolves the repo root + vault dir once (`resolveVault`), honors the
`enabled: false` kill switch for every subcommand except `init`, and
dispatches to a handler. `build` and `check` are implemented inline in
`bin/atlas.mjs` itself (sharing `buildCore`); `init`, `stamp`, `status`, and
`routine` are implemented as separate `lib/*.mjs` modules that `bin/atlas.mjs`
imports and calls directly — this zone owns both the dispatcher and those
four subcommand modules, since together they *are* "the CLI's surface."

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
