---
title: "Containment and honesty"
description: "Write paths stay inside the vault after realpath; check is read-only; the generated index regenerates instead of merging line-by-line."
section: guide
order: 28
---

# Containment and honesty

Atlas is a tool that **writes into your repository**. Its safety posture is
simple: resolve the intended root once, refuse any write whose resolved target
falls outside that root, and exit nonzero. Related honesty rules: `atlas check`
never writes; the generated index is rebuilt from zone cards rather than merged
as text.

This page records behaviour observed on memory-atlas **0.5.4** (and the
containment work on the current branch). If a command and this page disagree,
trust the command.

## The containment rule

1. The intended root (vault directory and/or repository root) is resolved with
   `realpath` when the path exists.
2. Every product write target is resolved the same way (following symlinks, or
   walking up to the nearest existing ancestor for paths that do not exist yet).
3. If the resolved target is not inside the root, the verb **refuses the write**
   and exits **1**. Nothing outside the root is modified.

Shared helpers live in `lib/paths.mjs` (`assertWriteInside`, `resolveInside`,
`isSafeSlug`, `isSafeVaultRel`). Call sites today: `atlas stamp`, `atlas build`
(and the index merge path that reuses build), and zone-folder loading.

### Why an agent should care

Agents pass **tool-generated strings** as zone slugs and config values. Path
traversal is not a hypothetical: a slug like `../outside-escape`, a symlink
planted at `map/index.md`, or a `folders.zones` remap with `..` used to be
enough for a write path with no realpath check to land outside the vault while
still exiting 0 and reporting an in-root path. That defect class was fixed;
this page is the contract you can rely on afterward.

## Observed refusals (real stderr)

Run from a git repo with an Atlas vault. Binary: `npx atlas` after
`npm i -D memory-atlas`, or `node path/to/bin/atlas.mjs` in a checkout.

### Slug traversal (`atlas stamp`)

```bash
npx atlas stamp '../outside-escape'
# exit 1
```

```
atlas stamp: zone "../outside-escape" is not a safe slug (no path separators or ..)
```

Slashes are refused the same way (`a/b` → same "not a safe slug" message).

### Zone card is a symlink outside the vault (`atlas stamp`)

If `map/zones/<slug>.md` is a symlink whose realpath leaves the vault:

```
atlas stamp: zone "escaped": write target escapes root: map/zones/escaped.md
```

Exit **1**. The file outside the vault is not modified.

### Escaping `folders.zones` in config (`atlas stamp`)

```
atlas stamp: config folders.zones escapes the vault ("../outside-zones")
```

Exit **1**.

### Index path is a symlink outside the vault (`atlas build`)

If `map/index.md` is replaced with a symlink to a file outside the vault:

```
atlas build: cannot write map/index.md: write target escapes root: map/index.md
```

Exit **1**. The outside file keeps its previous contents.

Helper-level messages (thrown, then wrapped by the verb) include
`path escapes root: …` and `write target escapes root: …`.

## Happy path still works

Containment does not change the normal loop. In a vault with a valid zone card
whose `owns.globs` match at least one tracked file:

```bash
npx atlas stamp <slug>   # exit 0 — e.g. stamped probe → <short-sha>
npx atlas build          # exit 0 — 🗺️ Atlas map rebuilt: N zones, 0 gap(s).
npx atlas check          # exit 0 — atlas check: ok
```

## Exit codes (verified)

These are what the CLI returns today. Where verbs disagree, that is a **known
inconsistency**, not a doc simplification.

| Command | Exit **0** | Exit **1** (and notes) |
|---------|------------|-------------------------|
| `--help` / `-h` / subcommand `--help` | Always | — |
| `--version` / `-v` | Always | — |
| unknown command | — | **1** (`atlas: unknown command "…"`) |
| `init` | Scaffold ok (including additive re-run on an existing vault) | **1** bad flags / unknown modules; **2** filesystem error only (`atlas init: filesystem error: …`) |
| `build` | Index written and zone render has **no** hard errors | **1** no git repo / no vault; containment refusal (no write); **or** hard zone/render errors **after** a successful write |
| `check` | `atlas check: ok` (read-only — does not write zone cards or the index) | **1** hard errors, ledger violations, or out-of-date working-tree index; no repo / no vault |
| `stamp <slug…>` | All named zones stamped | **1** no slugs, unsafe slug, missing zone, unmounted, containment, parse/IO failure. Preflight validates **all** slugs before any write |
| `status` / `status --hook` | **Always 0** (fail-open), including outside a git repo | never fails the process |
| `doctor` | Inventory printed (missing wiring is soft `✗` / `ℹ`) | **1** only with `--strict` when package-freshness issues trip the gate (or a thrown error under `--strict`) |
| `gate` | Default warn mode always soft-ok | **1** with `--strict` or `check.packageFreshness.mode=fail` when issues exist |
| `search <query>` | Hits (or zero hits) | **1** if query missing (`atlas search: query required`) |
| `wire merge-driver` | Dry-run report | **1** no vault; **1** `--write` on a dirty tree without `--allow-dirty` |
| `merge-index` / `merge-zone` | Driver resolved the file | **1** wrong arity / leave conflict for git (not for hand use) |
| `migrate` / `adopt` | Dry-run or successful apply | **1** on refusal / apply failure (see their stderr) |
| `enabled: false` in `atlas.config.json` | Every command **except** `init` prints nothing and exits **0** | kill switch — not a success signal for the vault |

