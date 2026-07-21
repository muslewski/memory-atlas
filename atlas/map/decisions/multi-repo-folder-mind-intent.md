---
type: decision
summary: "Intent (2026-07-21): support multi-repo folder minds (work-kb) as a product direction; not public convention yet — tracked as tech debt."
status: accepted
created: 2026-07-21
updated: 2026-07-21
---

# Decision: multi-repo folder mind (work-kb) — product intent

## Context

memory-atlas already models **per-repo** verified minds. Multi-repo workspaces (a parent folder of many product repos) also need **central work memory** — sessions, PRs, and cross-repo relations that no single app mind should own alone.

## Decision

1. **Intent yes:** a mind-like vault over a **folder of repositories** (work-kb / repos-kb) is a valid atlas-adjacent product shape.
2. **Not public convention yet** — do not push into SPEC/ONRAMP as recommended for all users until dogfood.
3. **Layering:** per-repo minds stay SoT for verified code; folder mind is a **consumer layer** (work diary + relations).
4. **Recollect:** one recollect ceremony; folder mind ingests — never double recollect.
5. **Tracked as:** `atlas/tech-debt/multi-repo-folder-mind-work-kb.md`.

## Consequences

- Product can later add multi-root / folder-workspace init without fighting a “one repo only” brand.
- Agent coding sessions and interactive CLI recollect can share one ingest hook into the folder mind.
