---
type: decision
summary: "After a stamp-only zone merge, set verifiedAt to unverified — neither parent SHA is honest for the merged tree; atlas check accepts active+unverified as a re-stamp gap."
status: accepted
created: 2026-07-30
tags: [merge, verifiedAt, concurrent-agents, honesty]
zones:
  - verifier-core
  - cli
related: []
sources: []
---

# verifiedAt after merge → unverified

## Context

Ten waves of parallel agents across five repos produced the same merge
conflict shape repeatedly: two branches each rewrote a zone card's one-line
`verifiedAt: <sha>` stamp (and/or the generated `map/index.md`). Humans were
resolving stamp conflicts by keeping one side's SHA with an ad-hoc script.

A stamp is a claim: "this card's claims held against the code **at this
commit**." After a merge, the working tree is a new composition that neither
parent ever verified. Keeping either SHA is a lie; inventing an ISO date is
illegal (encoding is only `unverified` or a 7–40 hex SHA).

## Decision

1. **Stamp-only conflicts resolve to `verifiedAt: unverified`.** The merge
   driver `atlas-zone` (installed by `atlas wire merge-driver --write`)
   compares zone cards with stamps normalized away. If the only difference is
   `verifiedAt`, it writes `unverified` and succeeds. If any other frontmatter
   or body field differs, it **refuses** and leaves a normal git conflict.

2. **Why a merge driver, not only a check-time rule.** `atlas check` cannot
   unstick a conflicted merge — the human is already blocked before check
   runs. Check's job is to **agree** with the resolved state: `active` +
   `unverified` is a legal encoding (verification gap / re-stamp needed), not
   a hard error. ISO dates, empty strings, and other garbage remain hard
   errors. `seeded` still requires the literal `unverified`.

3. **Why not keep the newer SHA.** Commit-date or topological "newer" still
   claims verification of content that never existed at that commit. Honesty
   beats convenience.

4. **Why not demote `status` to `seeded`.** The claims may still be the
   intended claims; only the freshness anchor is gone. Demoting would
   overstate "never reviewed" when the card was previously active.

## Consequences

- Parallel workers that only re-stamp produce a clean merge with
  `verifiedAt: unverified` and a check warning to re-stamp.
- Integrators re-stamp zones they actually re-read after merge.
- `map/index.md` remains a separate problem: regenerate via `atlas-index`
  driver / integrator `atlas build`, never text-merge generated tables.
