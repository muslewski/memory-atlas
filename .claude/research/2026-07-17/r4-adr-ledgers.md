# R4 — Architecture Decision Records, RFCs, Design Docs & memory-atlas `reports/`

Research date: 2026-07-17  
Scope: ledger-style engineering documentation ecosystems (ADRs, RFCs, design-doc folders), tooling/lifecycle norms, and evaluation of memory-atlas’s new optional `reports/` module against them.  
Method: web research (GitHub + docs) + read-only inspection of memory-atlas (main + `feat/reports-convention` worktree) and origin convention in syndcast-mind.  
Out of scope: `visuals/` presentation layer.

---

## Summary

- **ADRs are the dominant “ledger of why” pattern.** Canonical inspiration is Nygard (2011); the most-starred gallery is joelparkerhenderson / architecture-decision-record (~**16.4k** stars). CLI tooling centers on **npryce/adr-tools** (~**5.6k**); the richest template is **adr/madr** (~**2.3k**); static-site/KB tooling is **thomvaill/log4brains** (~**1.5k**).
- **Industry ADR lifecycle is nearly universal:** `proposed → accepted → rejected | deprecated | superseded` (with supersession as a *new* record + pointer, not an in-place rewrite). Numbers are monotonic and never reused.
- **memory-atlas decisions already sit in the right folder and tense** (`map/decisions/NNNN-slug.md`, past tense, `supersededBy`, “supersede over edit”), but the **status enum is non-standard**: `active → unmounted` is Map-zone vocabulary, not ADR vocabulary. That is a deliberate product choice with interoperability cost.
- **RFC / design-doc ecosystems cover the *proposal* phase ADRs often skip.** Rust RFCs (~**6.6k**), React RFCs (~**5.8k**), Vue RFCs (~**4.9k**), Kubernetes KEPs (provisional → implementable → implemented / deferred / rejected / replaced), and Google design docs (create → review → implement → maintain) are consensus machines; accepted artifacts become mostly immutable.
- **memory-atlas already models design docs + plans more completely than most ADR tools** (`specs/` + `plans/` with multi-step lifecycles, ledger lint, `archive/`). That is a strength relative to pure ADR CLIs.
- **`reports/` is a coherent Ledger-side type that ADRs do not cover:** rear-view, observational, non-committing snapshots (`status: snapshot`, `YYYY-MM-DD-<topic>.md`, `covers`). Origin sample in syndcast-mind matches the memory-atlas contract. Closest external analogs are status reports / engineering journals, not ADRs or RFCs.
- **Immutable-snapshot norms align well:** once written, a report is frozen; corrections are new dated files, not edits—same spirit as “supersede over edit” and accepted-RFC immutability.
- **Gaps for `reports/` maturity:** type documented in SPEC on `feat/reports-convention`, but **`report` is not in `LIFECYCLES` / ledger linter**, reports are **not indexed** by `atlas build`, and freeze is **convention-only** (no tool enforcement of “don’t edit after first write”).
- **Index generation:** ADR ecosystems use dedicated logs (`adr-log`, Generate ADR TOC actions); memory-atlas already generates a strong **Map** index (`map/index.md`) but has no first-class **Ledger index** (decisions + specs + plans + reports).
- **Propagation to many repos:** copier-style 3-way update (**copier-org/copier** ~**3.5k** stars) is the mechanical analog; for vaults full of hand-made content, an **AI/skill “update to latest”** that treats templates/skills/config as updatable layers and local notes as sacred is the right shape—not blind overwrite.

---

## Findings

### 1. ADR ecosystems: tooling, stars, and norms

| Artifact | Role | Approx. stars (mid-2026) | URL |
|----------|------|--------------------------|-----|
| architecture-decision-record (JPH / adr org) | Template gallery + taxonomy FAQ | **~16.4k** | https://github.com/architecture-decision-record/architecture-decision-record |
| npryce/adr-tools | Bash CLI: `init`, `new`, `new -s` supersede | **~5.6k** | https://github.com/npryce/adr-tools |
| adr/madr | Markdown Architectural Decision Records template (v4.0, 2024) | **~2.3k** | https://github.com/adr/madr · https://adr.github.io/madr/ |
| thomvaill/log4brains | IDE/CLI ADR log + static knowledge base site | **~1.5k** | https://github.com/thomvaill/log4brains |
| Michael Nygard original essay | Conceptual root (2011) | n/a (essay) | https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions |
| adr.github.io tooling index | Catalog of ADR CLIs / managers | n/a | https://adr.github.io/adr-tooling/ |

