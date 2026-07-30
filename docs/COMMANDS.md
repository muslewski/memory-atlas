---
title: "Command reference"
description: "Every atlas CLI verb: flags, writes, exit codes, and observed output from memory-atlas 0.5.4."
section: reference
order: 10
---

# Command reference

`atlas` is the CLI for a per-repo knowledge vault: plain-markdown **zone cards**
with `owns.globs` and a `verifiedAt` commit anchor. This page documents what the
binary on this package **actually does** (verified with `node bin/atlas.mjs` on
0.5.4). If a command and this page disagree, trust the command.

How to invoke:

```bash
npx atlas <command> …          # after npm i -D memory-atlas
node bin/atlas.mjs <command> … # in a memory-atlas checkout
```

The package binary is **not** assumed to be on `PATH`. Top-level help is an
index (`atlas --help`); this page is the full catalogue.

Related guides: [Containment and honesty](./containment.md) (write-path
refusals), [Recollecting in parallel](./recollecting-in-parallel.md) (worker vs
integrator + merge drivers), [Configuration](./CONFIG.md).

## Happy path

In a git repository with at least one commit:

```bash
npm i -D memory-atlas
npx atlas init --vault atlas
npx atlas check
```

Empty vault, no zone cards yet — observed:

```
created: atlas/map/zones/
… (folders, templates, atlas.config.json, .atlas-state.json)
Profile: code
Next steps:
  - Seed 4-8 zone cards…
atlas check: ok
```

Exit **0** with zero zones is correct: structure is valid; there is nothing to
verify yet. After you add cards, the loop is `stamp` → `build` → `check`.

## Global options

| Flag | Effect |
|------|--------|
| `--help`, `-h` | Print top-level help (also accepted after any subcommand; exits **0**, does not run the verb) |
| `--version`, `-v` | Print `atlas 0.5.4` (or the installed version); exit **0** |
| `--no-telemetry` | Disable local debug telemetry for this invocation |

Unknown command:

```
atlas: unknown command "foobar"
```

…then the same top-level help text. Exit **1**.

### Kill switch

If `atlas.config.json` has `"enabled": false`, every command **except** `init`
prints nothing and exits **0**. That is silence, not a green vault.

---

## `atlas init`

Scaffold a vault (folders, templates, `map/index.md`, `atlas.config.json`,
`.atlas-state.json`). Additive on re-run: existing paths are skipped.

| Flag | Effect |
|------|--------|
| `--vault <name>` | Vault directory name under the repo root. Default: `<repo-dirname>-atlas` |
| `--profile code\|operator` | Profile defaults for modules + glob policy (`code` is the usual app profile) |
| `--modules a,b` | Comma-separated extra module names to enable |
| `--dry-run` | **Unadvertised** in top-level help. Print what would be created; write nothing |

**Writes:** vault tree + repo-root `atlas.config.json` and `.atlas-state.json`
(unless `--dry-run`).

**Exit:** **0** success; **1** usage error (bad flag / missing value / unknown
profile or module); **2** filesystem error only (`atlas init: filesystem error: …`).

```bash
npx atlas init --vault atlas
# or dry-run on an existing vault:
npx atlas init --dry-run
```

```
existing vault detected at atlas/; running in additive mode
exists, skipping: atlas/map/zones/
…
would create: atlas/plans/
…
Profile: code
Next steps:
  - Seed 4-8 zone cards, one per coherent subsystem, under map/zones/.
  …
```

Errors observed:

```
atlas init: --vault requires a value          # exit 1
atlas init: unknown profile "foo" (use code|operator)
atlas init: unknown option "--nope"
```

---

## `atlas check`

Validate the vault **without writing**. Loads zone cards, runs structural and
ownership checks, optionally compares working-tree `map/index.md` to a fresh
render (`check.indexSync`, default on), lints the ledger, reports stale zones.

| Flag | Effect |
|------|--------|
| `--report` | Also print `ledger: N/M clean (P%)` |
| `--ledger-only` | Only ledger lint; skip zone/index validation |
| `--strict` | **Advertised but currently ignored.** Does not change exit status. Staleness hard-fails only when config has `check.strictFreshness: true` |

**Writes:** nothing.

**Exit:** **0** → prints `atlas check: ok`. **1** hard errors, ledger
violations, out-of-date working-tree index, missing repo/vault; or
`strictFreshness` with stale zones.

Observed on this package vault (stale zone is a warning only by default):

```bash
npx atlas check
```

```
warning: zone agent-onramp: invariant "…" has no enforcedBy → file tech-debt
atlas check: warning: 1 stale zone(s): agent-onramp
atlas check: ok
```

