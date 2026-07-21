# S3 — syndcast-mind content quality audit

**Subject:** qualitative content audit of `syndcast-mind/` (first real Atlas implementation)  
**Read-only corpus:** `/home/kento/Repositories/syndcast/syndcast-mind` (app repo checkout `04259489…`, 2026-07-17)  
**Out of scope for porting:** `visuals/` (structure noted only)  
**Audience:** memory-atlas maturation (conventions, tooling, OSS, multi-repo update mechanism)

---

## Summary

- **The Map earns its keep.** ~50 zone cards + 3 flows + generated `map/index.md` are the high-value present-tense core: structured `owns` / `invariants` / `verifiedAt`, generator-checked against code, and the real differentiator vs “agent memory dump.”
- **The Ledger is enormous and mostly frozen cargo.** ~352 specs + ~317 plans + ~128 decisions + ~179 debt notes; **done plans alone ≈ 256k lines** (median huge; top plan 6k lines). Retrieval noise is the dominant quality problem, not missing architecture prose.
- **`verifiedAt` works as designed but discipline lags:** at last `mind:build`, **36 zones ⚠ stale vs 13 ok**. Staleness is real (e.g. `blueprints` globs moved since `ebc59c14`); advisory-only means trust erodes without a recollection ritual.
- **`reports/` is a strong new convention** (1 note, `type: report`, `status: snapshot`): rear-view, dated, commit-stamped, explicitly non-normative. memory-atlas SPEC currently omits it — worth promoting as an optional module.
- **Dual homes and dual type tags pollute SSOT:** `tech-debt/` (163) vs `map/tech-debt/` (16, disjoint); frontmatter `type: debt` (72) vs `type: tech-debt` (62) vs none (45). memory-atlas already says ONE convention — enforce it.
- **Dead links and orphans are real but graded:** ~608 broken wikilink *occurrences* / ~223 unique targets (many false positives from prose, skill names, vision path typos); ~525 notes never linked as targets (mostly done plans/specs). Graph coherence warnings on zone `sources` are higher-signal.
- **Zone quality is uneven:** best cards are 60–150 lines with fixed sections + enforceable invariants; worst are **changelog zones** (`agent-catalog` 628 lines / ~53kB of dated “Leg N” appendices) or **summary walls** (`agentic-lifecycle` summary **1323 chars** vs corpus cap 500).
- **Decision numbering collisions** (9 numbers shared by 2–3 files, e.g. three `0013-*`) undermine ADR identity; only gap in 0–117 is `0018`.
- **Optional modules that stay empty rot trust** (`map/entities/` unused; `bases/` empty; `raw-prompts/` empty) — aligns with memory-atlas “don’t scaffold empty.”
- **Lessons for a generalized tool:** encourage Map+recollection+enforcedBy; prevent ledger bloat, dual debt, changelog-in-zone, skill/zone restatement, and silent dual type taxonomies. `visuals/` is a separate product surface (~35k files incl. `node_modules`) — keep it forever out of the Atlas standard.

---

## Findings

### 1. Corpus shape (what “content quality” is working against)

Approximate inventory under `syndcast-mind/` (`.md` counts; `visuals/` excluded from quality corpus per Ouroboros / `check-corpus-quality.ts`):

| Area | ~Count | Role / tense |
|------|--------|--------------|
| `map/zones/` | 50 | present — architecture as-built |
| `map/flows/` | 3 | present — cross-zone journeys |
| `map/decisions/` | 128 | past — ADRs |
| `map/tech-debt/` | 16 | until-resolved (second home) |
| `map/index.md` | 1 generated | freshness + verification dashboard |
| `specs/` | 352 | past — design docs |
| `plans/` | 317 | past — implementation plans |
| `tech-debt/` | 163 | until-resolved (primary home) |
| `programs/` | 16 | umbrella initiatives |
| `ideas/` | 24 | evergreen seeds |
| `vision/` | 27 | evergreen pillars |
| `reports/` | 1 | rear-view snapshot (new) |
| `reference/` | 22 | long-form ops/reference |
| `archive/` | 7 | retired specs/plans (underused) |
| `human-drafts/` | 5 | scratch; agent-excluded by convention |
| `BACKLOG.md` | 1 (~290 lines) | multi-session coordination |
| `visuals/` | 869 md + ~35k files total | presentation layer (out of scope) |

