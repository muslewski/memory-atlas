# S4 — syndcast-mind ↔ memory-atlas generalizability audit

**Date:** 2026-07-17  
**Role:** repo analyst (read-only)  
**Sources:**  
- Origin vault: `~/Repositories/syndcast/syndcast-mind` (+ generator scripts under `syndcast/scripts/`)  
- Extracted toolkit: `~/Repositories/memory-atlas` (`main` @ `ade440e` and worktree branch `feat/reports-convention` @ `cce6052`)  
- **Out of scope:** `syndcast-mind/visuals/` and any presentation layer over Atlas data  

---

## Summary

- **memory-atlas is a faithful extraction of the core Mind contract**, not a thin rename: Map/Ledger/Vision tiers, zone anchors (`owns.globs` + optional testids/tools/routes), `verifiedAt` freshness, generated `map/index.md`, graph-coherence warnings, ledger lifecycle lint, stamp-without-blanket, SessionStart status hook, and the orient → recollect ritual are all present and often *stricter* than syndcast.
- **Major upgrades already beyond syndcast-mind:** zero runtime deps + YAML-subset parser; `atlas.config.json` folder/module/anchor indirection + kill switch; `status: seeded` + legal `unverified` encoding; optional modules scaffolded only when requested; portable CLI (`atlas init|build|check|stamp|status|routine`); `program` as a first-class type; richer spec/plan lifecycles (`approved`/`ready`).
- **`feat/reports-convention` lands the reports/ optional module** (config + init README stub + SPEC taxonomy row) but is incomplete relative to syndcast’s live report: no `templates/notes/report.md`, no `LIFECYCLES.report`, ledger does not walk `reports/`.
- **Largest production-proven gaps still unported:** ownership SSOT (`findOwnershipConflicts` / dup-glob-file), corpus-quality gate (summary length, `##` headers, body wikilink orphans, broken body links), and the body-level link graph that syndcast’s `mind:check:corpus` enforces.
- **Coordination layer is specified but thin:** BACKLOG claim/`Lands` convention + template exist; syndcast’s multi-track BACKLOG discipline (A/B/C sequential + D parallel, advisor-plans pointer) is product process, not toolkit.
- **Syndcast-specific and must not ship as defaults:** dual auth/billing/workspace zones, iron laws, tool-registry `owns.tools` defaults, Payload/Next route layout, autopilot “docs→main / code→branch”, mind-skin/visuals, `advisor-plans/` outside the vault, product `reference/CONVENTIONS.md` / `ARCHITECTURE.md` corpus, Ouroboros self-zone rules as hard-coded globs.
- **Brownfield friction for re-adopting syndcast (and any rich vault):** decision `zones: [[slug]]` vs bare slugs; syndcast zones lack `seeded`/`unverified`; empty-string `verifiedAt` illegal in atlas; `entity` cut to extension-only; `human-drafts/` → `drafts/`.
- **Update mechanism is the strategic hole for “5 new repos → dozens”:** package can ship via npm, but **convention surface** (skills, templates, config schema, vault README stubs, routines) has no 3-way merge / “update to latest” path that respects local customizations.
- **Prioritized port backlog (excl. visuals):** finish reports properly → ownership SSOT → corpus-quality as opt-in module → report template + lifecycle → update skill/CLI → bases/Home optional scaffolds → decision-number uniqueness → zones-field wikilink normalization.
- **Sibling family context (local repos, pre/early open-source):** `agentic-sage`, `token-oracle`, `status-herald`, `memory-atlas` — loosely coupled file contracts only; no shared code. Public GitHub targets: `github.com/muslewski/memory-atlas`, `…/agentic-sage` (star counts not load-bearing for this audit; all are early / private-or-nascent).

---

## Findings

### A. What memory-atlas already ports faithfully

Evidence base: `memory-atlas/SPEC.md`, `lib/{validate,resolvers,ledger,stamp,status,init,config,notes,frontmatter}.mjs`, `bin/atlas.mjs`, `templates/notes/*`, skills under `skills/`, dogfood vault `atlas/`. Origin: `syndcast-mind/map/README.md`, `scripts/build-map.ts`, `scripts/check-ledger-frontmatter.ts`, `scripts/mind-status.ts`, CLAUDE.md artifact table.

