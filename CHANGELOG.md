# Changelog

## [0.5.0] — 2026-07-25

### Added

- **`atlas search <query>`** — portable retrieval floor (`rg` first, `grep -R` fallback); respects `retrieval.excludeFromSearch`
- **`profile: code | operator`** in `atlas.config.json` + `atlas init --profile`
  - `code` (default): product minds — empty `owns.globs` is a **hard** check error
  - `operator`: ops/design vaults — empty globs **warn** only; init enables ledger modules (reference, drafts, backlog, reports, archive)
- Dual-dogfood support for Hermes-style operator vaults without diluting code-profile honesty

### Changed

- Package version **0.5.0** (pre-1.0 minor may add commands; no intended break for existing code vaults with non-empty globs)

## [0.4.1] — 2026-07-23

### Added

- **Public product documentation** under `docs/` (docs-kit frontmatter, sidebar `_meta.json`, `docs:check` / `docs:health`)
- **`docs/works-with.md`** — fleet sibling map with honest interop edges
- **Contextual fleet mentions** in feature docs where integrations are real
- **Recollection soft-nudge** for docs health (memory-atlas `atlas-recollection` + docs-kit)

See [`docs/index.md`](docs/index.md) for the documentation hub.

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project has no stability guarantee across minor versions until 1.0
(see `SPEC.md`'s Versioning section).

## [0.4.0](https://github.com/muslewski/memory-atlas/compare/memory-atlas-v0.3.0...memory-atlas-v0.4.0) (2026-07-20)


### Features

* **adapters:** ctx-search index refresh honors enabled + its own hook toggle ([8e02a7f](https://github.com/muslewski/memory-atlas/commit/8e02a7f83805adc962ce65037efac2f5f3acdaed))
* **adopt:** atlas-adopt skill — AI classification layer for brownfield vaults ([d4b4a15](https://github.com/muslewski/memory-atlas/commit/d4b4a15159bb973eefa1f3e37cb69fdc49edd882))
* **adopt:** pure brownfield transforms — wikilink zones, verifiedAt honesty, debt type, adoption plan ([2c19a2c](https://github.com/muslewski/memory-atlas/commit/2c19a2cbd793a7ff3671e8dea4e9627e6887d4dc))
* atlas init ([94f57d4](https://github.com/muslewski/memory-atlas/commit/94f57d4adda2ad1e5886b833fe84b027ac54e190))
* atlas-nav + recollection + writing-for-retrieval skills ([6969e99](https://github.com/muslewski/memory-atlas/commit/6969e99974bde2a7856cb2207beac9eecdea2e0e))
* **blocks:** AGENTS.md skills-path pointer + reachable atlas-update nudge for tool-agnostic hosts ([1ad2f71](https://github.com/muslewski/memory-atlas/commit/1ad2f719a109163542c15b6d0eda83d269390c81))
* **blocks:** marker-delimited CLAUDE.md/AGENTS.md on-ramp blocks ([c87cb97](https://github.com/muslewski/memory-atlas/commit/c87cb971f6042b7e7bba95fed643a3e3320c973a))
* check/build/stamp/status ([0719682](https://github.com/muslewski/memory-atlas/commit/0719682c319a3ce20387c05b82272e0460514b79))
* **check:** corpus-quality gate — summary cap, headers, body links, orphans (opt-in) ([8cb5204](https://github.com/muslewski/memory-atlas/commit/8cb5204517082ec3b513c9ec20c2d57ea7f9e057))
* **check:** decision-number uniqueness warning ([20e2a2d](https://github.com/muslewski/memory-atlas/commit/20e2a2df24700e9b139e1476613f15047961cfab))
* **check:** ownership SSOT — one artifact, one owner (core invariant) ([8512d85](https://github.com/muslewski/memory-atlas/commit/8512d85cbebd834bd8dda5ba721842030bd7bd5e))
* **cli:** atlas adopt — deterministic brownfield onboarding with adoption report ([3520b5d](https://github.com/muslewski/memory-atlas/commit/3520b5de6fdf321c782255fe075b05150f229069))
* **cli:** atlas migrate command + doctor pending-migration awareness ([5f9afe8](https://github.com/muslewski/memory-atlas/commit/5f9afe83aa4ed54bd6946cbed09a420d558cc43c))
* **config:** add optional reports module defaults ([2ee09ce](https://github.com/muslewski/memory-atlas/commit/2ee09ce296d46fca5b4917d77614dfee9e93dbb5))
* **config:** full v1 atlas.config.json schema, folder indirection, kill switch, routines ([6dde575](https://github.com/muslewski/memory-atlas/commit/6dde575d85fe4ff9b0e4a3d803c10a452a178982))
* ctx-search adapter ([a836949](https://github.com/muslewski/memory-atlas/commit/a836949540be9e0dd8a54a1052f1ea57b5039dd0))
* **doctor:** dry-run provenance + wiring inventory ([fdab5dc](https://github.com/muslewski/memory-atlas/commit/fdab5dc5572a6a4ca392703359fbd34692282ea3))
* dogfood vault (atlas/) ([36ff101](https://github.com/muslewski/memory-atlas/commit/36ff101d133acc2809dcba486fea583c73ca34f8))
* examples — oracle budget hint + session-planning routine ([faff18c](https://github.com/muslewski/memory-atlas/commit/faff18cc0fb2afe8079c343eeb99088f51db3bf5))
* examples — sage atlas adapter ([08ea5c4](https://github.com/muslewski/memory-atlas/commit/08ea5c4491e8fc6aa729b7e2248b5cd3ee3a60c8))
* frontmatter parser ([04912b0](https://github.com/muslewski/memory-atlas/commit/04912b0d594ab826ccf6da2a87261d5cc3d413fb))
* git resolvers + note loading ([69bf144](https://github.com/muslewski/memory-atlas/commit/69bf1444454fbc35efe310034d5a3cb62ade8015))
* **index:** ledger section — status counts + 10 most recent ([696c740](https://github.com/muslewski/memory-atlas/commit/696c7405b32db510bbabc91b8f938400bba6f1d9))
* **init:** scaffold reports/ module with README stub ([6877cc7](https://github.com/muslewski/memory-atlas/commit/6877cc7743a1f80fb8d61d933f7ce6d3ccdadf61))
* **init:** stamp .atlas-state.json at vault creation ([c3f8b23](https://github.com/muslewski/memory-atlas/commit/c3f8b237ee169bab0cd9e0a92872eeb06b8948b0))
* **migrate:** versioned migration framework — dry-run default, --write opt-in ([e8679dd](https://github.com/muslewski/memory-atlas/commit/e8679dd9fde99f14809206c60b8ccbc2d6db391e))
* **migrations:** 0001 backfill provenance for pre-A2 vaults ([2bab022](https://github.com/muslewski/memory-atlas/commit/2bab02272fa32a4d2122944da7189e59ed58d25d))
* **reports:** report lifecycle, ledger lint walk, note template ([25b20d7](https://github.com/muslewski/memory-atlas/commit/25b20d7d5444e7a778fac639281c5555a58e95d2))
* scaffold package ([6ef762a](https://github.com/muslewski/memory-atlas/commit/6ef762ad4ddff8d4a0d9b4b00845b8034aa57308))
* **state:** .atlas-state.json provenance lockfile ([b563328](https://github.com/muslewski/memory-atlas/commit/b563328f3be232c3cf080a80a7c01e5f2372b876))
* **status:** offline update nudge — installed vs wired version ([6e56b33](https://github.com/muslewski/memory-atlas/commit/6e56b338aebfc84c88c490eab3f3ec8d3b59b5b7))
* **update:** atlas-update skill + wire vendors package skills ([300ca9e](https://github.com/muslewski/memory-atlas/commit/300ca9ed6b6a95f4f186f4235c7f52531c4badb2))
* validate core + index renderer ([2ac1759](https://github.com/muslewski/memory-atlas/commit/2ac1759be9c87a232c283c6bf7f8464e39fdcc27))
* **wire:** atlas wire — dual-CLI SessionStart hooks + managed on-ramp blocks ([ed1e8b0](https://github.com/muslewski/memory-atlas/commit/ed1e8b09aa114465a79826456c20b239e556ab64))


### Bug Fixes

* **check:** --strict never hardens staleness — config strictFreshness only ([b7ff7d1](https://github.com/muslewski/memory-atlas/commit/b7ff7d166e8b2f5ec802d7ec9dc463bd860ed8c4))
* **cli:** subcommands honor --help instead of executing ([a723b2e](https://github.com/muslewski/memory-atlas/commit/a723b2ed47fa9867225f6f9e1e93122642e16f4f))
* close npm-pack log leak, flaky test cleanup, README TODO markers ([4893a05](https://github.com/muslewski/memory-atlas/commit/4893a05cea9b3102b2850efeaf951bbb64ba26ee))
* **core:** decisions reach validate() in build/check/status ([1242075](https://github.com/muslewski/memory-atlas/commit/1242075e0d063fc187a6f18f1a70e6dcd7c67e0e))
* exempt unmounted zones from all anchor checks; fix index gaps + --report ([df2d040](https://github.com/muslewski/memory-atlas/commit/df2d0401cde3fd583690ad5560328d5b9ddd0e1e))
* replace brain glyph with compass in atlas status ([0381fa9](https://github.com/muslewski/memory-atlas/commit/0381fa9d6ca00d268a9ea974efc43f0373e825b9))
* resolve stamp's zone-card path through config.folders.zones ([35e7163](https://github.com/muslewski/memory-atlas/commit/35e716346367b141d02cf572c11df456b35339ba))
* scrub remaining origin vocabulary from on-ramp and skills ([4492845](https://github.com/muslewski/memory-atlas/commit/449284562738b9182de0a3f9522a5d05f990b37d))
* **stamp:** warn when stamping over uncommitted owned files + document stamp order ([47c6c40](https://github.com/muslewski/memory-atlas/commit/47c6c40465786ad49984f0c5131ea72433da3eff))
* **template:** block-style invariant example + honest missing-rule warning ([5dd0a70](https://github.com/muslewski/memory-atlas/commit/5dd0a700d0efbccd7033228b4a6aa69493672eee))
* **validate:** accept YAML-numeric all-digit verifiedAt SHAs ([c441c42](https://github.com/muslewski/memory-atlas/commit/c441c42080475ab0cd69e01027561172ad98922a))
* **vault:** enabled optional modules join the vault walk and wikilink graph ([3662905](https://github.com/muslewski/memory-atlas/commit/366290536e7bd14fe9bf52d1c222c8a7c2b26437))

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