**Frontmatter `type:` distribution (approx, vault walk excluding `visuals/`):**  
spec 352 · plan 282 · decision 107 · debt 73 · tech-debt 62 · *(none)* 54 · zone 51 · pillar 28 · idea 22 · program 16 · reference 12 · flow 4 · report 1 · entity 1 (template only).

**Status soup (not a clean lifecycle):** planned 262 · done 241 · active 175 · open 150 · accepted 79 · draft 57 · approved 31 · plus `ready`, `in-progress`, `executing`, `shipped`, `built`, `resolved`, `partially-addressed`, `snapshot`, etc. Specs lean `planned` (259); plans lean `done` (241). Template comments sometimes leaked into status strings (e.g. `active        # active | promoted | archived`).

**Implication:** quality is not “write more notes.” Quality is **ranking and discipline** so agents open the Map first and treat the Ledger as append-only history with archival gravity.

---

### 2. Zone cards — what earns keep vs noise

#### 2.1 Structure that works (encourage)

Canonical template (`templates/zone.md`) and most zones share:

```yaml
type: zone
summary: "..."
status: active | unmounted
verifiedAt: "<sha>"
owns: { routes, testids, globs, tools }
depends / invariants[{rule, enforcedBy}] / skills / advances / related / sources
```

Body sections (counts out of 50):

| Section | Presence |
|---------|----------|
| `## What this is` | 49/50 |
| `## Anchors` | 45/50 |
| `## Invariants` | 43/50 |
| `## Lineage` | 45/50 |

**Size distribution:** median zone ~110–120 lines; range **55** (`clip-agents`) → **628** (`agent-catalog`); total ~7k lines across all zones — small relative to the ledger.

**High-value patterns observed:**

1. **Tight pure modules** — e.g. `map/zones/clip-agents.md` (55 lines): one-sentence summary, four invariants with `enforcedBy: test:…`, pure-module claim, lineage without diary. This is the gold standard for agent retrieval.
2. **Substrate iron-law zones** — e.g. `billing-credits.md`, `pending-clips.md`, `segments-pool.md`: invariants that encode product law (“AI may propose but never accept”, “plans.ts is SSOT”, “CreditLedger append-only”) with decision and/or test anchors.
3. **`owns.globs` as SSOT boundary** — pathspecs including `:(exclude)…` (auth, agent-catalog) teach the generator *and* humans what is *not* owned. memory-atlas should keep exclude pathspecs as first-class.
4. **`enforcedBy` as honesty signal** — corpus analysis of zone `enforcedBy` refs: ~123 test anchors, ~115 path/decision, ~5 lint, plus residual. Index still lists ~11 invariants with *empty* `enforcedBy` (verification gaps). Prefer test/lint over “debt note as enforcement.”
5. **Unmounted attic, not delete** — `livestream-overlay.md` is `status: unmounted`; index Attic section preserves history. Correct pattern for retired code ownership.

#### 2.2 Failure modes (prevent)

