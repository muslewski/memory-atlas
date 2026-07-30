# S1 — syndcast-mind structural inventory

**Subject:** `~/Repositories/syndcast/syndcast-mind/`  
**Date:** 2026-07-17  
**Scope:** Full vault structure (note types, naming, frontmatter, wikilinks, MOCs, generated vs hand-written). **`visuals/` is OUT OF SCOPE** for productization (mentioned only as an excluded sibling).  
**Method:** Read-only filesystem inventory + frontmatter parse of all `*.md` outside `visuals/`. No generators, installs, or git mutations.

---

## Summary

- **Three-layer vault:** Map (present, code-verified) + Ledger (past, mostly read-only) + Vision (evergreen pillars) — documented in `Home.md`, `README.md`, `map/README.md`.
- **~1,150 markdown notes** outside `visuals/` (~22 MB). Dominant ledger: **352 specs**, **317 plans**, **163 tech-debt**, **128 decisions**, **50 zones**.
- **Canonical schema** lives in `map/README.md` + `templates/*` (9 types: zone, entity, flow, decision, spec, plan, idea, debt, pillar). **Live corpus has more types** (`program`, `reference`, `report`, `tech-debt`, `human-draft-moc`) and **status vocab drift**.
- **Naming:** zones = kebab slug; decisions = `NNNN-slug`; specs/plans/ideas/debt = `YYYY-MM-DD-slug` (specs often `*-design.md`); vision = `syndcast-<pillar>/<UPPERCASE>.md`.
- **Generator is outside the vault:** `scripts/build-map.ts` rewrites only `map/index.md`; hard-validates zone/flow anchors; soft graph pass. Companion gates: `mind:check`, `mind:check:ledger`, `mind:check:corpus`.
- **~6,000 `[[wikilinks]]`** — almost all plain slugs; Obsidian shortest-path + generator date-prefix aliases; display form `[[slug|label]]` common in `Home.md`.
- **Bases (3):** Obsidian Bases dashboards over frontmatter — complement, never replace, the generator.
- **Schema dual-track debt:** decisions (`type: decision` vs bare `status: accepted` + `id`/`title`/`date`); tech-debt (`type: debt` vs `type: tech-debt`); plan/spec statuses outside documented lifecycles.
- **Empty reserved dirs:** `map/entities/` (entity type unused in practice), `raw-prompts/`.
- **Machine-generated (Mind core):** essentially **`map/index.md` only**. Everything else is hand-written (or agent-written) markdown; templates are hand-authored scaffolds.

---

## Findings

### 1. Top-level folder tree (with purpose)

Paths relative to `syndcast-mind/`. Counts = `*.md` recursive unless noted. **`visuals/` excluded from productization.**