| Origin concept | Origin path | memory-atlas landing | Fidelity notes |
|---|---|---|---|
| Map vs Ledger vs Vision | `map/`, `specs|plans|decisions|tech-debt/`, `vision/` | SPEC § vault layout + note types | Cleaner three-tier prose; Vision optional |
| Zone cards + `owns.*` | `map/zones/*.md`, templates/zone.md | templates/notes/zone.md + validate | Same anchors; testids/tools/routes **config-gated** (syndcast hardcodes src/ + registry paths) |
| `:(exclude)` / `:!` pathspecs | build-map.ts `isExcludePathspec` | validate.mjs + resolvers | Faithful |
| `verifiedAt` freshness | build-map + mind-status | validate + stamp + status | **Stronger:** only `unverified` \| SHA; no empty string / ISO date; no blanket stamp |
| Generated index | `map/index.md` via build-map | `atlas build` / `renderIndex` | Same sections: table, verification gaps, graph coherence, attic |
| Graph coherence (soft) | build-map Phase 3 | validate `graphPass` | Dangling related/sources/depends/advances/hosts; advances↔realizedBy reciprocity; date-prefix aliasing |
| Ledger frontmatter lint | check-ledger-frontmatter.ts | lib/ledger.mjs | specs+plans walk; status enums; summary required; zones→zoneSlug check |
| SessionStart one-liner | mind-status.ts | `atlas status --hook` | Same fail-open contract; config kill switch |
| Recollection ritual | CLAUDE.md / navigating skills | skills/atlas-recollection + SPEC lifecycle ritual | Portable wording; no visuals/backlog-mark steps |
| Writing-for-retrieval | `.claude/skills/writing-for-retrieval` | skills/writing-for-retrieval | Portable; enforcement left to future corpus lint |
| Nav skill | nav-retrieval + navigating-syndcast | skills/atlas-nav | Generalized; drops absolute navidx paths |
| Templates for core types | syndcast-mind/templates/* | templates/notes/* | debt/decision/flow/idea/pillar/plan/spec/zone + **program** |
| Tech-debt one shape | type: debt + severity/effort | same | Explicit “ONE convention” in SPEC |
| Supersede / unmount | map README + practice | SPEC lifecycle ritual | Normative |
| Optional flows/programs/vision/reference/archive | present as dirs in syndcast | modules.* defaults false | **Improvement:** empty modules not scaffolded by default |
| BACKLOG claim + Lands | BACKLOG.md + CLAUDE.md | modules.backlog + BACKLOG_TEMPLATE + SPEC Coordination | Skeleton only — enough for greenfield |
| Retrieval exclude drafts/visuals | check-corpus IGNORE visuals | retrieval.excludeFromSearch | Faithful; visuals reserved name, not standardized |
| Interop with superpowers/spec-kit | CLAUDE pipeline language | SPEC Interop | Documented producers; no hard dependency |
| Sibling adapters | n/a (syndcast-only) | examples/with-agentic-sage, with-token-oracle | File-contract-only coupling |

**Where atlas is already better than the origin (generalizability wins):**

1. **Config surface** — `atlas.config.json` + JSON schema: vaultDir, folder remaps, modules, anchors, hooks, routines, skills.dir. Syndcast hardcodes `syndcast-mind/` and resolver roots in TypeScript.
2. **`seeded` / `unverified` honesty** — syndcast zone lifecycle is effectively `active|unmounted` with empty `verifiedAt` treated as stale; atlas forbids silent “looks active” cards.
3. **Zero dependency** — origin uses `gray-matter`/`js-yaml`; atlas ships a deliberate YAML subset (`0002-yaml-subset-not-yaml`).
4. **CLI productization** — `atlas init` additive re-run, dry-run patterns in tests, kill switch `enabled: false`, `--strict` freshness, `--ledger-only`.
5. **program type** — used heavily in syndcast (`programs/`, 16 files) but missing from origin `STATUS_BY_TYPE` and origin templates; atlas codified it.

### B. What is missing or incomplete in memory-atlas

#### B1. Reports convention (`feat/reports-convention` — check complete)

| Piece | Branch state | Origin evidence |
|---|---|---|
| Optional module `modules.reports` + `folders.reports` | ✅ config, schema, template config, defaults false | CLAUDE.md taxonomy row; `syndcast-mind/reports/` |
| `atlas init --modules reports` creates dir + README stub | ✅ | — |
| SPEC vault layout + note-type row (`type: report`, `status: snapshot`, `zones`, `covers`, `YYYY-MM-DD-topic.md`) | ✅ SPEC.md | Live note: `reports/2026-07-09-advisor-plans-state-of-the-build.md` |
| `templates/notes/report.md` | ❌ not present | Origin has no template either, but live note defines shape |
| `LIFECYCLES.report` / ledger walk of `reports/` | ❌ ledger still specs+plans only | Origin ledger also does **not** lint reports; only CLAUDE taxonomy |
| Example report in dogfood vault | ❌ intentionally skipped | 1 real report in syndcast-mind |
| Writing-for-retrieval skill type list | still omits `report` | — |

**Verdict:** module plumbing is correct and shippable; **convention depth is README-stub level**. For five new minds that will use rear-view “state of the build” snapshots, finish the note type (template + optional lifecycle allowlist) before treating reports as “done.”

#### B2. Production-proven gates not ported

| Gap | Origin path | Why it matters for multi-repo maturity |
|---|---|---|
| **Ownership SSOT** — no two zones may claim the same expanded file / route / testid / tool | `scripts/lib/corpus-quality.ts` → `findOwnershipConflicts`; hard gate in `mind:check:corpus` | Without it, zone cards become soft documentation; large repos drift into overlapping globs |
| **Corpus quality** — summary non-empty + max length, ≥1 `##` header, dead globs, body wikilink resolution, orphans | `check-corpus-quality.ts` + corpus-quality lib (~163 LOC pure) | Retrieval readiness; atlas skills teach this but nothing enforces |
| **Body wikilink graph** vs frontmatter-only | corpus walks body `[[links]]`; atlas graphPass scans selected frontmatter fields only | Most human links live in prose sections |
| **Inbound orphan detection** | checkOrphans | Catches dead zones nobody links |
| **Bases / Home scaffolds** | `bases/{map,ledger,vision}.base`, `Home.md` | Optional Obsidian UX; SPEC lists them as conveniences but init does not scaffold |
| **Decision number uniqueness** | discipline only in origin; ADOPTION.md says atlas does not enforce | Multi-author fleets will collide |
| **Index size budget enforcement** | SPEC SHOULD ≤200 lines / 25 KB; not implemented in validate.mjs | syndcast index already huge (~50 zones with long summaries) — budget is aspirational |
| **`hosts:` documented as first-class relationship** | zone body + graph scan in atlas | validate scans `hosts` but SPEC note-type table omits it; only 1 syndcast zone uses it |
| **Skill install automation** | ONRAMP says “copy skills into repo” | No `atlas init --skills` / npm postinstall story |
| **`atlas update` / version pin / 3-way convention upgrade** | nowhere | Blocking for “dozens of adopting repos” goal |
| **Program / debt / idea / report / vision in ledger lint** | only specs+plans | Origin same limitation; multi-repo hygiene wants optional broader lint |
| **CI recipe as first-class** | syndcast `pnpm mind:check` in `check` script | docs mention CI; no reusable GH Action / example workflow in package `files` |

#### B3. Lifecycle / frontmatter deltas (not “missing,” but migration hazards)

| Topic | syndcast-mind | memory-atlas |
|---|---|---|
| Zone status | `active` → `unmounted` (seeded absent) | `seeded` → `active` → `unmounted` |
| verifiedAt | often quoted SHA; `""` treated stale | `unverified` required when seeded; SHA required when active |
| Spec status | draft → planned → superseded | + `approved` |
| Plan status | draft → executing → done → abandoned | + `ready` |
| Program | used in corpus, not in STATUS_BY_TYPE | first-class lifecycle |
| Entity | template + STATUS_BY_TYPE; **0 files** | cut to extension-only (correct cut) |
| Decision `zones:` | often `[[auth]], [[data-spine]]` (wikilink form) | bare slug must match zone id set |
| Drafts folder | `human-drafts/` | `drafts/` |

### C. What is syndcast-SPECIFIC and must NOT be generalized

These belong in adopting-repo config, vault content, or separate products — **not** in memory-atlas defaults or core SPEC mandates.

| Item | Why syndcast-only | Safe generalization pattern |
|---|---|---|
| **visuals/ / mind-skin / MDX digests / Excalidraw kit** | Presentation product on :4555; Ouroboros rule; excluded from this audit | Keep reserved name; separate package later |
| **Autopilot: docs→main, code→feature branch, auto mind-skin** | Repo process in CLAUDE.md | Optional “routines” or host CLAUDE snippets, never core |
| **50 product zones** (auth, billing-credits, tool-registry, …) | Domain content | Seeded per repo |
| **`owns.tools` default root** under `src/features/project-workspace/registry/domains/` | Registry architecture | anchors.tools.root in config |
| **`owns.routes` under `src/app/**` App Router** | Next.js | anchors.routes.fileGlobs |
| **`data-testid` Playwright conventions** | Testing standard | anchors.testids.pattern |
| **Iron laws / pending-clips / segments pool** | Product invariants | zone `invariants[]` content |
| **Dual auth / channels-as-orgs / Stripe credits** | Architecture decisions | map/decisions content |
| **`advisor-plans/` at repo root** | Implementer plan corpus outside vault | Host process; may link from BACKLOG |
| **reference/CONVENTIONS.md, ARCHITECTURE.md, TESTING.md** | App AI manual, not Mind schema | optional `reference/` module content |
| **`navigating-syndcast` skill** | Product entry ramp | Replace with atlas-nav + thin CLAUDE block |
| **Hardcoded vault name `syndcast-mind`** | Brand | `vaultDir` + structure detection |
| **Ouroboros hard-coded globs** for `the-mind` zone | Meta self-reference | Document as pattern for any “atlas tooling” zone |
| **gray-matter / pnpm mind:\* scripts in monorepo package.json** | Host wiring | npx atlas / package bin |
| **Vision pillar constellation + Home MoC** | Product strategy narrative | optional vision module |
| **Archive/raw-prompts/llms.txt dumps** | Local hygiene | not core |

### D. Prioritized port-backlog (exclude visuals/)

Effort: **S** ≤0.5d · **M** 1–2d · **L** 3–5d · **XL** >1w.  
Value: **P0** blocks multi-repo maturity · **P1** high for quality at scale · **P2** nice for Obsidian/DX · **P3** polish.

| # | Item | Source path(s) | Effort | Value | Notes |
|---|---|---|---|---|---|
| 1 | **Finish reports type** — `templates/notes/report.md`; add `report: ['snapshot']` to LIFECYCLES; optional ledger include when `modules.reports`; skill type list | `syndcast-mind/reports/2026-07-09-…md`; branch `feat/reports-convention` | S | P0 | Branch is 80% done; merge after template+lifecycle |
| 2 | **Ownership SSOT check** (dup file/route/testid/tool) as hard error under `atlas check`, config kill-switch | `scripts/lib/corpus-quality.ts` `findOwnershipConflicts` | M | P0 | Core differentiator at 10+ zones; keep expandGlobs single git call for excludes |
| 3 | **Corpus-quality module** (`atlas check --corpus` or `check.corpus: true`) — summary ≤N, `##` headers, body links, orphans | `scripts/check-corpus-quality.ts`, `scripts/lib/corpus-quality.ts` | M–L | P0 | Port pure checks; inject resolvers; default off for brownfield |
| 4 | **Update mechanism v1** — `atlas update` dry-run + skill `atlas-update` (3-way: upstream template / local file / base version); never clobber vault notes | *new*; patterns: copier, npm package files, codemod skills | L–XL | P0 | See Recommendations; blocks “dozens of repos” |
| 5 | **Pin/publish version surface** — `atlas --version`, config `atlasVersion`, CHANGELOG-driven migration notes | package.json, SPEC Versioning | S | P0 | Prerequisite for update |
| 6 | **Normalize `zones:` wikilink form** on lint (`[[auth]]` → `auth`) | origin decisions; ledger.mjs | S | P1 | Unblocks syndcast re-adoption & messy ADRs |
| 7 | **Optional ledger sections** — debt, ideas, programs, reports via config | ledger.mjs; origin only specs/plans | S–M | P1 | Default keep specs/plans-only |
| 8 | **`hosts:` in SPEC** as graph-only inverse of depends | the-mind.md ownership section; validate already scans | S | P1 | Document; don’t enforce SSOT on hosts |
| 9 | **Skill install on `atlas init --skills`** | docs/ONRAMP.md manual copy; skills/* | S | P1 | Copy into config.skills.dir |
| 10 | **Example CI workflow** (GitHub Action) running `atlas check` | syndcast `pnpm mind:check` | S | P1 | Ship under examples/ or docs/ |
| 11 | **Bases + Home optional module** | `bases/*.base`, `Home.md` | M | P2 | Templates only; no Bases runtime |
| 12 | **Decision id uniqueness lint** | ADOPTION.md discipline | S | P2 | Soft warn then hard |
| 13 | **Index budget soft-trim** | SPEC § generated index | M | P2 | Summaries first; needed when zone count ≫ dogfood’s 5 |
| 14 | **Broader graphPass** (body links optional) | corpus broken-link | M | P2 | Overlaps #3 |
| 15 | **BACKLOG parser helper** for companion tools | SPEC Coordination machine-parseability | M | P2 | Helps sage/oracle; not required for vault truth |
| 16 | **Imperative-phrasing lint** in map/ | SPEC Security stretch | M | P3 | Listed as v0.2 candidate already |
| 17 | **entity extension docs + config.types** | templates/entity.md; SPEC cut | S | P3 | Only if demand appears |
| 18 | **Syndcast migration cookbook** (seeded retrofit, zones: rewrite, scripts→atlas CLI) | whole origin | M | P1 | Not a feature — docs/ADOPTION section; enables dogfood switch |

**Explicitly excluded from backlog:** anything under `syndcast-mind/visuals/`, mind-skin skill, MDX kit, hero stock, Connections panel, autopilot visual commits.

---

## Recommendations for memory-atlas

### R1. Ship reports as a complete optional type (this week)

Merge `feat/reports-convention` only after:

1. `templates/notes/report.md` matching the live syndcast frontmatter (`type: report`, `status: snapshot`, `zones`, `covers`, summary, dates).  
2. `LIFECYCLES.report = ['snapshot']` so a future ledger expansion doesn’t reject the type.  
3. SPEC lifecycle section lists report (today only the taxonomy table mentions it).  
4. Decide: ledger walks `reports/` only when module enabled (recommended) vs never (origin parity). Prefer **when enabled** — free correctness.

### R2. Port ownership SSOT before the five new repos grow zones

Five greenfield repos will each start with 4–8 zones; without SSOT, agents will happily double-claim `src/**`. Port `findOwnershipConflicts` into `lib/validate.mjs` or `lib/corpus.mjs`:

- Hard error by default when two mounted zones claim the same expanded path / testid / tool / route.  
- Config: `check.ownershipSsot: true` (default true for new init; allow false for brownfield import).  
- Reuse exclude-pathspec-aware expansion already in resolvers.

### R3. Corpus quality as opt-in gate, not core always-on

Brownfield vaults (and syndcast itself) will fail a sudden body-link/orphan hard gate. Mirror origin’s tiering:

- Structural (summary, headers, globs, ownership) → fail.  
- Freshness → warn unless `--strict`.  
- Expose as `atlas check --corpus` and/or `check.corpusQuality: false` default.

This is the highest-ROI port from `scripts/lib/corpus-quality.ts` after ownership.

### R4. Design the update mechanism now (before repo #3)

**Problem:** `npm i -g memory-atlas@latest` updates the **binary**, not the **vendored convention surface** (skills copied into `.claude/skills`, note templates under `vault/templates`, ONRAMP snippets in CLAUDE.md, routines, config schema additions). Local minds will diverge; hand merges will fail at dozens of repos.

**Recommended shape (AI-first, copier-inspired, config-respecting):**

| Layer | What updates | How local customizations survive |
|---|---|---|
| **A. Package binary** | `lib/*`, `bin/atlas.mjs` | Normal semver; `engines`, `atlasVersion` in config |
| **B. Declarative scaffolds** | default templates, routines, skill SKILL.md, schema | Three-way: `upstream@old` / `upstream@new` / `local`. If local == old → fast-forward; if local diverged → emit conflict report, never overwrite |
| **C. Config schema** | new keys only | Deep-merge defaults (already the config loader style); never rewrite user’s modules/anchors |
| **D. Vault notes** (zones, decisions, specs…) | **never auto-edited** by update | Out of band; recollection only |
| **E. Agent skill `atlas-update`** | orchestrates A–C, explains diffs, applies safe patches | Human/agent gate on conflicts |

Concrete deliverables:

1. `atlas update --check` — print package version vs `atlas.config.json` `atlasVersion`, list scaffold files that differ from package templates (hash or embedded `templateId`/`templateVersion` frontmatter on scaffold files only).  
2. `atlas update --apply --dry-run` — unified diff.  
3. Skill prompt that forbids editing `map/zones/**`, `specs/**`, etc.  
4. Document “protected paths” vs “managed scaffolds” in SPEC.  
5. Align with sibling family SessionStart fail-open rules so update never blocks sessions.

Avoid pure codemod-only approaches for prose skills; prefer **agent-mediated 3-way** with mechanical hash for identical files.

### R5. Greenfield defaults for the five new repos

For each new repo:

```text
npx memory-atlas init --modules reports,backlog,drafts
# enable flows/programs/vision only when first needed
atlas init --skills   # once R9 exists
# seed 4–8 zones status:seeded verifiedAt:unverified
# wire atlas check in CI without --strict until stale≈0
```

Do **not** copy syndcast’s module set wholesale (vision constellation, 50 zones, reference manuals).

### R6. Optional: re-dogfood syndcast as a brownfield adopter later

Treat syndcast as the stress test after R1–R4, not before:

- Script migration: `verifiedAt: ""` → SHA or unverified; zones to seeded/active honestly.  
- Normalize decision `zones:` to bare slugs.  
- Replace `pnpm mind:build` with `atlas build` via thin wrappers.  
- Keep visuals/ as a separate package forever.  
- Ownership SSOT may need a cleanup pass on overlapping globs before enabling hard gate.

### R7. Documentation priorities for open-source readiness

Already strong: README, SPEC, CONFIG, ONRAMP, ADOPTION, LAUNCH-CHECKLIST, examples. Add:

1. **UPGRADING.md** (pairs with R4).  
2. **Migration from syndcast-mind** appendix (R6).  
3. **Module cookbook** — when to turn on reports/backlog/programs.  
4. Public comparison table already good; keep “not automatic memory capture” as the headline differentiator.

### R8. What not to port

- Entity type as core (zero usage; SPEC cut is correct).  
- Any visuals pipeline.  
- Autopilot / dual-worktree docs landing policy.  
- Product-specific anchor defaults.  
- Full BACKLOG multi-track process from syndcast (A/B/C/D + advisor-plans) as mandatory — keep machine-parseable table contract only.

---

## Open questions

1. **Should `atlas check` default-on ownership SSOT for greenfield init while default-off when detecting a pre-existing vault?** (Recommended: yes.)  
2. **Reports lifecycle:** forever `snapshot` only, or allow `superseded` when a newer report replaces an old one? Origin freezes forever and relies on filename dates.  
3. **Ledger breadth:** expand lint to debt/programs/reports now, or wait until a second adopter asks?  
4. **Update channel:** npm-only vs git submodule vs “vendor copy of templates/” inside each repo — which is the primary distribution for skills (Claude Code wants them under `.claude/skills`)?  
5. **Will syndcast re-home generator scripts onto memory-atlas**, or remain a permanent fork with extra corpus gates? That decision drives whether ownership/corpus land in core or as an official “strict” profile.  
6. **Config `folders` remapping** is powerful — do we need a test matrix for non-default folder layouts before 1.0?  
7. **Decision numbering:** enforce globally, or per-prefix namespaces for monorepos?  
8. **`hosts:`** — document only, or promote to a soft reciprocal check with `depends` (like advances/realizedBy)?  
9. **Index budget:** enforce with summary truncation in `renderIndex`, or drop the SHOULD from SPEC until zone counts force it?  
10. **Cross-repo parent atlas** (SPEC non-goal) — still deferred when 5 sibling product repos exist, or does the owner want a private aggregator sooner?

---

## Appendix — evidence snapshot

| Corpus / tool | Count or version |
|---|---|
| syndcast zones / decisions / specs / plans / programs / tech-debt / reports | 50 / 128 / 348 / 317 / 16 / 163 / 1 |
| memory-atlas dogfood zones | 5 (cli, config, vault-io, verifier-core, agent-onramp) |
| memory-atlas package | `0.1.0`, Node ≥20, 0 runtime deps, MIT |
| Origin generator scripts | `build-map.ts` 346 LOC; `check-corpus-quality.ts` 164; `corpus-quality.ts` 163; `check-ledger` 79; `mind-status` 47 |
| Atlas lib+bin | ~2070 LOC across lib/*.mjs + bin |
| Reports branch commits | `2ee09ce` config → `6877cc7` init → `cce6052` SPEC |
| Sibling local repos | agentic-sage, token-oracle, status-herald, memory-atlas under `~/Repositories/` |

---

*End of report. Read-only audit; no repository mutations beyond this file.*
