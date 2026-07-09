# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project has no stability guarantee across minor versions until 1.0
(see `SPEC.md`'s Versioning section).

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