| Path | Approx. notes | Purpose | Hand / gen |
|------|---------------|---------|------------|
| `Home.md` | 1 | Root MOC: pillars constellation, Bases dashboards, entry ramp | Hand |
| `README.md` | 1 | Vault context + Obsidian sync; older ideas-vault prose still embedded | Hand |
| `BACKLOG.md` | 1 | Living session claim board (A/B/C main + D side missions); not a typed note | Hand |
| `map/` | ~200 | **Present-tense Map** — zones, flows, decisions, map-scoped debt, generated index | Mixed |
| `map/zones/` | 50 | Zone cards (architecture as-built, code anchors) | Hand |
| `map/flows/` | 3 + `.gitkeep` | Cross-zone verifiable journeys | Hand |
| `map/entities/` | 0 + `.gitkeep` | Reserved for load-bearing entity notes (unused) | — |
| `map/decisions/` | 128 | ADRs / decisions (past why) | Hand |
| `map/tech-debt/` | 16 | Debt filed near the Map (canonical `type: debt`) | Hand |
| `map/index.md` | 1 | **Generated** zone table + verification gaps + attic | **Gen** |
| `map/README.md` | 1 | Property schema + generator contract (authoritative) | Hand |
| `map/lineage-seeds.md` | 1 | Archaeology seed table (spec→plan→area); `type: reference` | Hand |
| `specs/` | 352 | Design docs (contract); mostly flat + 2 multi-file subdirs | Hand |
| `plans/` | 317 | Implementation plans; mostly flat | Hand |
| `programs/` | 16 | Multi-spec initiative umbrellas (`type: program`) | Hand |
| `ideas/` | 24 | Pre-spec seeds (`type: idea`; some untyped legacy) | Hand |
| `tech-debt/` | 163 | Deferred work (mixed `debt` / `tech-debt` / untyped) | Hand |
| `vision/` | 27 | Long-horizon pillars (`type: pillar`) under `syndcast-*/` | Hand |
| `templates/` | 9 | Frontmatter scaffolds per note type | Hand |
| `bases/` | 0 md (3 `.base`) | Obsidian Bases: map / ledger / vision dashboards | Hand |
| `reference/` | 22 | Runbooks, landscape, testing, AGENTS, architecture notes | Hand |
| `reports/` | 1 | Point-in-time snapshots (`type: report`) | Hand |
| `archive/` | 7 | Superseded root-era specs/plans | Hand |
| `human-drafts/` | 5 + canvas | Pre-vault human prompts/drafts | Hand |
| `llms.txt/` | 4 | Vendor/docs mirrors (auth/plugins) | Hand |
| `raw-prompts/` | 0 + `.gitkeep` | Reserved empty | — |
| `.obsidian/` | — | Shared vault config (theme, core plugins, git plugin list) | Hand |
| `visuals/` | **OOS** | Mind-skins gallery app + digests — **not part of memory-atlas core** | Gen+hand |

**Sibling tooling (outside vault, required to understand the system):**

| Path (repo root) | Role |
|------------------|------|
| `scripts/build-map.ts` | Zone/flow validate + rewrite `map/index.md` |
| `scripts/mind-status.ts` | SessionStart status hook helper |
| `scripts/check-ledger-frontmatter.ts` | Ledger type/status/summary/zones gate |
| `scripts/check-corpus-quality.ts` | Retrieval-shape lint (summaries, headers, globs, orphans, freshness) |
| `scripts/lib/corpus-quality*` | Shared corpus check lib |
| `package.json` scripts | `mind:build`, `mind:check`, `mind:check:ledger`, `mind:check:corpus`, `mind:bench` |

---

### 2. Note-type inventory (counts)

Parsed from YAML frontmatter `type:` across all `*.md` excluding `visuals/` (2026-07-17).

| `type` value | Count | Primary home(s) | In official 9-type schema? |
|--------------|------:|-----------------|----------------------------|
| `spec` | 352 | `specs/`, few in `archive/` | Yes |
| `plan` | 282 | `plans/` (+ archive) | Yes |
| `decision` | 107 | `map/decisions/` | Yes |
| `debt` | 73 | `map/tech-debt/` + subset of `tech-debt/` | Yes |
| `tech-debt` | 62 | `tech-debt/` (legacy alias of debt) | **No** (alias / drift) |
| `(no type key)` | 54 | Early decisions, old debt, some specs | Drift |
| `zone` | 51 | `map/zones/` (50) + template | Yes |
| `pillar` | 28 | `vision/**` + template | Yes |
| `idea` | 22 | `ideas/` (+ 1 misplaced) | Yes |
| `program` | 16 | `programs/` | **No** (de facto 10th) |
| `reference` | 12 | `reference/`, `map/lineage-seeds.md` | **No** |
| `flow` | 4 | `map/flows/` + template | Yes |
| `report` | 1 | `reports/` | **No** |
| `human-draft-moc` | 1 | `human-drafts/README.md` | **No** |
| `entity` | 1 | template only (no real entity cards) | Yes (unused) |
| **no frontmatter at all** | **84** | READMEs, BACKLOG, Home, many reference docs, some plans/debt | — |

**Folder-level md totals (including untyped / no-fm):**

| Folder | `*.md` |
|--------|-------:|
| `specs/` | 352 |
| `plans/` | 317 |
| `map/` (all) | 200 |
| `tech-debt/` | 163 |
| `vision/` | 27 |
| `ideas/` | 24 |
| `reference/` | 22 |
| `programs/` | 16 |
| `templates/` | 9 |
| `archive/` | 7 |
| `human-drafts/` | 5 |
| `llms.txt/` | 4 |
| root (`Home`, `README`, `BACKLOG`) | 3 |
| `reports/` | 1 |