| Failure | Evidence | Why it hurts |
|---------|----------|--------------|
| **Changelog zone** | `agent-catalog.md` 628 lines, ~30 dated `## Leg / AS-N / Thread` sections | Present-tense card becomes a merge diary; agents re-read history that should live in decisions/plans |
| **Summary as essay** | `agentic-lifecycle` summary **1323 chars**; `knowledge-substrate` **681**; corpus lint `MAX_SUMMARY_LEN = 500` | Retrieval/index table becomes unreadable; statusline/index loses scan value |
| **Body ≠ template** | `knowledge-substrate.md` uses `# Knowledge substrate` + feature H2s; **0** frontmatter `invariants:` (invariants only in prose) | Generator cannot validate rules; two mental models for “what a zone is” |
| **Self-admitted STALE invariant** | `asset-ingest` invariant still claims single mediabunny importer, body notes `(STALE: waveform.ts also…)` | Verified-looking Map lies; worse than missing rule |
| **Skills restatement risk** | Zones list `skills: [[workspace-blueprints]]` etc.; CLAUDE.md forbids restating zones in skills — dual homes for procedure vs architecture must stay asymmetric | Without lint, agents get two conflicting SSOT docs |
| **Chronology append without recollection** | Many zones: dated H2s after Lineage (timeline, tool-registry, tracks) | Soft form of changelog zone; drifts `updated` without re-stamping `verifiedAt` |

**Invariant density:** 0 (`knowledge-substrate`) → 12 (`data-spine`, `render-view`). Sweet spot appears **5–9** load-bearing rules; more only if each has real `enforcedBy`.

#### 2.3 Decision collisions and identity

Decision files under `map/decisions/` use `NNNN-slug.md` but **numbers are not unique:**

- **0013** ×3 (agent-catalog, homepage-perf, synd-livestream)
- **0014, 0015, 0040, 0046, 0047, 0050, 0074, 0087** ×2 each

Only missing number in 0–117 is **0018**. Collisions break “cite decision 0013” as a stable pointer; Obsidian resolves by full slug, but agents and humans often use the number alone. **memory-atlas should enforce unique decision ordinals** (or drop ordinals and use date+slug only).

Decision length: median ~65 lines, p90 ~111, max ~180 — generally healthy ADR size. Thin ones (~18–19 lines) exist; fat autonomy/GSAP decisions (~150–180) still readable.

---

### 3. `verifiedAt` usage and actual staleness

#### 3.1 Mechanism (as built)

From `map/README.md` + `scripts/build-map.ts`:

- `verifiedAt` = commit SHA the card was last **human-confirmed** against owned code.
- Freshness = `changedSince(verifiedAt, owns.globs)` → `ok` vs `⚠ stale` in generated `map/index.md`.
- **Hard** gates: globs/testids/tools resolve; **soft**: routes, empty `enforcedBy`, graph coherence.
- Corpus lint (`scripts/check-corpus-quality.ts`): structural + ownership SSOT hard-fail; **freshness advisory unless `--strict`**.

`the-mind` zone documents the **self-referential freshness trap** (generator scripts must not make the mind zone perpetually stale) — a generalized tool should encode the same Ouroboros carve-out.

#### 3.2 Observed state (committed index)

At current `map/index.md` (last generator run):

| Freshness | Count |
|-----------|------:|
| `⚠ stale` | **36** |
| `ok` | **13** |

**ok examples:** `auth`, `clip-agents`, `asset-ingest`, `tool-registry`, `pending-clips`, `the-mind`, `view-state`, `viewport`, `workspace-shell`, …  
**stale sample:** `agent-catalog`, `billing-credits`, `blueprints`, `channels-orgs`, `data-spine`, `orchestrator-runtime`, …

**verifiedAt age distribution (unique SHAs resolved in this checkout):**  
~0–1 day (few) · ~2–8 days (cluster) · **~18–39 days** (long tail).  
Most common stamp: full SHA `1a32f5d4110c…` (2026-06-07, ~39d) on **8 zones** — bulk-minted at Map birth, never re-verified.

**Ground-truth spot checks:**

- `blueprints` @ `ebc59c14` (~24d): **real drift** — expander/tests/auto-save changed under `src/features/project-workspace/blueprints/**`.
- `clip-agents` @ `1a32f5d4…` (~39d): **no diff under globs** → correctly `ok` despite age (age ≠ stale; *owned-code change* = stale).
- SHA forms mix full and short (`24ffbba53`, `76e77d4e`, full 40-char) — git resolves both; tooling should normalize.

#### 3.3 Qualitative verdict

