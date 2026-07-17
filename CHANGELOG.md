# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project has no stability guarantee across minor versions until 1.0
(see `SPEC.md`'s Versioning section).

## [0.3.0] - 2026-07-17

### Added

- **`atlas adopt [--write] [--json]`** — deterministic brownfield onboarding
  for repos that already have a vault-like knowledge base. Dry-run by default
  (zero filesystem writes); `--write` applies; `--json` emits a machine
  report. Transforms: decision `zones:` wikilinks → bare slugs; zone cards
  with empty/missing `verifiedAt` → `unverified` + honesty `status: seeded`;
  `type: tech-debt` → `type: debt`; `human-drafts/` → `drafts/` when the
  target is absent; seed `atlas.config.json` with optional modules detected
  from existing folders. Adoption report lists unclassified notes and next
  steps (`wire` → `migrate` → atlas-adopt skill → verify-then-stamp). Never
  pre-stamps a git SHA into `verifiedAt`.
- **`atlas-adopt` skill** — AI classification layer for notes the
  deterministic pass leaves unclassified: ground on dry `atlas adopt`,
  classify Map/Ledger/Vision, propose zone cards as `seeded`/`unverified`,
  then wire/migrate/build/check. Hard rules: never delete notes, never
  pre-stamp, frontmatter + location only during classification.

### Fixed

- **Subcommand `--help` / `-h`** — `atlas <cmd> --help` prints usage and
  exits 0 without executing the command (previously `atlas build --help`
  ran a real build; `atlas stamp --help` errored demanding slugs).

## [0.2.1] - 2026-07-17

### Fixed

- **Stamp-order guard** — `atlas stamp` warns on stderr when a zone's
  `owns.globs` match uncommitted (staged or unstaged) changes: `verifiedAt`
  anchors to committed HEAD, so stamping before the code commit leaves the
  zone stale. Exit code stays 0. On-ramp blocks (`CLAUDE.md` / `AGENTS.md`),
  `docs/ONRAMP.md`, and the `atlas-recollection` skill document the sequence:
  commit code + card edits first, then stamp, then fold stamp + index into
  the same commit.
- **Tool-agnostic skill reachability** — the `AGENTS.md` on-ramp block now
  points at vendored procedure files under `config.skills.dir` (default
  `.claude/skills/<name>/SKILL.md`) and routes specs/plans with the vault
  name. The status update nudge names the reachable path
  (`…/atlas-update/SKILL.md`) instead of an unresolvable "run atlas-update"
  skill invocation.
- **Zone template invariants** — template comment shows block-style
  `rule` / `enforcedBy` only (flow-style maps are not in the frontmatter
  subset). Validate warns honestly when an invariant is missing `rule`
  instead of claiming invariant `"undefined"` has no `enforcedBy`.

## [0.2.0] - 2026-07-17

### Added

- **A2 provenance lockfile** — `.atlas-state.json` records `atlasVersion`,
  wired CLI lanes, and content hashes of managed on-ramp blocks (and
  vendored skills). Machine-owned only; never rewrites user vault content.
- **`atlas wire [claude|grok|all]`** — dual-CLI SessionStart hooks
  (Claude repo-level + Grok global drop-in), managed `CLAUDE.md` /
  `AGENTS.md` on-ramp blocks between atlas markers, and vendoring of
  package skills into `config.skills.dir`. Idempotent; refuses malformed
  JSON targets; `.bak` before first modification.
- **`atlas doctor`** — dry-run inventory of lockfile, version drift,
  pending migrations, wiring, and pristine/edited/missing vendored items
  (always exit 0).
- **Offline update nudge** — `atlas status` reports when installed package
  version differs from wired `atlasVersion`.
- **`atlas init` stamps state** — fresh vaults get `.atlas-state.json` at
  creation with enabled modules.
- **A3 migrations** — `atlas migrate [--write] [--json]`: versioned,
  ordered, dry-run-default transforms over toolkit-owned artifacts only.
  Registry in `lib/migrations/` (append-only).
- **Migration `0001-backfill-provenance`** — creates `.atlas-state.json`
  for pre-A2 vaults (config + vault, no lockfile) and adopts existing
  on-ramp marker blocks by hash without rewriting their text.
- **`atlas-update` skill** — AI layer for the update loop: doctor →
  migrate dry → migrate `--write` → merge locally-edited vendored files
  → re-wire → check. Preserves user customizations; never touches zone
  cards, decisions, specs, plans, reports, or user config knobs.

### Fixed (A1 carry-forward / hardening on the maturation track)

- Provenance and migration tests never touch real `~/.grok` / `~/.claude`
  — injectable temp dirs only; dry-run migrate is covered by a zero-fs
  change assertion.

## [0.1.0] - 2026-07-09

### Added

- `SPEC.md` v0.1 — the normative Atlas convention: vault layout, the
  nine-type note taxonomy, per-type lifecycles, zone-card anchors, the
  `verifiedAt` freshness rule, the generated index contract, and interop
  contracts with external spec/plan-writing workflows.
- `atlas init` — scaffolds a vault's core skeleton (`map/`, `specs/`,
  `plans/`, `ideas/`, `tech-debt/`, `templates/`) plus `atlas.config.json`,
  with optional modules (`flows`, `programs`, `vision`, `reference`,
  `archive`, `backlog`, `drafts`) and additive re-runs against an existing
  vault.
- The verification engine — `atlas build`, `atlas check` (`--strict`,
  `--report`, `--ledger-only`), `atlas stamp <slug...>`, `atlas status`
  (`--hook`), `atlas routine [name]` — covering anchor resolution
  (`owns.globs` required; `owns.testids`/`owns.tools`/`owns.routes`
  optional and config-declared), the `verifiedAt` lifecycle, graph
  coherence checks, ledger status-enum linting, and the generated
  `map/index.md`.
- Three portable skills (`atlas-nav`, `writing-for-retrieval`,
  `atlas-recollection`) and two reference retrieval adapters (`ctx-search`,
  Obsidian's official agent skills).
- The full `atlas.config.json` schema, hook toggles
  (`hooks.sessionStartStatus`, `hooks.sessionStartIndexRefresh`), and
  self-maintenance routines.
- Interop examples proving file-contract-only coupling with agentic-sage
  and token-oracle, plus a `solo/` baseline with zero siblings installed.
- This repository's own dogfood vault (`atlas/`) and
  `docs/{ONRAMP,CONFIG,ADOPTION}.md`.
- Zero runtime dependencies; Node >= 20.

### Fixed

- `npm pack`/`npm publish` could sweep the ctx-search adapter's runtime
  artifacts (`adapters/.navidx.log`, `.navidx.lock`, `.navidx.stamp`) into
  the published tarball if the adapter had ever run in the working copy.
  Closed structurally with a nested `adapters/.npmignore`, rather than only
  documented as a publish-from-a-clean-checkout caveat.
- Test-suite cleanup hooks (`after()` in every `test/*.test.mjs`) could
  throw a spurious ENOTEMPTY/EBUSY out of `fs.rmSync`, racing a just-exited
  git child process's directory handle while `node:test` runs files in
  parallel. All such hooks now go through a shared, retrying
  `test/helpers.mjs` (bounded retries, only for transient error codes) —
  mitigated, not provably eliminated; see `docs/LAUNCH-CHECKLIST.md`.
- Removed the unused `TODO-owner` HTML-comment scaffolding (banner art,
  badge swap) from `README.md`'s published source; the underlying owner
  steps are now tracked in `docs/LAUNCH-CHECKLIST.md` instead of shipping
  as an invisible TODO in the README itself.
