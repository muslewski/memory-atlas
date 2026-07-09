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