`verifiedAt` is **the right honesty signal** and is already the Atlas differentiator. Content quality problem is **recollection under-run**, not the field design:

- Autopilot text *requires* re-stamp on finish; practice leaves **~73% of zones stale**.
- Advisory default is correct for CI green; without statusline / session-start pressure, humans ignore ⚠.
- Empty `verifiedAt` is treated as stale (template documents this) — good fail-closed default.

---

### 4. `reports/` — newest convention (quality + fitness for memory-atlas)

**Single artifact:** `reports/2026-07-09-advisor-plans-state-of-the-build.md` (~209 lines).

```yaml
type: report
status: snapshot
summary: "Point-in-time state of the advisor-plans backlog at 2026-07-09: …"
zones: [timeline, billing-credits, render-view, data-spine, channels-orgs, agent-spine, the-mind]
covers: advisor-plans/README.md
created: 2026-07-09
updated: 2026-07-09
```

**What makes it high quality (encourage):**

1. **Explicit non-normative role** — body lead: “REPORT. A rear-view snapshot, not a plan… commits to nothing and supersedes nothing.”
2. **Derived + dated + commit-stamped** — `Date: 2026-07-09 · Commit: f6f80d56`.
3. **Narrative synthesis over tables alone** — “Almost nothing merged is a feature — what shipped is a floor” is the kind of judgment a fresh agent cannot reconstruct from green CI.
4. **Links into Map/decisions** without replacing them.
5. **Taxonomy already in syndcast CLAUDE.md:** Report lives in `reports/`; “answering where do we actually stand.”

**Gaps:**

- Only one report exists; not yet a habit.
- memory-atlas `SPEC.md` (core nine types) **does not include `report`** — still optional-module territory.
- Risk of reports becoming second backlogs if status is anything but `snapshot` / dated archive.

**Recommendation class:** optional module with strict rules (date in filename, `status: snapshot`, no checkboxes as task tracker, supersedes nothing).

---

### 5. Orphans, dead links, graph coherence

#### 5.1 Wikilinks (heuristic vault walk)

| Metric | Approx |
|--------|--------|
| Total wikilink occurrences (map/specs/plans/…) | ~5.8k |
| Unique targets | ~826 |
| Broken unique targets | ~223 |
| Broken occurrences | ~608 |

**Broken-link classes (quality-ranked):**

1. **True debt (fix):** zone `sources` to missing programs — generator already warns, e.g.  
   `[[2026-06-23-the-set-production-lifecycle-program]]`, `[[2026-07-02-past-layer-program]]`, `[[2026-06-11-agent-society-umbrella-design]]` (index Graph coherence).
2. **Vision path typos:** `[[syndcast-reinforced/REINFORCED\]]`-style escapes; pillar short names (`anima`, `reinforced`) used as if they were note IDs — `advances: [[anima]]` vs file `vision/syndcast-anima/ANIMA.md`.
3. **Skill / CLAUDE skill names as wikilinks:** `workspace-video-editor`, `app-backend-architecture`, `navigating-syndcast` — live in `.claude/skills/`, not vault. Zones should use plain strings or a separate `skills:` scheme, not fake vault links.
4. **False positives from prose/templates:** words `wikilinks`, `slug`, `target`, `…` matched by naive `[[…]]` extraction in docs about the system.
5. **Date-prefix aliasing partially helps** — generator registers `YYYY-MM-DD-` stripped aliases (map/README); still fails when the note was never written or was renamed.

#### 5.2 Orphans (never appear as a wikilink target)

~**525** notes (heuristic), dominated by:

| Bucket | ~Orphans | Read |
|--------|----------|------|
| plans | 247 | Done plans rarely linked after freeze — expected if archive/index exists; toxic if agents FTS-search them first |
| specs | 191 | Same |
| tech-debt | 43 | Open debt should be linked from zones; orphans = invisible debt |
| map/tech-debt | many of 16 | Second home without inbound links |
| reference | 13 | Some intentional runbooks |
| ideas | 11 | Fine if evergreen backlog |