---

### 3. Naming conventions

| Note class | Filename pattern | Examples |
|------------|------------------|----------|
| Zone | `kebab-case.md` (no date) | `auth.md`, `tool-registry.md`, `placements-clip-model.md` |
| Flow | `kebab-case.md` | `prototyping-ignite-accept.md` |
| Decision | `NNNN-kebab-slug.md` (4-digit, zero-padded) | `0001-dual-authentication.md` … `0118-…` |
| Spec | `YYYY-MM-DD-<slug>-design.md` (dominant; ~315 end in `design.md`) | `2026-07-13-macro-knowledge-design.md` |
| Plan | `YYYY-MM-DD-<slug>.md` or `…-plan.md` | `2026-06-30-permission-modes-collection-plan.md` |
| Idea | `YYYY-MM-DD-<slug>.md` | `2026-06-24-channel-mind-previewable-brain.md` |
| Debt (map) | `YYYY-MM-DD-debt-<slug>.md` | `2026-06-24-debt-render-queue-guard-toctou.md` |
| Debt (root) | `YYYY-MM-DD-<slug>.md` or `…-debt-…` | mixed |
| Program | `YYYY-MM-DD-<slug>-program.md` (one undated) | `social-layer-program.md` |
| Pillar | `vision/syndcast-<name>/<NAME>.md` UPPERCASE body file | `vision/syndcast-cortex/CORTEX.md` |
| Report | `YYYY-MM-DD-<slug>.md` | `2026-07-09-advisor-plans-state-of-the-build.md` |
| Template | `templates/<type>.md` | `zone.md`, `spec.md` |

**Decision numbering caveats:** range `0000`–`0118`; **duplicate numbers exist** (e.g. two `0013-*`, two `0014-*`, …). Filenames are unique; numeric ID alone is not a primary key.

**Spec multi-file packages** (exception to flat layout):

- `specs/building-blocks-sub-F-discovery/` (`README.md`, `spec.md`, `quick-wins.md`)
- `specs/clip-code-foundation/` (`README.md`, `amendments.md`, `clip-runtime-ports.md`)

**Wikilink targets (Obsidian + generator):**

- Primary: file basename without `.md`
- Alias: strip `YYYY-MM-DD-` prefix (`[[segments-design]]` → `2026-05-20-segments-design.md`) — implemented in `noteIdAliases()` in `scripts/build-map.ts`
- Display: `[[slug|human label]]` (pipe alias)
- Path-style links used in vision MOC: `[[syndcast-cortex/CORTEX|…]]`

---

### 4. Frontmatter schema (canonical vs observed)

#### 4.1 Official universal fields (`map/README.md`)

```yaml
type:            # zone | entity | flow | decision | spec | plan | idea | debt | pillar
summary:         # 1–3 sentence glance
tags: []
status:          # per-type lifecycle
created:         # YYYY-MM-DD
updated:         # YYYY-MM-DD
related: []      # lateral [[wikilinks]]
sources: []      # lineage [[wikilinks]]
```

#### 4.2 Documented lifecycles vs live status vocab

| Type | Documented statuses | Observed in corpus (non-exhaustive) |
|------|---------------------|-------------------------------------|
| zone / flow / entity / decision | `active → unmounted` | zone: active 50, unmounted 1; decision: **active 49, accepted 57**, draft 1 |
| spec | `draft → planned → superseded` | planned 259, draft 43, **approved 31**, active 8, unmounted 5, … |
| plan | `draft → executing → done → abandoned` | done 241, draft 15, **ready 10**, **in-progress 6**, executing 3, active 5, unmounted 2 |
| debt | `open → done → wontfix` | open 66, **resolved 6**, deferred 1 |
| idea | `active → promoted → archived` | active only (22) |
| pillar | `active → realized → archived` | active 28 |
| program (unofficial) | — | active, planned, complete, shipped, deferred |
| tech-debt (unofficial) | — | open, partially-addressed, resolved |

