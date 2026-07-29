---
type: decision
summary: "Index merge driver regenerates from the merged union of zone cards across merge parents; when parents disagree and the working tree still holds only one pure side, refuse rather than emit a confidently wrong index."
status: accepted
created: 2026-07-30
tags: [merge, index, concurrent-agents, honesty]
zones:
  - cli
  - verifier-core
related:
  - [[2026-07-30-verifiedAt-after-merge-unverified]]
sources: []
---

# Index merge: materialize union, refuse incomplete sets

## Context

`map/index.md` is pure generated output. Research (q31) and the cold review
agree: **regenerate-on-merge** is the right semantics for a pure generated
file — there is no named git standard or reference implementation to copy, so
the contract must be stated here.

An earlier materialize path walked merge parents in order and kept the first
body per path (first-parent / working-tree-first). Under real git driver
ordering the index driver can run while a content-divergent zone is still a
clean HEAD checkout. Regenerating then produced an index that looked
authoritative and had **no conflict markers** — confidently wrong rather than
obviously broken.

## Decision

1. **Regenerate from the merged zone set.** Enumerate zone paths as the
   **union** of every merge parent (`HEAD`, `MERGE_HEAD`, `GITHEAD_*`, …).
   Paths that exist on only one side, or agree byte-for-byte on all sides, are
   materialised when missing from the working tree so mid-merge render sees
   both branches' additive zones.

2. **Parents disagree → never invent.** When two (or more) parents have
   byte-different bodies for the same path:
   - conflict markers on disk → refuse (resolve zones first);
   - working tree missing → refuse;
   - working tree equals exactly one pure parent → **refuse** (incomplete
     first-parent checkout — the F1 failure mode);
   - working tree differs from every pure parent → keep it (zone driver or
     human already produced a merge product, e.g. stamp-only → `unverified`).

3. **Refuse rather than guess.** Exit 1 and leave a normal git conflict when
   the complete merged set is not honestly available. A half-index or an empty
   render that overwrites a good index while zones exist is also refused.

4. **Empty vault vs empty render.** An empty successful render is allowed only
   when the zone set is genuinely empty (zero cards). Empty render with zones
   on disk is a hard failure.

## Consequences

- Additive two-branch merges (each side adds a different zone) still regenerate
  a clean index listing both — proven by a real `git merge` e2e with the driver
  configured as a user would (`.gitattributes` + local `git config`).
- Content-divergent zone cards block index regeneration until the zone is
  resolved (markers, zone driver, or human) — honesty over a green merge.
- Docs and the zone card for [[cli]] must not claim "always regenerates"; they
  claim "regenerates from the merged set, else refuses."