**Orphans are not automatically noise** — a done plan can be legitimate cold storage. Noise is **orphan + still in default retrieval globs + huge file**.

#### 5.3 Archive underuse

`archive/` has **7** files (early 2026 designs) while **241 plans are `done`** and **259 specs `planned`**. Archival gravity is theoretical; the vault treats “done” as “keep forever in the hot tree.”

---

### 6. Duplication and dual conventions

| Duplication | Evidence | Severity |
|-------------|----------|----------|
| **Two tech-debt directories** | `tech-debt/` 163 vs `map/tech-debt/` 16; **zero basename overlap** | High — agents and lints must search both |
| **Two debt type tags** | `type: debt` vs `type: tech-debt` vs missing | High — breaks one-convention claim in memory-atlas SPEC |
| **Zone body vs changelog** | Present fact restated in dated Leg sections | Medium — bloat + contradiction risk |
| **Report vs BACKLOG** | Different jobs; currently clean | Low if report stays snapshot-only |
| **reference vs zones** | `reference/ARCHITECTURE.md` (606 lines), `CONVENTIONS.md` (2121) vs Map | Medium — pre-Map era long docs can compete with zones for “where is truth” |
| **Skills vs zones** | Skills for procedure; zones for as-built | Controlled by CLAUDE rule; still needs mechanical separation in generalized tool |
| **Decision number reuse** | 9 colliding ordinals | Medium for citation integrity |

memory-atlas SPEC already mandates **`tech-debt/` + `type: debt` only** — syndcast-mind is the negative example that proves why.

---

### 7. Ledger noise vs signal (specs / plans / programs / ideas)

**Plans status:** done 241 · draft 14 · ready 10 · in-progress 6 · executing 3 · active 5 · none 38.  
**Plans missing `implements` field:** ~274 (most of corpus) — lineage frontmatter not backfilled.

**Done-plan mass:** ~**256,470 lines** in `status: done` plans vs ~30k lines in non-done. Largest single plan files are 4–6k lines of task checklists long after merge. That is the primary “this vault feels huge” cost.

**Specs:** 352 files, mostly `planned` (read-only-after-plan lifecycle claimed; many never marked `superseded` — only **1** superseded). Lifecycle fiction > practice.

**Programs (16):** high signal as umbrellas; some are broken wikilink targets from zones (renames / never filed under expected slug).

**Ideas (24):** mixed maturity; several lack frontmatter entirely (in the 54 “no type” set with early notes and BACKLOG/Home).

**What earns keep:**

- Decisions with real forks (auth dual-stack, per-channel billing, pending-clips iron law, host-agnostic MCP tools).
- Active/executing plans for in-flight work.
- Programs that bind multi-session arcs.
- Open debt with severity + zone link.

**What is noise for day-to-day agent sessions:**

- Multi-thousand-line done plans in default FTS.
- Specs still `planned` years of calendar after code shipped.
- Vision pillars linked via wrong slugs.
- human-drafts (correctly excluded from agent retrieval — keep that).
- raw-prompts empty dir / human stream-of-consciousness drafts when accidentally included.

---

### 8. Flows and entities (optional present-tense)

**Flows (3)** — high quality, underused:

- `prototyping-ignite-accept.md`, `create-project-to-workspace.md`, `asset-upload-to-render.md`
- Frontmatter `steps:` with `tool:` / `testid:` anchors; `verify:` prose; cross-zone `related`.
- This is the best “how does a user journey touch multiple zones?” format; three flows for a product this size is sparse.

**Entities:** template + archaeology plan mentions only; **`map/entities/` empty**. Correct optional-module behavior would be *no directory until first use* (memory-atlas already says this).

---

### 9. `BACKLOG.md` and coordination notes

~290 lines; strong session-orientation (main A/B/C vs side D, claim 🟡, `Lands` field, why main moved). **High signal for multi-agent fleets.** Some rows are essay-length completion narratives (e.g. D15 Vellum IA) — good for audit, heavy for “what’s open.”