`check-ledger-frontmatter.ts` enforces the **documented** status sets for specs/plans only — so much of the live corpus would fail a strict ledger gate unless statuses are normalized or the allowlist is expanded.

#### 4.3 Per-type fields — template + sample evidence

Samples: ≥3 real notes where available. **Y** = present in template; **freq** = how often key appears among typed notes of that class.

##### Zone (`type: zone`) — n=51

| Field | Template | Freq | Notes |
|-------|:--------:|-----:|-------|
| type, summary, tags, status, created, updated | Y | 51/51 | |
| verifiedAt | Y | 51/51 | short git SHA string |
| owns.{routes,testids,globs,tools} | Y | 51/51 | globs may use `:(exclude)…` pathspecs |
| depends | Y | 51/51 | `[[zone]]` list |
| invariants[{rule,enforcedBy}] | Y | 50/51 | enforcedBy: paths, tests, decisions |
| skills | Y | 48/51 | skill name wikilinks |
| advances | Y | 47/51 | `[[pillar]]` |
| related, sources | Y | ~48–49 | lineage |
| hosts | N | 2/51 | optional inverse of depends (e.g. tool-registry) |
| verifiedNote | N | 2/51 | rare annotation |

**Sample files:** `map/zones/auth.md`, `map/zones/tool-registry.md`, `map/zones/the-mind.md`.

**Body sections (convention):** `## What this is`, `## Anchors`, `## Invariants`, `## Lineage` (template); real cards vary in depth.

##### Decision (`type: decision`) — dual schema

**Modern (template + ~106 files):**

| Field | Template | Notes |
|-------|:--------:|-------|
| type, summary, tags, status, created, updated | Y | status ideally `active` |
| decided | Y | YYYY-MM-DD |
| supersededBy | Y | list |
| zones | Y | shaped zones |
| related, sources | Y | |

**Legacy ADR (~22 files, e.g. `0070-agent-sessions-central-lifecycle.md`):**

```yaml
id: 0070
title: "…"
date: 2026-06-25
status: accepted   # not in documented decision lifecycle
tags: […]
# often no type: decision
```

**Sample files:** `0001-dual-authentication.md` (modern), `0000-how-syndcast-grew.md` (modern meta), `0070-agent-sessions-central-lifecycle.md` (legacy).

##### Spec (`type: spec`) — n=352

| Field | Template | Live freq | Notes |
|-------|:--------:|----------:|-------|
| type, status | Y | 352 | |
| summary | Y | 314 | |
| created, updated | Y | ~299 | |
| origin | Y | 12 | underused |
| related, sources | Y | 32 / 20 | |
| **zones** | N in template | **295** | de facto required by ledger check |
| tags | Y | 62 | sparse |
| title, date | N | ~42 | legacy |
| program | N | 15 | link to umbrella |
| supersededBy | N | 6 | |

**Samples:** `specs/2026-07-10-community-layer-design.md`, `specs/2026-07-13-macro-knowledge-design.md`, `specs/2026-07-10-desktop-offline-editing-design.md`.

##### Plan (`type: plan`) — n=282

| Field | Template | Live freq | Notes |
|-------|:--------:|----------:|-------|
| type, status | Y | 282 | |
| summary | Y | 265 | |
| implements | Y | **4** | nearly unused |
| produced | Y | 3 | |
| commitRange | Y | 3 | |
| related, sources | Y | 8 / 6 | |
| **zones** | N in template | **258** | de facto |
| created, updated | Y | ~258 | |
| tags | Y | 25 | sparse |
| program, spec, title, date | N | rare | |

**Samples:** `plans/2026-06-06-syndcast-mind-phase-1-foundation-archaeology.md`, `plans/2026-07-11-visuals-typeset-migration.md`, `plans/2026-07-12-vellum-notes-ia.md`.

##### Idea (`type: idea`) — n=22

| Field | Template | Freq |
|-------|:--------:|-----:|
| type, summary, status, created, updated | Y | 22 |
| maturity (seed\|budding\|evergreen) | Y | 21 |
| tags, related, sources | Y | 21 |