```bash
npx atlas check --report
# … same warnings …
ledger: 2/2 clean (100%)
atlas check: ok
```

```bash
npx atlas check --ledger-only
```

```
ledger: 2/2 clean (100%)
```

Out-of-date index (working tree vs fresh render — not "must be committed"):

```
atlas check: map/index.md is out of date — run `atlas build` (working-tree index must match a fresh render)
```

---

## `atlas stamp <slug…>`

Set `verifiedAt` to the current short HEAD SHA for the named zone cards. Turns
`status: seeded` into `active`. Requires **explicit** slugs — no blanket stamp.

| Flag | Effect |
|------|--------|
| *(positional slugs)* | One or more zone ids (`map/zones/<slug>.md`) |
| `--all` | Rejected the same as missing slugs (blanket stamp is refused) |

**Writes:** each named `map/zones/<slug>.md` (`verifiedAt`, maybe `status`,
`updated`). Preflight validates **all** slugs before any write.

**Exit:** **0** all named zones stamped. **1** no slugs / unsafe slug / missing
zone / unmounted / containment / parse or IO failure / no repo or vault.

```bash
npx atlas stamp core
# stamped core → <8-char HEAD sha>
```

Refusals observed:

```
atlas stamp: stamp requires explicit zone slugs — blanket re-stamping defeats verification
atlas stamp: zone "../x" is not a safe slug (no path separators or ..)
atlas stamp: zone "nonexistent-zone" not found (atlas/map/zones/nonexistent-zone.md)
```

If owned files are dirty, stamp still writes but warns on stderr (anchors are
committed HEAD — commit first, then stamp):

```
⚠ <slug>: uncommitted changes in owned files — verifiedAt anchors to committed HEAD <sha>; commit first, then stamp
```

---

## `atlas build`

Regenerate `map/index.md` from zone/flow cards (and ledger lists). Containment:
refuses if the index path resolves outside the vault/repo.

| Flag | *(none)* |

**Writes:** `<vault>/map/index.md` only (when containment passes).

**Exit:** **0** write succeeded and the render has no hard errors. **1** no
repo/vault, containment refusal (no write), or hard zone errors **after** a
successful write (known inconsistency — see [containment](./containment.md)).

```bash
npx atlas build
```

```
warning: zone agent-onramp: invariant "…" has no enforcedBy → file tech-debt
🗺️ Atlas map rebuilt: 5 zones, 1 gap(s).
```

---

## `atlas status`

One-line vault health summary. Always exit **0** (fail-open), including outside
a git repo.

| Flag | Effect |
|------|--------|
| `--hook` | Marks a SessionStart call site. Honors `hooks.sessionStartStatus: false` in config (then prints nothing). Plain human/script calls **without** `--hook` always print |

**Writes:** nothing (unless local telemetry is on; that is separate).

**Exit:** always **0**.

```bash
npx atlas status
```

```
🧭 atlas: 5 zones (0 seeded) · 2 specs · 0 plans · ⚠ 2 open debt · 1 stale
⬆ atlas 0.5.4 installed, wired 0.5.2 — run the atlas-update skill (.claude/skills/atlas-update/SKILL.md)
```

(The second line is a package-freshness nudge; it appears only when wired vs
installed diverge.)

---

## `atlas search <query>`

Search vault markdown. Uses `rg` when available, otherwise `grep -R`. Honors
`retrieval.excludeFromSearch` (default includes `drafts/`, `visuals/`).

| Flag | Effect |
|------|--------|
| `<query>` | Search terms (required; remaining args joined) |
| `--max N` / `-n N` | Max hits (default **40**) |

**Writes:** nothing.

**Exit:** **0** with hits or with zero hits. **1** missing query / no repo /
no vault.

```bash
npx atlas search verifiedAt --max 3
```

```
templates/zone.md:8: verifiedAt: unverified  # …
templates/routines/seed.md:7: `status: seeded` + `verifiedAt: unverified`.
map/index.md:11: | verifier-core | active | ok | …
--- meta: 3 hit(s) · engine=rg · budget=3 ---
```

```bash
npx atlas search
# stderr: atlas search: query required   → exit 1
```

Note: `atlas search --help` is intercepted by the top-level help path and
prints the global index, not a search-only usage block.

---

## `atlas doctor`

Dry-run inventory: provenance lockfile, SessionStart wiring, on-ramp blocks,
vendored skills, config, merge-driver install, optional sage adapter, registry
freshness.

| Flag | Effect |
|------|--------|
| `--strict` | Exit **1** when package-freshness issues would fail the gate |

**Writes:** nothing.