memory-atlas already models BACKLOG as optional; syndcast shows it pays rent when fleets are real.

---

### 10. `visuals/` — structure only (out of scope for porting)

```
visuals/
  illustrated/          # frozen MDX digests by skin/theme (default, tor, frontier, magazine, brutalist)
    <theme>/{specs,plans,programs,ideas,tech-debt,decisions,reports,backlog}/
  app/                  # Vite+React gallery app (src/, scripts/, kit/, full node_modules)
  files/
    diagrams/           # Excalidraw sources
    stocks/             # hero stock imagery
  README.md
```

**Scale:** ~35k files under `visuals/` (mostly `app/node_modules`); ~869 md, ~83 mdx, ~39 excalidraw.  
**Contract already in syndcast:** never in generator globs; never corpus-linted; presentation fork, not Atlas core.  
**memory-atlas SPEC:** “reserved name, NOT part of this standard” — reaffirm. Do not invent update codemods that touch illustrated digests as if they were Map truth.

---

### 11. Tooling already present (content-quality infrastructure)

Syndcast already built the quality gates memory-atlas should productize:

| Gate | Role |
|------|------|
| `pnpm mind:build` / `scripts/build-map.ts` | Hard anchors + freshness + rewrite `index.md` |
| `pnpm mind:check` | Build + fail if index dirty |
| `pnpm mind:check:corpus` | Retrieval shape (summary length, headers, orphans, broken links, ownership SSOT) |
| `pnpm mind:check:ledger` | Ledger frontmatter |
| `scripts/mind-status.ts` | Session-start statusline (`· N stale`) |
| Templates under `templates/` | Per-type scaffolds |
| writing-for-retrieval skill | Authoring discipline (referenced from CLAUDE.md) |

Content quality problems that remain are **mostly behavioral** (recollection, archival, not dual-writing debt) rather than “no linter.”

---

### 12. Earn-keep scorecard (qualitative)

| Class | Verdict | Notes |
|-------|---------|-------|
| Zone cards (typical 80–150 lines) | **Keep / gold** | Core product |
| Flows | **Keep / grow** | Too few |
| Decisions (unique, medium length) | **Keep** | Fix ordinal collisions |
| Reports | **Keep / formalize** | Best new tense |
| Programs | **Keep** | Fix link targets |
| Open debt (typed, linked) | **Keep** | Unify home + type |
| Active plans/specs | **Keep** | |
| Done plans (bulk) | **Archive or cold-tier** | Dominant noise |
| Frozen specs never superseded | **Archive / status fix** | Lifecycle lie |
| Changelog zone sections | **Move to decisions** | |
| Vision pillars | **Keep evergreen** | Fix slug discipline |
| reference mega-docs | **Thin or demote** | Compete with Map |
| human-drafts | **Exclude from agents** | Correct |
| visuals/ | **Separate product** | Not Atlas content |

---

## Recommendations for memory-atlas

Prioritized for (1) maturing conventions/tooling now, (2) multi-repo “update to latest” later, (3) OSS trust.

### P0 — encode what syndcast got right

1. **Map-first quality bar in SPEC + verifier**  
   Zone required shape: `summary` (cap ~300–500 chars), `owns.globs` (≥1 hit), `verifiedAt`, `invariants[]` with optional but *warned* empty `enforcedBy`, fixed H2 set (`What this is` / `Anchors` / `Invariants` / `Lineage`).  
   *Prevent* alternative zone body layouts without an explicit escape hatch.

2. **`verifiedAt` semantics unchanged; productize pressure**  
   Advisory in CI; hard in `--strict` and in session-start skill (“N stale zones — recollect before feature work”). Document age ≠ stale; owned-glob diff = stale. Normalize SHA length on write.

3. **Ownership SSOT hard-fail**  
   File-level exclusive globs (with exclude pathspecs). syndcast’s `findOwnershipConflicts` is the right model.