**Samples:** dated files under `ideas/2026-06-24-*.md`. Four idea files lack frontmatter entirely (legacy).

##### Debt (`type: debt`) — n=73

| Field | Template | Freq |
|-------|:--------:|-----:|
| type, summary, tags, status, created | Y | 73 |
| severity, effort | Y | 72–73 |
| related, sources | Y | ~50 |
| updated | Y | 48 |
| decision | N | 24 | extra link field |

**Samples:** `map/tech-debt/2026-06-24-debt-*.md` (canonical).

##### Tech-debt alias (`type: tech-debt`) — n=62

Parallel legacy shape: `title`, `date`, `severity`, `zone`/`zones`, often no `summary`/`effort`/`created`. Lives under `tech-debt/`. **memory-atlas should treat as synonym of `debt` or migrate.**

##### Flow (`type: flow`) — n=3 live + template

| Field | Template | Live |
|-------|:--------:|------|
| steps | Y | string list: `route:…`, `testid:…`, `tool:…` |
| verify | Y | success signal prose |
| e2e | Y | usually `[]` |
| related | Y | zones traversed |

**Samples:** all three under `map/flows/`.

##### Pillar (`type: pillar`) — n=28

| Field | Template | Live |
|-------|:--------:|------|
| maturity, group, realizedBy | Y | all present |
| id | N | 27/28 (`cortex`, `ouroboros`, …) |

**Samples:** `vision/syndcast-cortex/CORTEX.md`, `vision/syndcast-library/LIBRARY.md`, `vision/syndcast-ouroboros/OUROBOROS.md`. Only **8** pillars have non-empty `realizedBy` (weak zone↔pillar graph today).

##### Program (`type: program`) — unofficial — n=16

Typical keys: `type`, `status`, `summary` or `title`+`date`, `tags`, `zones`, `created`/`updated`. No template file. Naming: `*-program.md`.

##### Reference / report — unofficial

- `reference`: loose; `summary`+`tags` common; status optional.
- `report`: `status: snapshot`, `covers:`, `zones:`.

##### Entity — template only

`anchor`, `intent` — **no real notes in `map/entities/`**.

---

### 5. Wikilink conventions

| Pattern | Use |
|---------|-----|
| `[[zone-slug]]` | Cross-zone depends/related/advances |
| `[[NNNN-decision-slug]]` or `[[short-title]]` | Decisions (short form relies on uniqueness) |
| `[[YYYY-MM-DD-spec-slug]]` or date-stripped alias | Spec/plan lineage in `sources` |
| `[[skill-or-agent-name]]` | Zone `skills:` (repo skill names, not always namespaced) |
| `[[syndcast-foo/FILE\|Label]]` | Vision MOC path links |
| `[[slug\|label]]` | Display alias (Home.md heavy) |
| `[[map/index]]` | Entry to generated map |
| Rare namespaces | `skill:`, `lint:`, `test:`, `code:` — mostly templates/plans (~16 total), not production convention |

**Volume:** ~6,024 wikilink occurrences outside `visuals/` (~6,008 plain).

**Generator soft checks** resolve wikilinks in: `zone.advances|related|depends|sources`, `pillar.realizedBy`. Unresolved → `## ⚠ Graph coherence` in `index.md` (warnings only).

**Connections design (product note):** outbound nav for visuals is derived from source `[[wikilinks]]` on `mind:build` — visuals never invent links (see CLAUDE.md / decision 0058 family). Relevant to update tooling only if digests are in scope later.

---

### 6. Index / MOC / dashboard files

| File | Role |
|------|------|
| `Home.md` | Master MOC: Bases links + full pillar constellation + plans section |
| `map/index.md` | **Generated** zone atlas table + gaps + attic |
| `map/README.md` | Schema + generator contract (docs, not graph hub) |
| `BACKLOG.md` | Operational MOC for in-flight work (not architecture) |
| `bases/map.base` | Table of `type == "zone"` |
| `bases/ledger.base` | Tech-debt board + decisions log + spec→plan pipeline views |
| `bases/vision.base` | Pillar portfolio by `group` / maturity |
| `plans/PLANS.md` | Exists (legacy/strategic plans index pointer — verify when adopting) |
| `human-drafts/README.md` | MOC for human drafts (`type: human-draft-moc`) |
| `archive/root-specs-README.md` | Archive index |

