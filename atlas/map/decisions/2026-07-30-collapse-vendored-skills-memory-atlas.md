---
type: decision
summary: "Removed this repo's six vendored `.claude/skills/*` copies; install lives at user scope. Five were byte-identical to ~/.claude/skills; atlas-recollection was stale (b331ce5d vs 709627d9)."
status: accepted
created: 2026-07-30
tags: [skills, user-scope, drift, vendoring]
zones:
  - agent-onramp
related:
  - [[2026-07-30-user-scope-skills-satisfy-wiring]]
sources: []
---

# Collapse vendored skills in memory-atlas

## What was removed

Deleted (via `git rm`) the repo-local installs under `.claude/skills/`:

| skill | vendored hash (8) | vs user-scope |
|---|---|---|
| atlas-nav | 1e4276d9 | identical |
| atlas-adopt | b59f1e80 | identical |
| atlas-update | 02174472 | identical |
| atlas-seed | 4e2b2726 | identical |
| writing-for-retrieval | 1ebfbfbb | identical |
| atlas-recollection | b331ce5d | **diverged** |

Package product assets under `skills/` were **not** touched — they remain the npm-shipped canonical source.

## Divergent copy (read before delete)

**atlas-recollection** vendored `b331ce5d` vs user-scope and package canonical `709627d9`.

Vendored (shorter, stale) still said:

- "Rebuild and check" as a single path that regenerates `map/index.md` via `atlas check`

User-scope / canonical add:

- **Worker / integrator** split: workers must not `atlas build` or stage `map/index.md`; integrators build once after merge; safety net via `atlas wire merge-driver`
- **Docs soft-nudge** checklist (docs-kit health, relevance pass, finish-report Docs line)

User-scope was already equal to package `skills/atlas-recollection/SKILL.md`. The repo copy lost; user-scope wins.

## Single source now

| role | path |
|---|---|
| Agent install (runtime) | `~/.claude/skills/<name>/SKILL.md` (or `ATLAS_USER_SKILLS_DIR`) |
| Package canonical (product) | `skills/<name>/SKILL.md` in this repo / npm package |
| Repo vendored install | **gone** — not re-created unless `skills.vendorInRepo: true` |

State: `.atlas-state.json` `vendored["skills/<name>/SKILL.md"]` set to
`{ sha256, atlasVersion, source: "user-scope" }` using `userScopeVendoredEntry()`
from `lib/skills.mjs` (same shape `atlas wire` would write). Not produced by
running `atlas wire` (forbidden this session).

## Transitional issue

Installed nudge still prints
`run the atlas-update skill (.claude/skills/atlas-update/SKILL.md)`.
That path no longer exists until a newer atlas release points the nudge at
user-scope. Known; do not keep a stub copy to silence it.

## Verify

```bash
node bin/atlas.mjs doctor   # no missing skill; user-scope pristine
node bin/atlas.mjs gate     # exit 0; no re-vendor findings
```
