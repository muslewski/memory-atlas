---
type: zone
summary: "Turning the vault's files on disk into the plain note objects the verifier consumes: the zero-dependency YAML-subset frontmatter parser, recursive note loading with safe folder remaps, structural vault detection, and the specs/plans ledger linter."
tags: [vault-io]
status: active
created: 2026-07-09
updated: 2026-07-29
verifiedAt: 00cc9ec9
owns:
  routes: []
  testids: []
  globs:
    - "lib/frontmatter.mjs"
    - "lib/notes.mjs"
    - "lib/detect.mjs"
    - "lib/ledger.mjs"
    - "lib/adopt.mjs"
    - "lib/migrations/**"
  tools: []
depends:
  - [[config]]
  - [[verifier-core]]
invariants:
  - rule: "a directory is recognized as an Atlas vault by structure — containing map/zones/ or map/index.md — never by directory name; a legacy name-suffix fallback (see lib/detect.mjs) is only used when no structural match exists"
    enforcedBy: ["test/detect.test.mjs"]
  - rule: "every note under specs/ and plans/ is checked against its type's lifecycle enum and must carry a non-empty summary; violations are reported by path, not thrown"
    enforcedBy: ["test/ledger.test.mjs"]
  - rule: "folders.zones with .. segments is refused — loadVault never indexes zone cards from outside the vault"
    enforcedBy: ["test/paths-containment.test.mjs"]
skills: []
advances: []
related: []
sources:
  - [[0001-zero-dependency-constraint]]
  - [[0002-yaml-subset-not-yaml]]
---

## What this is

`lib/frontmatter.mjs` is a hand-rolled parser for the deliberate SUBSET of
YAML the note templates emit (see its own header comment and
[[0002-yaml-subset-not-yaml]]) — no `js-yaml` or other YAML library.
`lib/notes.mjs` walks a vault's folders (`readNotes` flat, `readNotesDeep`
recursive, skipping `visuals/` and any `retrieval.excludeFromSearch` entry)
and turns each `.md` file into a note object, plus assembles the vault-wide
note-id set the graph pass resolves `[[wikilinks]]` against.
`lib/detect.mjs` finds the repo root (nearest ancestor `.git`) and the vault
dir (structural detection first, name-suffix fallback second).
`lib/ledger.mjs` is the ledger linter invoked by `atlas check --ledger-only`
— it walks `specs/` and `plans/` and checks each note's frontmatter against
SPEC.md's universal fields and per-type lifecycle enum.

## Anchors

Four files. `ledger.mjs` groups here rather than with [[verifier-core]]
because — unlike `validate.mjs` — it reads the filesystem directly
(`fs.readdirSync`/`readFileSync`) to turn ledger notes into checkable data,
the same role `notes.mjs` plays for zones/flows/decisions; it is not part of
the pure, resolver-driven core.

## Invariants

Structural vault detection is what lets a repo name its vault anything
(`atlas/` here, demonstrated by [[0003-vault-named-atlas]] — that decision
is wired to [[cli]] and [[config]] rather than here, since it's the
`--vault` flag and the `vaultDir` config field that make the name
choosable; this zone is what makes the choice *irrelevant to discovery*).
The ledger-lifecycle invariant is the mechanical half of SPEC.md's Ledger
tier: past-tense notes are frozen by convention, and this linter is what a
CI `atlas check` actually gates on for that convention.

## Lineage

`lib/frontmatter.mjs`'s subset-not-full-YAML design and `lib/resolvers.mjs`'s
git-shell-out-not-glob-library design (see [[verifier-core]]) are the two
concrete instances of [[0001-zero-dependency-constraint]] in this repo's own
code.