Obsidian graph + backlinks are first-class navigation; Bases require the Bases core plugin.

---

### 7. Machine-generated vs hand-written (Mind core)

| Artifact | Classification | How regenerated |
|----------|----------------|-----------------|
| `map/index.md` | **Machine-generated** | `pnpm mind:build` → `scripts/build-map.ts` |
| All zone/flow/decision/spec/plan/… cards | Hand (or agent) authored | Edit + recollection |
| `templates/*` | Hand scaffolds | Copy on note create |
| `bases/*` | Hand dashboards | Edit in Obsidian |
| `.obsidian/*` (shared) | Hand | Optional ship in template |
| Corpus quality reports | Ephemeral CLI stdout | `mind:check:corpus` |
| `visuals/**` digests / stocks / diagrams | **OOS** — generated by mind-skin / scripts | Out of scope |

**Ouroboros rule:** zone `the-mind` `owns.globs` points at generator scripts + `map/README.md`, **never** at vault markdown (would force perpetual staleness).

**Hard vs soft validation (build-map):**

| Anchor | Severity |
|--------|----------|
| `owns.globs` (≥1 tracked file; excludes pathspecs ignored) | HARD |
| `owns.testids` (`data-testid` in `src/`) | HARD |
| `owns.tools` (registry tool ids) | HARD |
| `owns.routes` | SOFT (verification gap) |
| `verifiedAt` freshness vs globs | freshness badge (`ok` / `⚠ stale`) |
| empty `invariants[].enforcedBy` | warning gap |
| graph link resolution / advances↔realizedBy | warning only |

**Attic:** `status: unmounted` zones listed under `## Attic (unmounted)` — never deleted (e.g. `livestream-overlay`).

---

### 8. Artifact taxonomy (as lived in syndcast)

Matches CLAUDE.md funnel (operational process layered on the vault):

```
idea → spec → plan → code → decision + zone (recollection)
         ↘ program (umbrella over many cycles)
BACKLOG.md claims work; Lands = branch | docs→main
```

| Artifact | Directory | Tense |
|----------|-----------|-------|
| Zone | `map/zones/` | present |
| Flow | `map/flows/` | present |
| Decision | `map/decisions/` | past |
| Spec | `specs/` | past (read-only after planned) |
| Plan | `plans/` | past when done |
| Program | `programs/` | multi-session present/past |
| Idea | `ideas/` | evergreen seed |
| Debt | `tech-debt/` + `map/tech-debt/` | until resolved |
| Pillar | `vision/` | evergreen north-star |
| Report | `reports/` | snapshot, commits to nothing |
| Reference | `reference/` | evergreen ops/docs |

---

### 9. Rebuild blueprint (minimum viable syndcast-shaped mind)

To recreate the **structure** (empty corpus) another engineer would:

```
<repo-mind>/
  Home.md
  README.md
  BACKLOG.md                 # optional operational layer
  map/
    README.md                # schema contract (copy from syndcast)
    index.md                 # GENERATED banner; empty table OK until first build
    zones/                   # seed 4–8 zone cards
    flows/                   # optional
    entities/.gitkeep
    decisions/
    tech-debt/               # optional split from root tech-debt
    lineage-seeds.md         # optional archaeology
  specs/
  plans/
  programs/                  # if multi-spec initiatives exist
  ideas/
  tech-debt/
  vision/                    # if product vision pillars desired
  templates/                 # zone decision spec plan idea debt flow entity pillar
  bases/                     # map.base ledger.base vision.base
  reference/
  reports/
  archive/
  .obsidian/                 # optional shared defaults
```

**Outside vault:**

- Generator CLI equivalent of `build-map.ts` + resolvers
- `atlas.config.json` (memory-atlas) should parameterize: vault path, zone globs, tool/testid resolvers, optional modules (programs, vision, bases, backlog)
- CI: `build` + `check` (index drift) + optional ledger/corpus gates