**Exit:** **0** inventory printed (missing wiring is soft `✗` / `ℹ`). **1** with
`--strict` when package-freshness issues are present.

```bash
npx atlas doctor
```

```
✓ lockfile: atlasVersion 0.5.2
⚠ update pending (installed 0.5.4, wired 0.5.2) — run the atlas-update skill
…
ℹ merge-driver: not installed — run `atlas wire merge-driver` then `--write` (per-clone)
✓ registry: installed 0.5.4 is current (latest 0.5.4)
```

```bash
npx atlas doctor --strict
# … same inventory …
# stderr: atlas doctor: strict — package freshness issues present  → exit 1
```

---

## `atlas gate`

Package-freshness only (is installed `memory-atlas` current vs wired lockfile
and optional registry). Does **not** validate zone cards.

| Flag | Effect |
|------|--------|
| *(default)* | Warn mode — prints nudges, exit **0** |
| `--strict` | Exit **1** when issues exist (also if config `check.packageFreshness.mode` is `fail`) |
| `--force` | Refresh npm-latest cache (bypasses TTL); still warn-mode unless `--strict` |

**Writes:** may refresh a local package-freshness cache under the user cache
dir; does not write the vault.

**Exit:** **0** warn mode. **1** strict failure (or thrown error under strict).

```bash
npx atlas gate
```

```
⬆ atlas 0.5.4 installed, wired 0.5.2 — run the atlas-update skill (.claude/skills/atlas-update/SKILL.md)
```

```bash
npx atlas gate --strict
# stderr: atlas gate: fail (strict) — resolve package freshness before continuing  → exit 1
```

---

## `atlas wire [claude|grok|all|merge-driver]`

Two different modes:

1. **`claude` / `grok` / `all` (default `all`)** — install SessionStart hooks and
   managed `CLAUDE.md` / `AGENTS.md` on-ramp blocks; vendor skills into the
   configured skills dir. **Writes immediately** (no dry-run flag for this
   path). Idempotent; refuses malformed JSON settings targets.
2. **`merge-driver`** — report-first install of local git merge drivers for
   `map/index.md` (regenerate) and `map/zones/*.md` (stamp-only →
   `verifiedAt: unverified`). Dry-run unless `--write`. Refuses a dirty tree
   unless `--allow-dirty`. `.gitattributes` alone does nothing without
   per-clone `git config merge.*.driver`.

| Flag / arg | Effect |
|------------|--------|
| `claude` \| `grok` \| `all` | Wire hooks + on-ramp for that target (default `all`) |
| `merge-driver` | Merge-driver installer (dry-run by default) |
| `--write` | Apply merge-driver changes (only meaningful with `merge-driver`) |
| `--allow-dirty` | With `merge-driver --write`, allow a dirty working tree |

**Do not run `atlas wire` (or `wire all`) in a session that is not supposed to
touch `CLAUDE.md` / `AGENTS.md` / skills** — that path mutates those files.

**Exit:** **0** success / dry-run report. **1** unknown target, hook install
failure, no vault (merge-driver), dirty tree without `--allow-dirty`, etc.

```bash
npx atlas wire merge-driver
```

```
atlas wire merge-driver (dry-run)
note: .gitattributes alone does nothing without local `git config merge.<name>.driver` — re-run after every clone
.gitattributes: would add atlas/map/index.md merge=atlas-index
.gitattributes: would add atlas/map/zones/*.md merge=atlas-zone
git config: would set merge.atlas-index.name
…
dry-run — re-run with --write to apply (nothing written)
```

```bash
npx atlas wire merge-driver --write
# on a dirty tree:
atlas wire merge-driver: working tree is dirty — refuse to write so install does not interleave with unfinished edits
  commit or stash your changes, then re-run with --write
  escape hatch (deliberate): --write --allow-dirty
# exit 1
```

```bash
npx atlas wire foo
# atlas wire: unknown target "foo" (use claude|grok|all|merge-driver)  → exit 1
```

Full protocol: [Recollecting in parallel](./recollecting-in-parallel.md).

---

## `atlas migrate`

Apply pending versioned migrations. **Dry-run by default.**

| Flag | Effect |
|------|--------|
| *(default)* | List pending migrations; write nothing |
| `--write` | Apply pending migrations; may advance `.atlas-state.json` `atlasVersion` |
| `--json` | Machine-readable plan / result |

**Writes:** only with `--write` (migration targets + lockfile as applicable).

**Exit:** **0** dry-run or successful apply. **1** apply failure.

```bash
npx atlas migrate
```