**adr-tools lifecycle conventions (Nygard-shaped):**

- Files: `NNNN-title-with-dashes.md` under configurable dir (default `doc/adr`).
- Status values: **proposed / accepted / deprecated / superseded** (and rewrites of status when superseding).
- Supersession is first-class: `adr new -s 9 "…"` creates the new ADR *and* rewrites the old one’s Status to “superseded by N”.
- Numbers never reused; old records stay on disk.
- Last release of the original shell tool is old (v3.0.0, 2018), but rewrites exist in many languages (listed on adr-tooling).

**MADR (template, not primarily a CLI):**

- Filename same as adr-tools: `NNNN-title-with-dashes.md`.
- Frontmatter status comment pattern: `{proposed | rejected | accepted | deprecated | … | superseded by ADR-0123}`.
- Sections emphasize drivers, options, consequences, optional confirmation (compliance checks)—richer than Nygard’s five blocks.
- Tooling ecosystem: adr-log (index generation), log4brains, ADR Manager, Backstage ADR plugin, pyadr (explicit proposal/acceptance/rejection lifecycle CLI).

**log4brains:**

- Treats the repo as a **docs-as-code knowledge base**; publishes ADRs as a browsable site.
- Default filename style often date-based (configurable discussion around `0001` vs date)—interesting parallel to memory-atlas’s dual naming (`NNNN` for decisions, `YYYY-MM-DD` for reports/specs).

**Shared norms across the ADR world:**

1. **One decision per file.**
2. **Append-only log:** reverse via new record + status link, not silent rewrite of body.
3. **Status is decision-state**, not “mountedness.”
4. **Index / TOC is optional tooling**, not the core value; the log of files *is* the product.
5. **Store next to code** in the same repo (universal recommendation).

### 2. RFC processes and design-doc folders

| Process | Stars / scale | Lifecycle sketch | URL |
|---------|---------------|------------------|-----|
| Rust RFCs | **~6.6k** | PR discussion → FCP → merge as “active” (mostly immutable) → implement; major changes = new RFC | https://github.com/rust-lang/rfcs |
| React RFCs | **~5.8k** | Same family as Rust (PR-as-discussion, merge = accepted design artifact) | https://github.com/reactjs/rfcs |
| Vue RFCs | **~4.9k** | Inspired by React/Rust/Ember | https://github.com/vuejs/rfcs |
| Kubernetes KEPs | large mono-repo process | `provisional → implementable → implemented`, plus `deferred / rejected / withdrawn / replaced` | https://github.com/kubernetes/enhancements · https://www.kubernetes.dev/resources/keps/ |
| Google design docs | cultural standard (essay) | create/iterate → review → implement (update if pre-ship) → maintain/learn; often “constitution + amendments” in practice | https://www.industrialempathy.com/posts/design-docs-at-google/ |

**What RFCs add beyond ADRs:**

- **Social process** (PR comments, FCP, SIG ownership) before the decision is “accepted.”
- **Forward design** (what we *will* build), not only past justification.
- **Post-accept immutability:** Rust explicitly: substantial changes → new RFC + note on the old one—not rewrite history.

**What Google design docs emphasize:**

- Trade-offs and alternatives over formal schemas.
- Cross-cutting concerns (security, privacy, observability).
- Maintenance reality: docs drift; first question on an unfamiliar system is still “where is the design doc?”

**memory-atlas mapping (repo analysis):**

