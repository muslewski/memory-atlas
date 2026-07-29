---
title: "Recollecting in parallel"
description: "Worker vs integrator split so parallel agents never merge-war over map/index.md; portable merge drivers for the generated index and stamp-only zone conflicts."
section: guide
order: 35
---

# Recollecting in parallel

`map/index.md` is a single sorted table regenerated over every zone. Two
workers that each run `atlas build` and commit the index will conflict on
every row — and a textual three-way merge of that table is silently wrong,
because per-row freshness is recomputed from live git rather than carried in
the text. A second conflict shape is a one-line `verifiedAt:` fight on the
same zone card after two stamps.

## Roles (worker / integrator contract)

| Role | Who | Stages | Index / stamp |
|---|---|---|---|
| **Worker** | Dispatched to one task / one worktree | Only `map/zones/<slug>.md` and decision/debt notes they own | Update + stamp **touched** zones. Run read-only `atlas check`. **Never** run `atlas build`. **Never** stage `map/index.md`. |
| **Integrator** | Merging others' work, or the only session | After zones merge, rebuild once | Run `atlas build` **once** and commit the rebuilt `map/index.md`. Re-stamp zones whose content you actually re-read. |

If you are unsure which you are, you are a worker.

The merge drivers below are the **safety net** when a worker stages the index
anyway, or when two stamps collide — not a substitute for the protocol.

## Optional config

```json
{
  "check": {
    "indexSync": false
  }
}
```

Set `check.indexSync: false` when many agents recollect in parallel and one
integrator rebuilds the index. `atlas check` then skips the index-freshness
gate (zone claims and the ledger still run). Default remains `true` for solo
use.

## Portable install (one command)

Install both merge drivers with a single report-first command (same `--write`
convention as `atlas migrate` / `atlas adopt`):

```bash
# Report what would change — writes nothing
atlas wire merge-driver

# Apply (.gitattributes + local git config)
atlas wire merge-driver --write
```

**Idempotent:** a second `--write` on a clean tree refreshes local config and
leaves `.gitattributes` byte-identical when already wired.

**Dirty-tree refusal (deliberate):** `--write` refuses when the working tree
is dirty so install does not interleave with unfinished edits. Escape hatch:
`atlas wire merge-driver --write --allow-dirty`.

### What gets installed

| Artifact | Committed? | Purpose |
|---|---|---|
| `.gitattributes` lines for `<vault>/map/index.md` (`merge=atlas-index`) and `<vault>/map/zones/*.md` (`merge=atlas-zone`) | **Yes** — commit in the consuming repo | Tells git which driver name to use |
| `git config merge.atlas-index.driver` / `merge.atlas-zone.driver` | **No** — local to this clone | Actually runs the driver |

**`.gitattributes` alone does nothing.** Without the local `git config
merge.<name>.driver` lines, git ignores the attribute. Re-run
`atlas wire merge-driver --write` after every clone.

### Driver behavior

1. **`atlas-index`** — on conflict over `map/index.md`, regenerates the index
   from the merged zone cards via `atlas` render (same path as `atlas build`).
   Deterministic for the same cards. Fails loudly (exit 1, no partial write)
   if regeneration errors or a zone card still has conflict markers.
   Regenerate-and-take-ours is wrong; the correct result is what the merged
   zone set implies.

2. **`atlas-zone`** — when the only difference between two zone cards is
   `verifiedAt: <sha>`, resolves to `verifiedAt: unverified`. Neither parent
   SHA is honest for the merged tree (decision
   `2026-07-30-verifiedAt-after-merge-unverified`). Real content conflicts
   still surface as normal git conflicts.

Check install with `atlas doctor` (look for `merge-driver:`).

## No hosted CI required

None of this needs GitHub Actions or any hosted CI. The gates are:

- local `atlas check` (read-only)
- the recollection skill's worker/integrator split
- an optional local merge-driver install (`atlas wire merge-driver --write`)

Do not add a CI workflow for index regeneration unless your team already
owns that surface for other reasons.
