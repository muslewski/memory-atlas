---
type: zone
summary: "The verification engine: lib/validate.mjs's pure core (anchor checks, verifiedAt lifecycle rules, the graph pass, index rendering) plus lib/resolvers.mjs, the git-backed factory that implements the Resolvers interface the core is driven by."
tags: [verifier]
status: active
created: 2026-07-09
updated: 2026-07-29
verifiedAt: f1ff93d5
owns:
  routes: []
  testids: []
  globs:
    - "lib/validate.mjs"
    - "lib/resolvers.mjs"
  tools: []
depends: []
invariants:
  - rule: "an unmounted zone's anchors (owns.globs/testids/tools/routes) are never evaluated — checked and routed to the attic BEFORE any anchor check runs, so retired code can't produce a false failure"
    enforcedBy: ["test/validate.test.mjs"]
  - rule: "verifiedAt encoding is checked against status: seeded requires the literal string \"unverified\"; active requires a 7-40 hex-char commit SHA or \"unverified\" (stamp invalidated after merge); ISO dates and other garbage are hard errors"
    enforcedBy: ["test/validate.test.mjs", "test/merge-zone.test.mjs"]
skills: []
advances: []
related: []
sources:
  - [[0001-zero-dependency-constraint]]
  - [[2026-07-30-verifiedAt-after-merge-unverified]]
---

## What this is

`lib/validate.mjs` is deliberately free of `fs`, `child_process`, and config
reads — its own file header states this explicitly: "No fs, no
child_process, no config reads — everything is injected (zones/flows/graph
data, resolvers)." That purity is both the unit-test seam (fake resolvers,
no git needed — see `test/validate.test.mjs`'s `fakeResolvers()`) and an
embedding seam for other tools. `lib/resolvers.mjs` is the one module
"allowed to shell out to git for anchor resolution" (its own header) — it
builds the real `{ glob, changedSince, testid?, tool?, route? }` object that
[[cli]]'s `buildCore` passes into `validate()`. The two files are a matched
pair: a pure decision core plus its one real-world resolver implementation.

## Anchors

Two files, no directory glob needed — `validate.mjs` and `resolvers.mjs` are
the only two `lib/*.mjs` files whose job is "answer whether a zone's claims
still hold," as opposed to loading vault content ([[vault-io]]), wiring
config ([[config]]), or being a CLI subcommand ([[cli]]).

## Invariants

The unmounted-zone-skips-everything rule is what makes `status: unmounted`
safe to use at all: SPEC.md is explicit that evaluating an Attic zone's
anchors would be a false failure once the code they pointed at is gone.
The verifiedAt-encoding rule is the mechanism behind the "seeded is
load-bearing" clause in SPEC.md §4 — a machine-generated card cannot
silently promote itself by writing any SHA-looking string while still
`seeded`. `active` + `unverified` is legal after a stamp-only merge
invalidation (neither parent SHA is honest for the merged tree) — see
[[2026-07-30-verifiedAt-after-merge-unverified]]; it surfaces as a
re-stamp warning, not a hard encoding error.

## Lineage

`resolvers.mjs` resolves `owns.globs` via `git ls-files`, not a JS glob
library (`minimatch`, `globby`, …) — one concrete instance of the
zero-dependency constraint recorded in [[0001-zero-dependency-constraint]].