| External concept | memory-atlas home | Lifecycle (SPEC / `lib/ledger.mjs`) |
|------------------|-------------------|-------------------------------------|
| ADR | `map/decisions/` | `decision: active → unmounted` + `supersededBy` |
| Design doc / RFC-like design | `specs/` | `draft → approved → planned → superseded` |
| Implementation plan | `plans/` | `draft → ready → executing → done → abandoned` |
| Program / multi-session umbrella | `programs/` (optional) | `planned → active → complete \| shipped \| deferred` |
| Status / rear-view snapshot | `reports/` (optional, new) | intended: `snapshot` only |
| Map of present truth | `map/zones/`, `map/index.md` | `seeded → active → unmounted` + `verifiedAt` |

Paths inspected:

- `SPEC.md` (main + worktree `feat/reports-convention`)
- `lib/ledger.mjs` — `LIFECYCLES` for ledger types
- `atlas/map/decisions/0001-*.md` … `0003-*.md` — live ADRs
- `atlas/templates/decision.md`, `templates/notes/decision.md`
- `atlas/map/index.md` — generated Map index
- Worktree commits: `2ee09ce` (config module), `6877cc7` (init scaffold), `cce6052` (SPEC)
- Origin: `syndcast-mind/reports/2026-07-09-advisor-plans-state-of-the-build.md`

### 3. Index generation & immutable-snapshot norms

**Index generation patterns:**

| System | What is generated | Hand-edit? |
|--------|-------------------|------------|
| memory-atlas `atlas build` | `map/index.md` (zones table, verification gaps, graph coherence, attic) | Forbidden (`<!-- GENERATED … -->`) |
| adr-log / Generate ADR TOC GH Action | ADR directory `index.md` / README TOC + sometimes dependency graph | Regenerated |
| log4brains | Static site from ADRs | Generated site |
| Rust RFCs | RFC book (`generate-book.py`) from `text/` | Generated presentation of accepted texts |

**Immutable-snapshot norms (cross-ecosystem):**

- **Accepted ADR body** is effectively frozen; only Status and supersession pointers change.
- **Accepted RFC** should not be substantially rewritten; amendments or new RFCs.
- **Design docs** ideally update until ship, then freeze or link “amendments.”
- **Reports (memory-atlas / syndcast-mind):** freeze at write time; *no* supersession relationship required because a report “commits to nothing and supersedes nothing.” A later observation is a *new* dated file.

This last point is the cleanest conceptual distinction: **ADRs/RFCs change the normative world; reports only photograph it.**

### 4. Evaluating memory-atlas `reports/` against these ecosystems

#### What was added (`feat/reports-convention`)

From worktree SPEC / init / config:

- Optional module `modules.reports` default **`false`**; folder default `folders.reports: "reports"`.
- Scaffold: `atlas init --modules reports` → `reports/README.md` with contract.
- Note type: `type: report`, **`status: snapshot`**, extras `zones`, `covers`.
- Naming: **`YYYY-MM-DD-<topic>.md`** (date-first, observational).
- Taxonomy placement: Ledger, past tense; “rear-view snapshot of what something *was*.”
- README prose (init): “A report commits to nothing and supersedes nothing; once written it is frozen.”

#### Origin evidence (syndcast-mind)

Single live example observed:

- Path: `~/Repositories/syndcast/syndcast-mind/reports/2026-07-09-advisor-plans-state-of-the-build.md`
- Frontmatter matches the memory-atlas contract exactly (`type: report`, `status: snapshot`, `zones`, `covers`, dates).
- Body role banner: “REPORT. A rear-view snapshot, not a plan… derived from … It commits to nothing and supersedes nothing.”
- Includes a git commit pin in prose—good practice for observational immutability (not yet required by memory-atlas schema).

#### Fit vs ADR / RFC / design-doc families

| Dimension | ADRs (Nygard/MADR) | RFCs / design docs | memory-atlas `reports/` |
|-----------|--------------------|--------------------|-------------------------|
| Speech act | Decide / justify | Propose → decide | Observe / summarize |
| Lifecycle depth | multi-status | multi-status + process | **singleton `snapshot`** |
| Supersession | required when reversing | new RFC / replaced | **none** (new date file) |
| Filename | `NNNN-slug` | `NNNN-slug` or KEP dirs | **`YYYY-MM-DD-topic`** |
| Normative force | high (team must follow) | high after accept | **none** |
| Index expectation | ADR log optional | RFC book / KEP tracker | **not yet** |
| Closest neighbor in atlas | `decision` | `spec` (+ `plan`) | *new*; not a subtype of decision |

