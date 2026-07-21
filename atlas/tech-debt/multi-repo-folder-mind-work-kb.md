---
type: debt
summary: "Besides per-repo minds, a multi-repo folder mind (work-kb / repos-kb) over a parent workspace of repos is worth supporting — central work memory + cross-repo edges; consumer of mind recollect, not a second recollect."
tags: [multi-repo, work-kb, recollect, convention, multi-root]
status: open
created: 2026-07-21
updated: 2026-07-21
severity: "medium"
effort: "medium"
related:
  - [[atlas-recollection]]
sources:
  - "Product direction 2026-07-21: folder-level work mind over many code minds"
---

## What's deferred

**Not yet a public “for everyone” convention** in SPEC/ONRAMP. Product debt for memory-atlas:

1. Document (and later optional scaffold) a **mind over a folder of repos** — e.g. a `work-kb` vault whose workspace is many children under a monorepo parent / `Repositories/*` tree, not a single app repo.
2. **Layering (locked intent):**
   - Per-repo mind = SoT for **verified code** in that repo.
   - Folder mind / **work-kb** = **layer on top** = memory of **work** (sessions, PRs, cross-repo relations).
3. **Recollect once, two consumers:** existing mind recollect remains the only recollect ceremony. work-kb **ingests** that recollect (hook/consumer) — **never** a second full recollect pass.
4. **Auto log to work-kb** on recollect/DONE; do **not** invent a second human gate for work-kb. Mind zone stamp honesty unchanged (no auto-fake verified Map zones).
5. Optional later: multi-root / folder-workspace config so this is a first-class product shape (`atlas init` / profile flags).

## Why

Multi-repo fleets need answers like “what shipped across these products?” and “how do these sessions relate?” that a single per-repo mind cannot answer alone. A work-scoped vault + edges complements minds without replacing them.

work-kb must stay honest: diary + relations, not a dump of unverified chat into code-verified zones.

## Non-goals (for this debt item)

- Replacing agent runtime memory (MEMORY.md / external providers)
- Auto-writing verified code zones from chat
- Public marketing of “folder minds” before dogfood proves the shape

## Suggested first dogfood (when implemented)

- Vault path: e.g. `work-kb` sibling to code repos (name TBD)
- Hook: end of mind recollect → work-kb ingest
- Agent coding sessions and interactive CLI share the same recollect → ingest path

## Tracking

Implement only after a written design for the work-kb first slice is approved.