```
0002-rewrite-iso-verifiedAt — Rewrite illegal ISO/garbage verifiedAt on zone cards to unverified
dry run — re-run with --write to apply
```

```bash
npx atlas migrate --json
# {"installed":"0.5.4","wired":"0.5.2","pending":[{"id":"0002-rewrite-iso-verifiedAt","target":"0.5.4","plan":[]}]}
```

---

## `atlas adopt`

Normalize a brownfield vault (wikilink zones → bare slugs, honesty fields,
folder renames, config seed). **Dry-run by default.** Does not pre-stamp
`verifiedAt` with a git SHA.

| Flag | Effect |
|------|--------|
| *(default)* | Report what would change |
| `--write` | Apply normalizations |
| `--json` | JSON actions / unclassified list |

**Writes:** only with `--write`.

**Exit:** **0** report or successful write. **1** on refusal / failure.

```bash
npx atlas adopt
```

```
✓ nothing to adopt — vault already conforms
```

```bash
npx atlas adopt --json
# {"actions":[],"unclassified":["atlas/README.md"]}
```

---

## `atlas routine [name]`

Print a maintenance-routine **prompt** (not a scheduler). No name → list
available routines (vault overrides first, then package built-ins).

| Arg | Effect |
|-----|--------|
| *(none)* | List routines |
| `<name>` | Print that routine template with `{{CADENCE_DAYS}}` substituted and a live counts footer |

**Writes:** nothing.

**Exit:** **0** list or print. **1** unknown name / no repo / no vault.

```bash
npx atlas routine
```

```
Available routines:
  seed (vault)
  gardening (built-in)
  session-planning (built-in)
```

```bash
npx atlas routine gardening
# → full markdown prompt + footer:
# Live counts (as of now): 5 zones (0 seeded) · ⚠ 1 stale · ⚠ 2 open debt
```

```bash
npx atlas routine recollection
# stderr: atlas routine: unknown routine "recollection"  → exit 1
```

---

## `atlas visuals [init|status|dev|preview]`

Bridge to the optional `memory-atlas-visuals` companion and the vault
`visuals/` content tree. Not required for check/stamp/build.

| Subcommand | Effect |
|------------|--------|
| *(none)* | Print visuals-specific usage; exit **0** |
| `init [--write]` | Scaffold `visuals/` tree + enable flag (dry-run without `--write`) |
| `status` | Enabled flag, peer package resolve, content counts |
| `dev` / `preview` | Spawn companion gallery (requires peer package installed) |

**Writes:** `init --write` creates under `<vault>/visuals/` and may set
`visuals.enabled=true` in `atlas.config.json`.

**Exit:** **0** usage/status/dry-run/success. **1** unknown subcommand, missing
peer when required, etc. (Companion missing paths may also surface exit **2** —
see stderr from that subcommand.)

```bash
npx atlas visuals
```

```
atlas visuals — vault digests / gallery companion bridge

Usage:
  atlas visuals init [--write]   Scaffold visuals/ tree (dry-run without --write)
  atlas visuals status           Enabled flag, peer resolve, content counts
  atlas visuals dev [...]        Spawn companion gallery dev server
  atlas visuals preview [...]    Spawn companion gallery preview
```

```bash
npx atlas visuals status
```

```
visuals: enabled=false dir=atlas/visuals peer=memory-atlas-visuals (not installed)
content: visuals tree not present — run `atlas visuals init --write`
```

```bash
npx atlas visuals init
```

```
atlas visuals init (dry-run; pass --write to apply):
would create: atlas/visuals/illustrated/default/.gitkeep
…
would patch: atlas.config.json (visuals.enabled=true)
Re-run with --write to create the tree and set visuals.enabled=true.
```

---

## `atlas telemetry [status|report|dump|clear|on|off]`

Local debug telemetry. **OFF by default** unless enabled globally or via
`ATLAS_TELEMETRY=1`. Repo config may **disable** but never **enable**. Fleet
enable: `atlas telemetry on` or the env var. Data stays under the user cache;
it is never published by this package.

| Subcommand | Effect |
|------------|--------|
| `status` (default) | ON/OFF, event path, count, truncated install id, last event |
| `report` | Aggregate counts for recent events |
| `dump` | Print events file path + contents |
| `clear` | Truncate the events file |
| `on` / `off` | Toggle global config at `~/.config/memory-atlas/config.json` |

**Writes:** `on`/`off` touch global config; `clear` truncates the events file;
normal commands may append events when enabled.

**Exit:** **0** for known subcommands (fail-open on unexpected status errors).
**1** unknown subcommand or clear failure.

```bash
npx atlas telemetry status
```