**Verdict:** `reports/` is **correctly separated** from decisions and specs. Forcing status reports into ADRs would violate “one decision per file” and pollute decision logs with non-decisions. Forcing them into `specs/` would invent fake lifecycles (`draft/approved/…`) for something that is never “planned.” The optional module + date naming + freeze prose is sound.

#### Gaps relative to mature ledger ecosystems

1. **Lifecycle not enforced in code.** Worktree SPEC lists `report` as a core type, but `lib/ledger.mjs` `LIFECYCLES` still has no `report: ['snapshot']`. Ledger lint walks only `specs/` and `plans/`—so even if added to `LIFECYCLES`, reports would not be linted unless walk roots expand.
2. **No templates/notes/report.md** in the notes template set (debt, decision, flow, idea, pillar, plan, program, spec, zone only)—init embeds contract in README only.
3. **No generated Ledger index section** for reports (or decisions). Map index covers zones; ADRs elsewhere auto-generate TOC logs.
4. **Freeze is social, not mechanical.** No check that `updated == created` for `status: snapshot`, or that files under `reports/` are never rewritten after first merge (could be advisory lint or CI).
5. **`decision` lifecycle vocabulary diverges from industry.** `active/unmounted` + `supersededBy` can encode supersession, but tools/docs expecting `accepted/superseded` will not map cleanly. For open-source adoption, this is a docs and possible dual-label problem.
6. **Retrieval:** reports should stay *searchable* (SPEC says so); ensure default `retrieval.excludeFromSearch` never includes `reports/` (currently excludes `drafts/`, `visuals/`). Good as designed; document explicitly.

### 5. Update / propagation mechanisms (for dozens of adopting minds)

Relevant external patterns:

| Mechanism | Stars | Behavior | Fit for atlas vaults |
|-----------|------:|----------|----------------------|
| **copier update** | ~**3.5k** (copier-org/copier) | 3-way merge: old template → new template, re-apply local diff; answers in `.copier-answers.yml` | Good for **scaffold files** (templates/, skills stubs, config schema defaults)—poor for **hand-authored notes** |
| cookiecutter | large but weak update story | one-shot generate | Insufficient alone for “update to latest” |
| adr-tools / log4brains install in each repo | n/a | tool binary, not vault content | memory-atlas already owns the CLI; don’t re-home ADRs into adr-tools |
| AI skill-driven update (proposed direction) | n/a | agent reads convention version, diffs templates/skills/SPEC changes, merges respecting local config & custom notes | **Best fit** for mixed generated + handcrafted vaults |

**Implication for memory-atlas open-source + multi-repo maturity:**

- Treat **three layers** when propagating improvements:
  1. **Toolkit** (`atlas` CLI, schema, skills) — versioned package; normal upgrade.
  2. **Scaffold** (templates, init README stubs, routine markdown) — copier-like or skill-driven merge; local edits win when conflict.
  3. **Corpus** (zones, decisions, specs, plans, **reports**) — never overwritten by update; only linters/validators evolve around them.
- Store an explicit **`atlas.conventionVersion`** (or package version stamp) in `atlas.config.json` so “update to latest” can reason about which migrations apply (analogous to copier’s `_commit` / answers file).
- Migrations should be **additive enums and optional modules** (as `reports` is), never silent renames of existing note types without a skill migration path.

### 6. Decision-lifecycle gap detail (worth fixing independently of reports)

memory-atlas today:

```text
decision: active → unmounted
```

Industry ADR minimum viable lifecycle (Nygard / MADR / GDS / practice writeups):

```text
proposed → accepted → rejected
                 ↘ deprecated
                 ↘ superseded (by NNNN)
```

memory-atlas already has:

- `supersededBy` field (good; matches supersession pointer).
- “Supersede over edit; tombstone over delete” ritual in SPEC (good).
- Section structure Context / Decision / Why (Nygard-adjacent; thinner than MADR’s options/consequences).

Mismatch:

- **`unmounted`** was designed for Map entities (zones/flows) leaving the active index attic—not for “this decision is no longer normative.”
- Missing **`proposed`** means decisions appear as decided as soon as filed (fine for solo velocity; weak for multi-agent / multi-human review).
- Missing **`rejected`** means dead proposals either vanish or look like active decisions.

This is not a bug if memory-atlas intentionally **only records accepted decisions** (draft debate lives in PRs or `drafts/`). If so, document that choice as an ADR and map:

- industry `accepted` ≡ atlas `active`
- industry `superseded` ≡ atlas `unmounted` + non-empty `supersededBy` (or keep `active` until superseded—current practice unclear)

### 7. What memory-atlas already does *better* than bare ADR tools

- **Verified present tense (Map)** with `verifiedAt` / staleness—ADR tools have no equivalent of “is this still true of the tree?”
- **Multi-type ledger** (specs + plans + debt + decisions) instead of stuffing everything into ADR status.
- **Zero-dependency CLI** (decision `0001`)—compatible with open-source install friction goals shared with agentic-sage / token-oracle.
- **Optional modules** (don’t scaffold empty dirs)—directly addresses trust erosion ADRs don’t discuss.
- **Ledger lint** for specs/plans coverage—beyond most ADR CLIs.

`reports/` extends that multi-type ledger correctly rather than overloading ADRs.

---

## Recommendations for memory-atlas

Prioritized for maturing conventions before five new minds + later open source.

### P0 — Finish `reports/` as a real type (not only folder scaffolding)

1. **Add `report: ['snapshot']` to `LIFECYCLES` and to SPEC’s Lifecycles section** (worktree SPEC taxonomy lists the type; lifecycle block still omits it). Keep dual-maintenance rule with `lib/ledger.mjs`.
2. **Extend ledger lint roots** (or a sibling linter) to walk `folders.reports` when `modules.reports` is true: require non-empty `summary`, `status === snapshot`, optional `covers` string, `zones` slug checks.
3. **Ship `templates/notes/report.md`** (and vault `atlas/templates/report.md` when dogfooding) matching the README contract; prefer date placeholder in filename guidance.
4. **Document freeze rule normatively in SPEC:** reports MUST NOT change body after first committed `status: snapshot`; corrections = new dated report; `updated` SHOULD equal `created` (advisory check OK).

### P1 — Index & discoverability (learn from adr-log without becoming log4brains)

5. **Generate a Ledger subsection or companion index** (e.g. extend `map/index.md` carefully within the 200-line budget, *or* emit `map/ledger.md` generated):
   - recent reports (by date desc, top N)
   - active decisions (link list)
   - optional counts of specs/plans by status  
   Prefer a separate generated file if Map index is already zone-heavy.
6. **Encourage commit pin in report bodies** (as syndcast-mind does) via template stub: `**Commit:** \`sha\`` under the headline—strengthens “snapshot of what *was*.”

### P1 — Align decision vocabulary with ADR industry (choose deliberately)

7. **Either:**
   - **(A) Map and document:** publish a one-page “ADR interop” note: `active` = accepted; set `supersededBy` and status `unmounted` when superseded; rejected proposals never enter `map/decisions/` (stay in PR/`drafts/`). *Lowest code churn.*  
   - **(B) Expand enum:** `proposed | accepted | rejected | superseded | unmounted` (or replace `active` with `accepted`). *Better OSS familiarity; needs migration skill for existing vaults.*  
   Recommend **A now, B only if multi-human review becomes common across the five new repos.**

8. **Optional MADR-lite body sections** in `decision` template: `## Options considered`, `## Consequences`—keep frontmatter thin; improves review quality without depending on madr package (zero-dep constraint).

### P2 — Do not invent a second ADR tool

