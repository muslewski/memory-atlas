# Changelog

## [Unreleased]

## [0.5.4] — 2026-07-28

### Added

- **`atlas doctor` soft agentic-sage adapter inventory** — when `sage` is on
  PATH, doctor notes whether `.agentic-sage/adapter.mjs` is present (or points
  at `examples/with-agentic-sage`). Fail-open if sage is missing — products
  stay independent; no hard dependency either way.
- **Hint-only postinstall** — prints dual-product install path (atlas = past,
  agentic-sage = present); no filesystem writes.

### Docs / fleet

- **Dual product story** (README, `docs/works-with.md`, `docs/ONRAMP.md`):
  - **memory-atlas** = the past (architecture memory)
  - **agentic-sage** = the present (fleet sessions)
  - Co-install: `npm i -D memory-atlas` · `npm i -g agentic-sage` ·
    `atlas wire` · `sage init`
  - Stay current: `atlas gate` / `sage gate` soft nudges by default
- Fleet adopt script default TARGET → **0.5.4**

## [0.5.3] — 2026-07-28

### Added

- **Local-first debug telemetry** (OFF by default when published):
  - Enable fleet-wide: `atlas telemetry on` or `ATLAS_TELEMETRY=1` or
    `~/.config/memory-atlas/config.json` → `{ "telemetry": { "enabled": true } }`
  - Events: `~/.cache/memory-atlas/events.jsonl` (cmd, exit, ms, version, vault counts)
  - CLI: `atlas telemetry status|report|dump|clear|on|off`
  - Never tracks `status --hook`; never throws; no network; zero deps
  - Design: `atlas/specs/2026-07-28-telemetry-local-debug-design.md`

## [0.5.2] — 2026-07-28

### Fixed

- **`atlas migrate --write`** stamps `atlasVersion` when no FS migrations pending

## [0.5.1] — 2026-07-28

### Added

- **Two-tier package freshness (fleet follow)** — consumers stay aligned with
  the published toolkit without reimplementing update checks:
  - **Tier A (wired):** installed package vs `.atlas-state.json` `atlasVersion`
    + pending migrations
  - **Tier B (registry):** installed vs npm latest (`npm view`, TTL-cached in
    `state.updateCheck`, fail-open offline)
  - Config: `check.packageFreshness` (`mode: warn|fail`, `registry`, `wired`,
    `registryTtlHours`) — default **warn**
  - **`atlas gate [--strict] [--force]`** for predev/CI (exit 1 only on fail
    mode or `--strict` when issues exist)
  - `atlas status` prints both tiers (always soft / SessionStart-safe)
  - `atlas doctor [--strict]` inventory lines + optional hard exit
- Design spec: `atlas/specs/2026-07-28-package-freshness-fleet-follow-design.md`
- Docs: `check.packageFreshness` in CONFIG.md; CI recipe adds `atlas gate --strict`

### Docs (also in tree since 0.5.0 era)

- Website + docs surface for optional **memory-atlas-visuals** (enable, wire, gallery)
- **`visuals` block in `atlas.config.json`** — optional companion hook
- **`docs/VISUALS.md`**, `atlas visuals` CLI surface

## [0.5.0] — 2026-07-25

### Added

- **`atlas search <query>`** — portable retrieval floor (`rg` first, `grep -R` fallback); respects `retrieval.excludeFromSearch`
- **`profile: code | operator`** in `atlas.config.json` + `atlas init --profile`
  - `code` (default): product minds — empty `owns.globs` is a **hard** check error
  - `operator`: ops/design vaults — empty globs **warn** only; init enables ledger modules (reference, drafts, backlog, reports, archive)
- Dual-dogfood support for Hermes-style operator vaults without diluting code-profile honesty

### Changed

- Package version **0.5.0** (pre-1.0 minor may add commands; no intended break for existing code vaults with non-empty globs)