4. **One debt convention only**  
   Path: `tech-debt/` (never `map/tech-debt/`). Type: `debt` only. Verifier rejects `type: tech-debt` and second homes. Migration recipe for syndcast-like adopters.

5. **Decision identity**  
   Enforce unique ordinal **or** drop ordinals for `YYYY-MM-DD-slug` only. Colliding `0013` is a live footgun.

### P1 — fight ledger entropy (the real scale problem)

6. **Cold storage / archive policy**  
   `status: done|superseded` + age threshold → `archive/` (or `ledger/cold/`) **out of default agent retrieval globs**. Done plans totaling hundreds of kLOC must not dominate FTS.  
   Update mechanism: codemod moves files + rewrites wikilinks; AI agent reconciles ambiguous links.

7. **Lifecycle truthfulness lint**  
   If plan is `done` and zone exists, spec should not stay `planned` forever without `superseded`/`implemented-by`. Soft warnings first.

8. **Ban changelog zones**  
   Lint: >N dated H2s (`## … (2026-`) or zone line count > soft cap (e.g. 200) → warn “split to decision/report.” Present-tense body only; history goes to ADR or report.

9. **Summary length hard-fail for zones**  
   Cap 500 (syndcast corpus) or tighter (300) for index scannability. `agentic-lifecycle` is the anti-pattern.

10. **`implements` / `sources` completeness (soft → hard over time)**  
    Plans should point at specs; zones should point at existing notes only (graph hard mode optional).

### P2 — promote `report` and thin optional modules

11. **Add optional `report` type**  
    Frontmatter: `type: report`, `status: snapshot`, `covers`, `zones`, `created` (= snapshot date). Filename: `YYYY-MM-DD-…`. Rules: no task checkboxes as tracker; may not supersede decisions; retrieval weight medium (below zone, above cold plans).

12. **Flows as recommended optional module**  
    Document “3–10 flows for a mid-size app”; steps as `tool:`/`testid:`/`route:` for verifier.

13. **Do not scaffold `entities/`, `bases/`, empty `raw-prompts/`**  
    Create on first use only (SPEC already says this — keep in init templates).

14. **Skill vs zone boundary in OSS docs**  
    Zone = as-built architecture; skill = procedure. Forbid restating invariants in skills; `skills:` field is a pointer, not a second vault note unless mirrored intentionally.

### P3 — update-to-latest design implications (from content quality)

When propagating Atlas convention upgrades to many repos:

15. **Three-way / AI update must preserve local content**  
    Safe mechanical: templates, verifier rules, type renames (`tech-debt`→`debt`), empty-dir removal, archive moves with link rewrites.  
    **Unsafe mechanical:** rewriting zone bodies, re-stamping `verifiedAt` without human/agent re-read, deleting “orphan” plans, merging decision collisions by number alone.

16. **Per-repo allowlist of local modules**  
    syndcast will keep `visuals/`, rich BACKLOG, advisor-plans — update agent must not “normalize them away.” Config flags: `modules.reports`, `modules.flows`, `modules.backlog`, `modules.vision`, `excludePaths: [visuals/**]`.

17. **Quality gates as the upgrade acceptance tests**  
    After update: `atlas check` (anchors + ownership) green; freshness may still be stale (do not auto-fix); new lint rules may be introduced as warn→error over a grace period.

18. **Ship a “content health” report type from the tool itself**  
    Generator-emitted `reports/YYYY-MM-DD-atlas-health.md` (counts, stale zones, dual-type violations, top orphans) — dogfood the report convention and give fleets a rear-view without hand-writing.

### P4 — retrieval ranking defaults for agents

19. Default search order: **zones → decisions → open debt → active plans/programs → reports → ideas/vision → cold ledger**.  
20. Explicitly demote: `archive/**`, `status: done` plans, `human-drafts/**`, `visuals/**`.  
21. Index/dashboard: keep generated `map/index.md` freshness column — it is the single best content-quality dashboard syndcast has.

---

## Open questions