**Do not require for v1 OSS:** programs, vision pillars, BACKLOG, dual debt dirs, Bases, entity cards, reference, reports — mark as **modules**.

---

### 10. Evidence: dual schemas & quality debt (rebuild risk)

1. **Decisions:** modern `type: decision` vs legacy `id`/`title`/`date`/`status: accepted` without `type`.
2. **Debt:** `type: debt` vs `type: tech-debt`; two folders (`map/tech-debt` vs `tech-debt`).
3. **Plan/spec statuses** drift past documented enums (`ready`, `in-progress`, `approved`, …).
4. **Template vs practice:** plan `implements`/`produced`/`commitRange` almost unused; `zones` on plans/specs is practice not template.
5. **Decision ID collisions** (duplicate numeric prefixes).
6. **~84 notes** without frontmatter; **~54** with FM but no `type`.
7. **Graph:** few pillars wired via `realizedBy`; some zone `sources` fail resolve (programs linked by wrong slug).
8. **Entity** type reserved, empty — candidate to drop or demote to module.
9. **Program** type critical to syndcast process but absent from official 9-type table and templates.
10. **Generator path hardcoding:** `VAULT = join(ROOT, 'syndcast-mind')` — extraction target for memory-atlas config.

---

## Recommendations for memory-atlas

Prioritized for: (1) mature conventions now, (2) open-source later, (3) AI-driven “update to latest” that respects local customizations.

### P0 — Core contract (ship as stable)

1. **Freeze a versioned schema** (`schemaVersion` in `atlas.config.json`) documenting the 9 core types + optional modules. Promote **`program`** to optional core module (syndcast proves the need).
2. **Canonical debt type = `debt` only**; migrate path `type: tech-debt` → `debt` in a one-shot codemod skill.
3. **Canonical decision FM** = modern template; provide `atlas migrate decisions` skill to wrap legacy ADR frontmatter without rewriting body prose.
4. **Keep Map vs Ledger vs Vision separation** as the top mental model (already in memory-atlas README).
5. **Single generated artifact:** `map/index.md` only — do not generate vault notes.
6. **Parameterize vault root + resolvers** (no hard-coded `syndcast-mind`).

### P1 — Conventions that reduce multi-repo drift

7. **Naming recipes** in docs/templates: zone kebab; decision `NNNN-`; dated ledger notes `YYYY-MM-DD-`.
8. **Status enums:** either strict allowlists matching templates **or** documented “extended” sets with aliases (`accepted`→`active`, `ready`→`draft`/`executing`, `resolved`→`done`).
9. **Ledger minimum FM:** `type`, `status`, `summary`, `created`, `zones: []` (match what `check-ledger-frontmatter` already expects).
10. **Wikilink rules:** prefer basename slugs; document date-prefix aliasing; avoid inventing namespace prefixes unless enforced.
11. **Ship templates + empty dir layout** from `atlas init` (memory-atlas already starts this).
12. **Ouroboros / generator ownership** documented as invariant for any “the-mind” equivalent zone.

### P2 — Update mechanism design (AI/skill-driven)

Treat updates like **copier 3-way merge**, executed by an agent skill:

| Layer | Update policy |
|-------|----------------|
| **Tooling** (`atlas` CLI package) | Semver upgrade; pure code; no vault content rewrite |
| **Schema version** | Manifest of required fields / enums / folders |
| **Templates** | 3-way: upstream template vs local template vs “last applied template hash” |
| **Config** (`atlas.config.json`) | Deep-merge with local overrides winning; never clobber unknown keys |
| **Hand notes** (zones, specs, …) | **Never overwrite.** Optional suggest-only codemods (add missing `summary`, rename `tech-debt`→`debt`) |
| **Generated** (`map/index.md`) | Always rebuild after update |
| **Modules** (vision, programs, bases, backlog, entities) | Opt-in; init empty; update only if module enabled |

**Proposed skill:** `atlas-update` / `memory-atlas-upgrade`:

