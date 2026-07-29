---
title: "Recollecting in parallel"
description: "Worker vs integrator split so parallel agents never merge-war over map/index.md."
section: guide
order: 35
---

# Recollecting in parallel

`map/index.md` is a single sorted table regenerated over every zone. Two
workers that each run `atlas build` and commit the index will conflict on
every row — and a textual three-way merge of that table is silently wrong,
because per-row freshness is recomputed from live git rather than carried in
the text.

## Roles

| Role | Who | Index |
|---|---|---|
| **Worker** | Dispatched to one task / one worktree | Update + stamp **touched** zone cards only. Run read-only `atlas check`. **Do not** run `atlas build`. **Do not** stage `map/index.md`. |
| **Integrator** | Merging others' work, or the only session | After integrating, run `atlas build` **once** and commit the rebuilt `map/index.md`. |

If you are unsure which you are, you are a worker.

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

## Local merge driver

Even with the protocol above, two integrator branches that each rebuilt the
index can still conflict. Install a **local** (per-clone) git merge driver:

```bash
atlas wire merge-driver
```

That appends `<vault>/map/index.md merge=atlas-index` to `.gitattributes`
(commit that) and sets `merge.atlas-index.driver` in **this clone's**
`.git/config` (not committed — re-run after every clone). On conflict the
driver regenerates the index from the merged zone cards; if a zone card
itself still has conflict markers, it refuses and leaves a normal conflict.

Check install with `atlas doctor` (look for `merge-driver:`).

## No hosted CI required

None of this needs GitHub Actions or any hosted CI. The gates are:

- local `atlas check` (read-only)
- the recollection skill's worker/integrator split
- an optional local merge driver

Do not add a CI workflow for index regeneration unless your team already
owns that surface for other reasons.