### Known inconsistencies (do not paper over)

1. **`build` can write and still exit 1.** If containment passes but a zone has
   a hard error (for example empty `owns.globs` under `profile: code`), build
   still regenerates `map/index.md`, prints `🗺️ Atlas map rebuilt: …`, and
   returns **1**. Containment failures are different: no write, exit **1**,
   message `cannot write map/index.md: …`.
2. **`status` never fails; `check` does.** SessionStart can keep failing open
   while a human or agent script must treat `check` as the honesty gate.
3. **`doctor` soft-fails wiring; `check` hard-fails vault structure.** A clone
   missing SessionStart hooks is still `doctor` exit 0. A clone with broken
   zone claims is `check` exit 1.
4. **`init` is the only core scaffold verb that uses exit 2** (filesystem
   errors). Other verbs collapse failures to 0 or 1 (except optional
   `atlas visuals` paths that can also return 2 when the companion is missing —
   see that command's own stderr).

## `atlas check` is read-only

`check` loads the vault, renders what the index *would* be, compares it to the
on-disk working-tree `map/index.md` when `check.indexSync` is not `false`, and
prints errors. It does **not** rewrite zone cards or the index. Confirmed by
running `check` against a vault and observing zone file mtimes unchanged.

Out-of-date index message (working tree vs fresh render — not "must be
committed"):

```
atlas check: map/index.md is out of date — run `atlas build` (working-tree index must match a fresh render)
```

## Generated index: regenerate, do not text-merge

`map/index.md` is a **generated** table. Freshness per row is recomputed from
live git and zone cards. A line-by-line three-way merge of that file is
silently wrong.

On conflict, the optional **`atlas-index`** merge driver regenerates the index
from the **merged set of zone cards** (same render path as `atlas build`). It
materializes the union of both merge parents' zone cards when needed, and
**refuses** (exit 1, leave the conflict) rather than invent a zone set when
parents disagree and the working tree still matches only one pure side, when a
zone card still has conflict markers, or when render fails / is empty while
zones exist.

Stamp-only fights on a zone card use **`atlas-zone`**: if the only difference
is `verifiedAt: <sha>`, the result is `verifiedAt: unverified` (neither parent
SHA is honest for the merged tree). Real body conflicts stay as normal git
conflicts.

Full worker/integrator protocol:
[Recollecting in parallel](./recollecting-in-parallel.md).

### What must be installed locally for drivers to run

| Piece | Committed? | Role |
|-------|------------|------|
| `.gitattributes` lines (`…/map/index.md merge=atlas-index`, `…/map/zones/*.md merge=atlas-zone`) | **Yes** | Names the driver git should call |
| `git config merge.atlas-index.driver` and `merge.atlas-zone.driver` | **No — per clone** | Actually runs the driver |

**`.gitattributes` alone does nothing.** Without the local `git config
merge.<name>.driver` entries, git ignores the attribute and falls back to a
textual merge (or leaves a normal conflict). That gap is the usual point of
failure after a fresh clone.

Install (report-first, then write):

```bash
npx atlas wire merge-driver           # dry-run — exit 0; prints what would change
npx atlas wire merge-driver --write   # applies .gitattributes + local git config
```

Observed dry-run note:

```
note: .gitattributes alone does nothing without local `git config merge.<name>.driver` — re-run after every clone
```

`--write` refuses a dirty working tree (exit **1**) unless you pass
`--allow-dirty`. Re-run `--write` after every clone; attributes travel with the
repo, config does not. Confirm with `atlas doctor` (`merge-driver:` line).

None of this requires hosted CI. Verification is local: `atlas check`, the
worker/integrator split, and an optional per-clone merge-driver install.

## What this does not do

- It does **not** sandbox the whole process (network, env, other tools).
- It does **not** stop you from hand-editing files outside the vault with your
  editor — only atlas write paths are contained.
- It does **not** replace the parallel-agent protocol; merge drivers are a
  safety net when someone stages the index anyway.
- It does **not** make `status` or default `doctor` a substitute for `check`.
- Containment messages report vault-relative paths (for example
  `map/index.md`); they do not print absolute host paths in the refusal line.

## See also

- [Recollecting in parallel](./recollecting-in-parallel.md) — worker/integrator,
  `check.indexSync`, merge drivers in detail
- [Configuration](./CONFIG.md) — `check.*`, `folders.*`, kill switch `enabled`
- [On-ramp](./ONRAMP.md) — wiring hooks and instruction blocks after `init`
