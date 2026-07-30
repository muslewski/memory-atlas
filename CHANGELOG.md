# Changelog

## [Unreleased]

## [0.6.0] — 2026-07-30

### Changed

- **Skills install once at user scope** (`~/.claude/skills/`, or `ATLAS_USER_SKILLS_DIR`),
  not vendored into every consuming repo. Default is now `skills.vendorInRepo: false`:
  - `atlas wire` records `source: user-scope` in `.atlas-state.json` and does **not**
    re-copy package skills into the repo when the skill is already present at user scope.
  - Agent on-ramp guidance points at user-scope install and `atlas doctor` for
    verification (this package's own AGENTS.md / CLAUDE.md; product skills still
    ship under package `skills/` for install and for `vendorInRepo: true`).
  - `atlas doctor` / `atlas gate` report re-vendored copies as **redundant**
    (identical to user-scope) or **drift** (repo copy differs from user-scope)
    without guessing which side is newer.
  - Opt back in with `skills.vendorInRepo: true` if you still want committed
    skill trees.
  - Package-freshness wired-lag nudge points at
    `~/.claude/skills/atlas-update/SKILL.md` by default (user-scope install), and
    at `skills.dir/atlas-update/SKILL.md` only when `skills.vendorInRepo: true`.
  - Why this is a minor, not a patch: an audit before the collapse found **three
    distinct versions** of `atlas-recollection` across five repos, and the
    canonical package copy matched none of them. User-scope install removes that
    multi-copy drift class.
- **`atlas check` is read-only** — it no longer writes `map/index.md`. It renders
  the index in memory and compares it to the **working-tree** file when
  `check.indexSync` is enabled (default **true**). Previously check shared a
  write path with build and then asked git whether HEAD matched, which mutated
  the tree and collided under parallel recollection. Set `check.indexSync: false`
  when many agents recollect and one integrator rebuilds the index.
- **Telemetry enable sources:** a committed `atlas.config.json` may set
  `telemetry.enabled: false` (opt-out) but can **no longer turn telemetry on**.
  Enable only via `ATLAS_TELEMETRY=1`, `atlas telemetry on`, or
  `~/.config/memory-atlas/config.json`. Clones of public repos no longer inherit
  an enable from the committed file.
- **status:** registry-lag soft line (`atlas status` / SessionStart `--hook`) uses
  concrete `npm i -D memory-atlas@… then atlas-update` instead of vague "bump dep"
  (wired lag line unchanged).

### Added

- **fleet-devlog** — shared, opt-in, local-only developer log (no network). Emits
  alongside the existing legacy stream at
  `$XDG_STATE_HOME/fleet-devlog/events.jsonl` (default
  `~/.local/state/fleet-devlog/`). Enable with `FLEET_DEVLOG=1` or machine config;
  kill this invocation with `--no-devlog`. Repo config cannot enable it. Legacy
  `~/.cache/memory-atlas/events.jsonl` and `--no-telemetry` are unchanged.
- **Portable merge drivers for parallel recollection** (`atlas wire merge-driver`,
  report-first; `--write` to install; refuses dirty trees unless `--allow-dirty`):
  - `atlas-index` regenerates `map/index.md` from zone cards on conflict
  - `atlas-zone` resolves stamp-only (`verifiedAt`) conflicts to `unverified`
  - Worker / integrator contract: workers never stage the index or run
    `atlas build`; integrators rebuild once after merge (see
    `docs/recollecting-in-parallel.md`)
- **`check.indexSync`** config key (default `true`) — see Changed above.
- Path containment for `stamp` / `build` / notes paths; cleaner CLI errors for
  unreadable config (EACCES, ELOOP, ENOTDIR, non-regular files such as FIFOs).
- `atlas init` leaves a check-passing empty index; adopt/migrate rewrite ISO
  `verifiedAt` stamps to `unverified` (dates are not SHAs).

### Fixed

- **`atlas check` help** describes zone claims, the **working-tree** index, and
  the ledger (read-only) — not a committed-index / git-HEAD comparison.
- **active + `verifiedAt: unverified`** after a stamp-only merge is a legal
  re-stamp gap (warning, exit 0), not a hard validation error. Invalid
  `verifiedAt` values never report Freshness ok.
- Index merge driver materializes the **union** of merge-parent zone cards and
  refuses when it cannot do so honestly (empty render with zones on disk, or
  parents disagree while the working tree still matches one pure side).
- Config type-mismatch warnings emit once (single load path); non-regular
  `atlas.config.json` is refused instead of hanging on a FIFO.
- Docs dogfood repair: `verifiedAt` validation message quoted in docs matches
  `lib/validate.mjs` byte for byte; troubleshooting no longer offers a "fix"
  that reproduced the error — remedies are demote to seeded, stamp a real SHA
  after commit, or accept active+unverified only as a post-merge re-stamp gap.

### Docs

- Command reference for every atlas verb; curated top-level `atlas --help` as an
  index; dual-stream logging (fleet-devlog vs legacy telemetry) documented in
  README / COMMANDS / CONFIG.
- Worker/integrator parallel recollection guide; containment and honesty posture
  for stamp, build, and merge; README thirty-second on-ramp to a passing check.
- Sidebar newcomer order, local-first CI notes, cross-links; dual-product story
  (atlas = past, agentic-sage = present) expanded where it was still thin.

Internal vault index rebuilds, test-harness coverage, and research notes are
omitted here.

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

### Changed

- **status:** registry-lag soft line on SessionStart (`atlas status --hook`) uses
  concrete `npm i -D memory-atlas@… then atlas-update` (OSS update-me; wired lag
  line unchanged)

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
