# memory-atlas

A local knowledge-vault tool: your repo keeps plain-markdown **zone cards** that describe regions of the code, each card owning file globs and a `verifiedAt` commit anchor, and the `atlas` CLI checks, stamps, and rebuilds that vault.

<p align="center">
  <a href="https://atlas.muslewski.com"><img src="https://img.shields.io/badge/website-atlas.muslewski.com-c45c26?style=flat-square" alt="Website"></a>
  <a href="https://www.npmjs.com/package/memory-atlas"><img src="https://img.shields.io/npm/v/memory-atlas?style=flat-square&label=npm%20memory-atlas" alt="npm memory-atlas"></a>
  <a href="https://www.npmjs.com/package/agentic-sage"><img src="https://img.shields.io/npm/v/agentic-sage?style=flat-square&label=npm%20agentic-sage" alt="npm agentic-sage"></a>
  <a href="https://github.com/muslewski/memory-atlas/discussions"><img src="https://img.shields.io/badge/discussions-join-c45c26?style=flat-square" alt="Discussions"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-blue" alt="node &gt;= 20">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="license MIT">
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="0 runtime dependencies">
</p>

Site: [atlas.muslewski.com](https://atlas.muslewski.com)

| Package | Era | Role |
|---------|-----|------|
| **memory-atlas** (this package) | **the past** | architecture memory — verified zone cards, decisions, honesty gate |
| [**agentic-sage**](https://sage.muslewski.com) | **the present** | fleet sessions — board, territory, merge briefings |

Independent packages, file-only coupling. Install either alone; install both for a full desk.

---

## From empty repo to `atlas check` passes

Nothing useful happens until a vault exists. That is structural, not a missing feature. The shortest path is: install → `atlas init` → `atlas check`. No interactive prompts.

```bash
# In a git repo with at least one commit and some tracked source files:
npm i -D memory-atlas

# Optional: --vault atlas (short name). Default is <repo-dirname>-atlas.
npx atlas init --vault atlas
npx atlas check
```

Observed output (empty vault, no zone cards yet):

```
created: atlas/map/zones/
created: atlas/map/decisions/
created: atlas/specs/
created: atlas/plans/
created: atlas/ideas/
created: atlas/tech-debt/
created: atlas/templates/
created: atlas/README.md
created: atlas/map/index.md
created: atlas/templates/zone.md
… (one file per note type)
created: atlas.config.json
created: .atlas-state.json

Profile: code
Next steps:
  - Seed 4-8 zone cards, one per coherent subsystem, under map/zones/.
  - Keep status: seeded + verifiedAt: unverified until a human verifies each card.
  - Add a short CLAUDE.md/AGENTS.md on-ramp block pointing agents at map/index.md.
  - Run `atlas stamp <slug>` once a card is reviewed, then `atlas build` / `atlas check`.
  - Search: `atlas search <terms>` (rg-first portable floor).

atlas check: ok
```

Exit `0` with **zero zones** is correct: structure is valid; there is nothing to verify yet. Useful value starts when you add a card.

### First zone card

Copy the template, set a real `owns.globs` that matches **at least one tracked file**, keep `status: seeded` and `verifiedAt: unverified`, then rebuild the index:

```bash
# atlas/map/zones/core.md  (minimal frontmatter that passes check)
```

```yaml
---
type: zone
summary: "Application source under src/."
status: seeded
created: 2026-07-30
updated: 2026-07-30
verifiedAt: unverified
owns:
  globs:
    - "src/**"
depends: []
---

## What this is

The app source tree.
```

```bash
npx atlas build
npx atlas check
```

```
🗺️ Atlas map rebuilt: 1 zones, 0 gap(s).
atlas check: ok
```

The generated `atlas/map/index.md` lists the zone as `seeded` and records a verification gap until someone reviews it. Commit the vault when you are ready.

### After review: stamp

When a human (or a supervised agent) has checked the card against the code:

```bash
# 1. Commit code + card edits first (stamp anchors to committed HEAD)
git add atlas/map/zones/core.md
git commit -m "seed core zone"

# 2. Stamp only the zones you reviewed — no blanket re-stamp
npx atlas stamp core
# stamped core → <8-char HEAD sha>
# status becomes active; verifiedAt becomes that SHA

# 3. Rebuild the generated index
npx atlas build

# 4. Fold stamp + index into the same commit
git add atlas/map/zones/core.md atlas/map/index.md
git commit --amend --no-edit

npx atlas check
# atlas check: ok
```

If you stamp with dirty owned files, stamp still succeeds but warns:

```
⚠ core: uncommitted changes in owned files — verifiedAt anchors to committed HEAD <sha>; commit first, then stamp
```

Blank `atlas stamp` is refused:

```
atlas stamp: stamp requires explicit zone slugs — blanket re-stamping defeats verification
```

---

## The `verifiedAt` contract

`verifiedAt` is either:

| Value | Meaning |
|-------|---------|
| the literal string `unverified` | card not yet reviewed (`status: seeded`, or post-merge invalidation) |
| a **7–40 character hex commit SHA** | last commit this card was confirmed against |

**An ISO date is rejected by design.** A date cannot prove which code was reviewed; a commit can. Putting `2026-07-30` on an active card produces:

```
error: zone core: status "active" requires a commit SHA or "unverified" for verifiedAt, found "2026-07-30"
```

On a seeded card the message is stricter:

```
error: zone core: status "seeded" requires verifiedAt "unverified", found "2026-07-30"
```

`atlas stamp <slug>` writes an 8-character short SHA from `git rev-parse --short=8 HEAD` and sets `status: active`. There is no "stamp all" flag.

**Freshness:** `atlas check` diffs each zone's SHA against `HEAD` over that zone's `owns.globs`. Touched owned files → **stale warning** (exit still 0 by default, including under `--strict`). Only `check.strictFreshness: true` in `atlas.config.json` turns staleness into exit 1. Structural, ownership, lifecycle, and bad `verifiedAt` encoding are always hard errors.

---

## Operation order (recollection)

When finishing a change that touches a zone:

1. **Edit** the zone card (and any decision/debt notes) with the code change.
2. **`git commit`** those edits (and the code).
3. **`atlas stamp <slug…>`** — anchors `verifiedAt` to that committed `HEAD`.
4. **`atlas build`** — regenerates `map/index.md` (never hand-edit the index).
5. **`git commit --amend`** (or a follow-up commit) for the stamp + index.
6. **`atlas check`** — must pass before you call the work done.

Wrong order (stamp before commit) leaves the card pointing at yesterday's `HEAD`; the next commit under `owns.globs` makes it stale immediately.

**Parallel agents:** workers update + stamp their zones and run read-only `atlas check`; they **never** stage `map/index.md` and **never** run `atlas build`. The integrator rebuilds the index once after merge. Details: [`docs/recollecting-in-parallel.md`](docs/recollecting-in-parallel.md).

---

## What it is not (limitations)

- **Does not detect stale prose.** `verifiedAt` only proves the *anchor* is old when owned files changed. If someone rewrites a comment without touching owned paths, the card can still show fresh while the write-up is wrong. Review is human.
- **Does not mine sessions.** Nothing reads chat transcripts. Cards are written and stamped deliberately.
- **Does not write specs for you.** The ledger accepts specs/plans from any workflow; it does not generate them.
- **Does not run hosted CI for this project.** Verification is local: run `atlas check` yourself (and optionally `atlas gate`). An optional copy-paste recipe lives in [`docs/CI.md`](docs/CI.md) if *your* repo wants a workflow — this package does not ship or require one.
- **Zone ownership is exclusive.** A tracked file claimed by two mounted zones is an error:

  ```
  error: zone core: file "src/index.js" owned by 2 zones: core, dup
  ```

- **Empty globs fail.** A glob that matches no tracked files is an error (`glob "…" matches no tracked files`).
- **Not an indexer.** Bring your own retrieval; `atlas search` is a portable `rg`/`grep` floor. Adapters ship for context-mode and Obsidian skills.
- **No visuals in this package.** Optional companion: [`memory-atlas-visuals`](https://www.npmjs.com/package/memory-atlas-visuals) — see [`docs/VISUALS.md`](docs/VISUALS.md).

---

## Install

### memory-atlas only

```bash
npm install -g memory-atlas   # bins: atlas | memory-atlas
# or per-repo:
npm i -D memory-atlas
npx atlas init --vault atlas
npx atlas wire                # SessionStart hooks + CLAUDE.md/AGENTS.md on-ramp + skills
```

### Past + present (recommended for agent fleets)

```bash
npm i -D memory-atlas
npm i -g agentic-sage
npx atlas init --vault atlas && npx atlas wire
sage init
```

Optional: copy [`examples/with-agentic-sage/adapter.mjs`](examples/with-agentic-sage/) to `.agentic-sage/adapter.mjs` so sage territory can name zones from the vault. `atlas doctor` soft-reports whether that adapter is present when `sage` is on `PATH`.

### Stay current (soft nudges)

```bash
npx atlas gate    # package-freshness warn by default (exit 0)
sage gate         # sibling soft check when agentic-sage is installed
```

**Name collision.** The `atlas` bin collides with the [MongoDB Atlas CLI](https://www.mongodb.com/docs/atlas/cli/) if both are global. This package also ships `memory-atlas` → same entry point: `npx memory-atlas <cmd>`.

Inside an adopting repo: `npx --no-install atlas <cmd>` uses the local install with no network.

### npm ships the engine, not your mind

| Artifact | Where | In the npm package? |
|----------|--------|---------------------|
| CLI + skills + templates | this package | **Yes** |
| Your project vault (`*-atlas/` or dogfood `atlas/`) | **inside each adopting repo** as markdown | **No** — `atlas init` / agents create it |
| Other projects' minds | those repos' git trees | **No** |

This repository's own `atlas/` folder is **dogfood** (how we map *this* tool's code). It is excluded from the published tarball. Keeping a mind in git is an informal quality convention — see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## How it works

Most agent-memory tools persist what the agent *believed*. An Atlas records what was **verified** — and tells you when the anchor is old.

- **A vault, not a database.** Obsidian-compatible plain markdown + YAML frontmatter. Greppable. No proprietary format.
- **Map (present) vs ledger (past).** Zone cards describe what the code *is*; decisions, specs, and plans record what was *decided* and stay frozen once written.
- **Code-checked claims.** `owns.globs` must match tracked files via `git ls-files`.
- **Generated index.** `atlas build` regenerates `map/index.md` with a verification-gaps section. Never hand-edit it.

Trimmed zone card (shape used in this project's dogfood vault):

```yaml
---
type: zone
summary: "The atlas command-line entry point and the subcommands it dispatches."
status: active
verifiedAt: 705fbdc8
owns:
  globs:
    - "bin/**"
    - "lib/init.mjs"
    - "lib/stamp.mjs"
depends:
  - [[verifier-core]]
  - [[vault-io]]
---
```

| Anchor | Checked by | Severity |
|--------|------------|----------|
| `owns.globs` | `git ls-files` — ≥1 tracked match | hard error, required |
| `owns.testids` / `owns.tools` | grep under a configured root | hard error, optional (config-on) |
| `owns.routes` | match against configured route globs | soft warning, optional |
| `verifiedAt` | `git diff <sha>..HEAD` over owned globs | freshness — warn by default; hard only with `check.strictFreshness: true` |
| `invariants[].enforcedBy` | empty list | soft warning |

---

## Commands

| Command | What it does |
|---------|----------------|
| `atlas init [--vault name] [--profile code\|operator]` | Scaffold vault + `atlas.config.json` + `.atlas-state.json` (non-interactive) |
| `atlas build` | Regenerate `map/index.md` from zone/flow cards |
| `atlas check [--strict] [--report] [--ledger-only]` | Verify claims, working-tree index sync, ledger (read-only; does not write) |
| `atlas stamp <slug…>` | Set `verifiedAt` to HEAD for reviewed zones only |
| `atlas search <query>` | Search vault markdown (`rg` first, `grep` fallback) |
| `atlas status [--hook]` | One-line vault health; safe as a SessionStart hook |
| `atlas gate [--strict]` | Package-freshness gate (default warn / exit 0) |
| `atlas wire [claude\|grok\|all]` | SessionStart hooks + managed on-ramp blocks + vendor skills |
| `atlas wire merge-driver [--write]` | Optional local git merge drivers for parallel recollection |
| `atlas doctor [--strict]` | Dry-run inventory of wiring, provenance, freshness |
| `atlas migrate [--write]` | Versioned migrations (dry-run by default) |
| `atlas adopt [--write]` | Normalize a brownfield vault + report |
| `atlas routine [name]` | Print a maintenance-routine prompt |
| `atlas visuals …` | Companion visuals scaffold/status (needs `memory-atlas-visuals` for dev/preview) |
| `atlas telemetry …` | Local debug telemetry (**off** by default) |

`atlas.config.json` → `enabled: false` silences every command except `init` (exit 0, no output).

### Brownfield

1. `atlas adopt` then `atlas adopt --write`
2. `atlas wire all` then `atlas migrate --write`
3. Skill **`atlas-adopt`** for unclassified notes (cards stay `seeded` / `unverified`)
4. Human review, then `atlas stamp` — never self-promote to `active`

### Update

1. Soft nudge: `atlas status` / `atlas gate`
2. Inventory: `atlas doctor`
3. `atlas migrate --write`
4. Skill **`atlas-update`** for locally edited vendored blocks/skills

Agent-first bootstrap after wire: skill **`atlas-seed`** (or `atlas routine seed`) partitions the tree into 4–8 honest `seeded` cards. Summaries follow **`writing-for-retrieval`**. Never self-stamp.

---

## Works with

**Spec/plan producers.** Ledger naming and frontmatter are a convention — obra/superpowers, github/spec-kit, GSD, or hand-written notes all work. See `SPEC.md` Interop.

**Retrieval.** Plain markdown. Reference adapters: [`adapters/ctx-search/`](adapters/ctx-search/README.md), [`adapters/obsidian-skills/`](adapters/obsidian-skills/README.md). Zero-install floor: `atlas search` / `rg` / `grep`.

**Sibling family** (independent packages; optional file contracts only):

| Project | Era | Role |
|---------|-----|------|
| token-oracle | the future | token-cap forecasting |
| **agentic-sage** | **the present** | **fleet sessions / judge** |
| status-herald | the voice | status-bar UI |
| **memory-atlas** | **the past** | **architecture memory (this project)** |

Full map: [`docs/works-with.md`](docs/works-with.md). Proof adapters: [`examples/`](examples/README.md).

## Comparison

| Category | What it persists | What's missing | Unique to an Atlas |
|----------|------------------|----------------|--------------------|
| Memory-capture (session logs) | What the agent said or believed | No check against code | `verifiedAt` ties claims to a commit |
| Spec-process tools | Specs, plans, tasks | No standing model of current code shape | Map is present-tense and re-checked |
| Doc generators | Structure extracted from code | No decision history, no verification signal | `seeded` vs `active` separates guess from review |

Recollection (update + stamp in the same change as the code) is what keeps `verifiedAt` honest.

---

## Docs

- [`SPEC.md`](SPEC.md) — normative vault layout, taxonomy, freshness rule, interop
- [`docs/ONRAMP.md`](docs/ONRAMP.md) — `atlas wire`, managed CLAUDE.md/AGENTS.md blocks
- [`docs/CONFIG.md`](docs/CONFIG.md) — `atlas.config.json` reference
- [`docs/ADOPTION.md`](docs/ADOPTION.md) — brownfield migrate
- [`docs/recollecting-in-parallel.md`](docs/recollecting-in-parallel.md) — worker/integrator + merge drivers
- [`docs/CI.md`](docs/CI.md) — optional local/`check` recipe you can paste into *your* automation
- [`docs/VISUALS.md`](docs/VISUALS.md) — optional visuals companion
- [`docs/works-with.md`](docs/works-with.md) — fleet siblings

Dogfood vault for this toolkit: [`atlas/map/index.md`](atlas/map/index.md).

---

## Developer logging

Opt-in **local-only** developer event log shared with fleet tools (`agentic-sage`, `llm-armory`, `mossferry`). **Off by default.** Nothing is written unless you enable it.

**Enable (first match wins):**

1. `FLEET_DEVLOG=0|false|off|no` → off
2. `--no-devlog` on the command line → off
3. `FLEET_DEVLOG=1|true|on|yes` → on
4. Machine config `~/.config/fleet-devlog/config.json` with `{"enabled": true}` → on
5. Otherwise → **off**

**Where:**

```
~/.local/state/fleet-devlog/events.jsonl
~/.local/state/fleet-devlog/install-id
```

(`$XDG_STATE_HOME` overrides the `~/.local/state` prefix when set.)

**Recorded:** enums (`tool`, `cmd`, `result_class`), ids (`install_id`, `repo_id`, `corr`), hashes, numeric counts. Flag **values** are never kept.

**Never recorded:** prompts, note bodies, commit messages, file contents, paths, env values, API keys, free-form text.

**Never leaves the machine.** The emitter has no network code. Delete with:

```bash
rm -rf ~/.local/state/fleet-devlog
```

### Repo config cannot enable this log

A committed `atlas.config.json` **cannot** enable fleet-devlog. Repo files travel to every clone; an enable bit there would turn logging on for people who never agreed. Enable with `FLEET_DEVLOG=1` or the machine config above — never with a committed repo file.

---

## Community

- **Website:** [atlas.muslewski.com](https://atlas.muslewski.com)
- **Questions & ideas:** [Discussions](https://github.com/muslewski/memory-atlas/discussions)
- **Bugs & features:** [Issues](https://github.com/muslewski/memory-atlas/issues/new/choose)
- **Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Code of Conduct:** [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- **Security:** [SECURITY.md](./SECURITY.md) (private reports only)
- **Support matrix:** [SUPPORT.md](./SUPPORT.md)

If you're not sure whether something is a bug, **start a Discussion** — maintainers can promote it to an issue when it is.

---

<sub>Footnote, not headline copy: ATLAS also unpacks to <strong>Agentic Terrain &amp; Lore Archive System</strong>, if you like backronyms.</sub>