9. **Do not vend adr-tools or log4brains as runtime deps.** Re-implement only the *lifecycle rituals* needed (`atlas decision new`, optional supersede helper) if DX demands it—still zero runtime deps.
10. **Keep `reports/` optional and off by default**—correct; status snapshots are high-volume noise for small repos. Enable for multi-session backlogs (syndcast-scale).

### P2 — Update mechanism design (for many adopting repos)

11. **Layered update contract** (document in ADOPTION / future `atlas update` skill):
    - upgrade CLI package freely;
    - merge scaffold (templates, skills, routines) with local-wins conflicts;
    - never rewrite corpus notes (zones/decisions/specs/plans/reports);
    - run `atlas check` after update; report migration advisories.
12. **Stamp `conventionVersion`** in config (semver of SPEC or toolkit) so agents know which migrations apply—copier’s answers/`_commit` analog without requiring Python/copier in the critical path.
13. **Migrations for additive types** (`report`) should be: enable module flag + scaffold README if missing; never rewrite existing files.

### P3 — Open-source positioning

14. In public docs, **name the relatives honestly**: “decisions ≈ Nygard ADRs; specs ≈ design docs / RFCs; reports ≈ dated engineering status snapshots; zones ≈ verified architecture cards (unique).” That one sentence sells the multi-type ledger.
15. Link to Nygard + MADR as *inspirations*, not dependencies—avoids template lock-in and preserves zero-dep story.

---

## Open questions

1. **Should `reports/` ever participate in supersession graphs?** (e.g. `supersedes: [[2026-07-01-foo]]` for “this snapshot replaces the previous reading”)—or is pure chronological append always enough?
2. **Is a singleton status `snapshot` enough long-term**, or will users want `draft` reports before freeze (risk: unfreezes the type)?
3. **Decision enum:** stay with `active/unmounted` for Map consistency, or migrate to industry `accepted/superseded` for OSS adopters?
4. **Where do rejected RFCs live** if they never become decisions—`drafts/`, closed PRs only, or a `proposals/` module?
5. **Index budget:** put reports/decisions into `map/index.md` vs separate generated `map/ledger.md` vs no generation (grep only)?
6. **Should ledger lint expand beyond specs/plans** to all past-tense types (decision, report) for open-source quality bars?
7. **AI update skill ownership:** live in memory-atlas repo as `skills/atlas-update/`, or as a cross-repo armory skill shared with agentic-sage / token-oracle family?
8. **Multi-repo minds:** when five new repos each have reports, is cross-repo aggregation ever needed, or is per-repo freeze enough forever (SPEC currently defers parent-atlas aggregation)?

---

## Sources (web research)

- Nygard, “Documenting Architecture Decisions” — https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions  
- npryce/adr-tools — https://github.com/npryce/adr-tools (~5.6k★)  
- architecture-decision-record gallery — https://github.com/architecture-decision-record/architecture-decision-record (~16.4k★)  
- MADR — https://github.com/adr/madr (~2.3k★), https://adr.github.io/madr/  
- log4brains — https://github.com/thomvaill/log4brains (~1.5k★)  
- ADR tooling catalog — https://adr.github.io/adr-tooling/  
- Rust RFCs — https://github.com/rust-lang/rfcs (~6.6k★)  
- React RFCs — https://github.com/reactjs/rfcs (~5.8k★)  
- Vue RFCs — https://github.com/vuejs/rfcs (~4.9k★)  
- Kubernetes KEPs — https://www.kubernetes.dev/resources/keps/  
- Design Docs at Google — https://www.industrialempathy.com/posts/design-docs-at-google/  
- copier updating — https://copier.readthedocs.io/en/stable/updating/ · https://github.com/copier-org/copier (~3.5k★)  

## Sources (local, read-only)

- memory-atlas `SPEC.md`, `lib/ledger.mjs`, `lib/init.mjs` (worktree), `schema/atlas.config.schema.json` (worktree), `atlas/map/decisions/*`, `atlas/map/index.md`, `templates/notes/decision.md`  
- Branch `feat/reports-convention` commits `2ee09ce`, `6877cc7`, `cce6052`  
- syndcast-mind `reports/2026-07-09-advisor-plans-state-of-the-build.md`