1. Read local `atlas.config.json` + `schemaVersion` + optional `.atlas/applied.json` (last template digests).
2. Diff against target package version / schema.
3. Apply **mechanical** migrations (safe renames, missing required empty fields) with dry-run.
4. Emit **advisor plan** for human/agent review where body text or numbering collisions appear.
5. Run `atlas check`; stamp report into `reports/YYYY-MM-DD-atlas-upgrade.md` if desired.
6. Never touch `visuals/` or user modules not enabled.

**Respect local customizations:** extra frontmatter keys allowed (forward-compatible); extra folders allowed; only fail CI on **hard anchors** + schemaVersion-required fields.

### P3 — Optional modules (default off for new repos)

| Module | Syndcast path | When to enable |
|--------|---------------|----------------|
| `vision` / pillars | `vision/` | Product companies with north-star docs |
| `programs` | `programs/` | Multi-session initiatives |
| `backlog` | `BACKLOG.md` | Fleet/session claim board |
| `bases` | `bases/*.base` | Obsidian Bases users |
| `entities` | `map/entities/` | Fine-grained code entity cards |
| `flows` | `map/flows/` | E2E journey verification |
| `reference` / `reports` | same | Large corps |
| `corpus-quality` | check-corpus-quality | Retrieval-heavy agent fleets |
| `visuals` | OOS | Explicit non-goal for atlas core |

### P4 — Syndcast-specific cleanup (before extracting more)

13. Normalize decision dual schema and duplicate numbers (inventory only here).
14. Collapse `tech-debt` type + consider single debt directory.
15. Align plan/spec statuses to enums or expand checker.
16. Fill `implements`/`produced` on new plans or drop from template.
17. Wire more `realizedBy` / `advances` or demote reciprocity to optional.

---

## Open questions

1. Should **`program`** become a first-class 10th type in memory-atlas, or stay an optional module with looser schema?
2. Single **`tech-debt/`** vs split **`map/tech-debt/`** — which is default for greenfield?
3. Decision **numbering authority:** sequential file prefix vs frontmatter `id` vs unnumbered UUIDs for multi-repo?
4. How strict should **status enums** be for OSS adopters who invent statuses?
5. Is **`BACKLOG.md` process** (claim rows, Lands, docs→main) part of memory-atlas or a separate “fleet ops” skill?
6. Should **`entity`** be removed from core templates until proven, to avoid empty ceremony?
7. **Bases** require Obsidian — ship as module only, or also emit static HTML tables from CLI?
8. For **update skill**, where does “last applied template” state live (`.atlas/`, git notes, package lock)?
9. Cross-repo **shared conventions** vs fully independent vaults — any need for a global “atlas registry” of zone taxonomy?
10. How much of **`check-corpus-quality`** (summary length, H2 shape, orphan detection) is universal vs syndcast retrieval taste?

---

## Appendix A — Frontmatter field frequency (typed notes)

Abbreviated from full-vault parse (top keys only):

| Type | Near-universal keys | Common extras |
|------|---------------------|---------------|
| zone | type summary tags status created updated verifiedAt owns depends | invariants skills advances related sources hosts |
| decision | type status | summary tags created zones related decided supersededBy sources **or** id title date |
| spec | type status | summary created updated **zones** tags related sources origin |
| plan | type status | summary created updated **zones** tags implements* |
| idea | type summary status created updated | maturity tags related sources |
| debt | type summary tags status created severity effort | related sources updated decision |
| tech-debt | type status severity date | title tags zone related |
| flow | type summary status created updated steps verify e2e tags related | sources |
| pillar | type summary status created updated maturity group realizedBy tags related sources | id |
| program | type status | summary/title date tags zones created |

\*implements/produced/commitRange rare in live plans.

## Appendix B — Key file paths (absolute)

- Vault root: `~/Repositories/syndcast/syndcast-mind/`
- Schema contract: `…/map/README.md`
- Generated index: `…/map/index.md`
- Templates: `…/templates/*.md`
- Generator: `~/Repositories/syndcast/scripts/build-map.ts`
- Package scripts: `~/Repositories/syndcast/package.json` (`mind:*`)
- This report: `~/Repositories/memory-atlas/.claude/research/2026-07-17/s1-mind-structure-inventory.md`