```
atlas telemetry: ON (global config (~/.config/memory-atlas/config.json))
  events: ~/.cache/memory-atlas/events.jsonl
  count: <n>
  install_id: <8-char>…
  last: <iso> cmd=check exit=0 ms=<n>
```

(Paths above are the real layout; the binary may print an expanded home path.)

```bash
npx atlas telemetry
# same as status when no subcommand
```

```bash
npx atlas telemetry foobar
# stderr: atlas telemetry: usage: status | report | dump | clear | on | off  → exit 1
```

---

## `atlas merge-index` / `atlas merge-zone` (do not call by hand)

Git merge-driver entrypoints installed by `atlas wire merge-driver --write`.
Git invokes them as:

```text
atlas merge-index %O %A %B %L %P
atlas merge-zone  %O %A %B %L %P
```

| Verb | Role |
|------|------|
| `merge-index` | Regenerate `map/index.md` into `%A` (ours) from on-disk zone cards |
| `merge-zone` | Stamp-only zone conflicts → set `verifiedAt: unverified` and succeed; other conflicts leave markers |

**Writes:** the driver output path (`%A` / ours).

**Exit:** **0** resolved. **1** wrong arity, no vault (`merge-index`), or leave
conflict for git.

```bash
npx atlas merge-index
# stderr: atlas merge-index: usage: merge-index <base> <ours> <theirs> <marker-size> <path>
# exit 1
```

```bash
npx atlas merge-zone
# stderr: atlas merge-zone: usage: merge-zone <base> <ours> <theirs> <marker-size> <path>
# exit 1
```

Details: [Recollecting in parallel](./recollecting-in-parallel.md),
[Containment and honesty](./containment.md).

---

## Exit codes (summary)

| Code | Meaning |
|------|---------|
| **0** | Success, soft-ok (status, gate warn, doctor non-strict), empty search, kill-switch silence |
| **1** | Usage error, validation failure, strict freshness gate, containment refusal, unknown command |
| **2** | `init` filesystem error only (other verbs collapse failures to 0/1; visuals peer paths may also use 2) |

Cross-check the detailed table in [Containment and honesty](./containment.md).

## Known limitations (truthful)

1. **`atlas check --strict` is a no-op.** The flag is listed in help history and
   argv is accepted, but `runCheck` never reads it. Only
   `check.strictFreshness: true` in config turns stale zones into hard failures.
2. **Subcommand `--help` always prints the global index**, not per-verb flag
   lists (except bare `atlas visuals` with no args, which prints visuals usage).
3. **`atlas wire` without `merge-driver` writes immediately** — hooks, on-ramp
   blocks, skill copies. There is no dry-run for that path.
4. **`build` can write the index and still exit 1** when zone hard errors exist
   after a successful write.
5. **`status` never fails; `check` does.** SessionStart stays fail-open.
6. **Top-level help is curated** (primary verbs + happy path). This page is the
   complete catalogue; merge-driver verbs are intentionally secondary there.

## Top-level help (exact text)

What `atlas --help` / `atlas -h` / bare `atlas` print after the curated rewrite:

```
atlas — code-verified knowledge base for a repository

Zone cards describe regions of the code (owns.globs + verifiedAt). The CLI
checks, stamps, and rebuilds that vault. Binary: npx atlas, or node bin/atlas.mjs
in a checkout (the package is not always on PATH).

Usage:
  atlas <command> [options]

Primary commands:
  atlas init [--vault name]   Scaffold a vault (default: <repo-dirname>-atlas)
  atlas check                 Validate the vault (read-only; never writes)
  atlas stamp <slug...>       Set verifiedAt to HEAD for reviewed zones only
  atlas build                 Regenerate map/index.md from zone cards
  atlas status                One-line vault health (safe as a SessionStart hook)
  atlas search <query>        Search vault markdown (rg-first; grep fallback)
  atlas doctor                Wiring + lockfile + package-freshness inventory

Happy path (git repo with ≥1 commit):
  npm i -D memory-atlas
  npx atlas init --vault atlas
  npx atlas check
  # → atlas check: ok  (empty vault is valid; seed zones next)

Full command reference (every verb, flag, exit code, real output):
  docs/COMMANDS.md

Also: wire · gate · migrate · adopt · routine · visuals · telemetry
  merge-index · merge-zone  (git merge-driver entrypoints — do not call by hand)

Options:
  --help, -h        Show this help
  --version, -v     Show the installed version
  --no-telemetry    Disable telemetry for this invocation

A repo's atlas.config.json → `enabled: false` silences every command above
(except `init`), printing nothing and exiting 0 — a kill switch for repos
that vendored the convention but paused it.
```