1. **Should `verifiedAt` re-stamp be allowed without body edit?** Pure “I re-read, still true” commits are cheap and would clear the 36-stale backlog — or is a mandatory invariant/body touch required for honesty?
2. **Archive vs delete vs cold-tier in-place:** Is moving 241 done plans politically/technically acceptable for syndcast, or should retrieval config ignore them while files stay put?
3. **Report vs pillar vs program for “state of X”:** Is a quarterly health report a `report`, or does it belong in `programs/` as a living rollup?
4. **Decision ordinal uniqueness:** Fix-forward (next free number only) vs rewrite history (renumber collisions) vs abandon numbers?
5. **Zone size hard cap:** Soft warn at 200 lines / hard at 400, or unlimited with changelog lint only?
6. **`enforcedBy` pointing at debt notes:** Allowed as temporary, or forbidden (must be test/lint/code path)?
7. **Multi-repo update agent:** Who may re-stamp `verifiedAt` during convention upgrades — never automatic, or automatic only when globs’ tree hash unchanged?
8. **Vision shortlink aliases:** Should the tool register pillar aliases (`anima` → `ANIMA` / `syndcast-anima`) like date-prefix aliases, or force full slugs?
9. **Skills living outside the vault:** First-class `skills:` non-wikilink references, or require vault mirrors under `reference/skills/`?
10. **Whether memory-atlas should ship corpus-quality as core or adapter:** syndcast’s `check-corpus-quality.ts` is repo-coupled (`syndcast-mind` path); how much becomes universal verifier vs example adapter?

---

## Appendix A — Evidence index (paths)

| Claim | Path / command basis |
|-------|----------------------|
| Zone inventory | `syndcast-mind/map/zones/*.md` (50 files) |
| Index freshness 36 stale / 13 ok | `syndcast-mind/map/index.md` |
| Generator contract | `syndcast-mind/map/README.md`, `scripts/build-map.ts` |
| Corpus lint | `scripts/check-corpus-quality.ts`, `scripts/lib/corpus-quality.ts` |
| Report specimen | `syndcast-mind/reports/2026-07-09-advisor-plans-state-of-the-build.md` |
| Taxonomy (report row) | `syndcast/CLAUDE.md` artifact table |
| Dual debt homes | `syndcast-mind/tech-debt/`, `syndcast-mind/map/tech-debt/` |
| Zone template | `syndcast-mind/templates/zone.md` |
| Changelog zone | `syndcast-mind/map/zones/agent-catalog.md` |
| Thin gold zone | `syndcast-mind/map/zones/clip-agents.md` |
| STALE invariant | `syndcast-mind/map/zones/asset-ingest.md` |
| Flow sample | `syndcast-mind/map/flows/prototyping-ignite-accept.md` |
| Visuals tree | `syndcast-mind/visuals/{illustrated,app,files}/` |
| memory-atlas core types (no report) | `memory-atlas/SPEC.md` |
| Real glob drift example | `git diff ebc59c14..HEAD -- src/features/project-workspace/blueprints/**` |

## Appendix B — Lessons compressed (encourage vs prevent)

**Encourage**

- Present-tense zone cards with code-checked `owns` + `verifiedAt`
- Invariants with test/lint `enforcedBy`
- Generated freshness index
- Unmounted attic for retired zones
- Snapshot reports with explicit non-authority
- Flows for multi-zone journeys
- BACKLOG claim/`Lands` for fleets
- writing-for-retrieval + summary caps
- Optional modules only when non-empty
- Cold archival of finished ledger notes

**Prevent**

- Dual debt homes / dual type tags  
- Changelog-as-zone (dated Leg appendices)  
- Essay-length zone summaries  
- Decision number collisions  
- Scaffolded empty directories  
- Treating done multi-kLOC plans as hot retrieval  
- Fake wikilinks to skills/prose  
- Restating architecture in skills  
- Auto-stamping `verifiedAt` without read  
- Folding `visuals/` into Atlas standard or generator globs  
- Silent lifecycle lies (`planned` forever after ship)
