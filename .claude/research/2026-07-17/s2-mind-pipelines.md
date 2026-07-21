# s2 — syndcast-mind automation pipelines (repo analysis)

**Subject:** automation that generates, validates, or updates `syndcast-mind/` inside [syndcast](file:///home/kento/Repositories/syndcast)  
**Cwd (read-only):** `/home/kento/Repositories/syndcast`  
**Date:** 2026-07-17  
**Scope note:** `syndcast-mind/visuals/` (mind-skin gallery, MDX digests, diagram prerender) is out of scope except where it is *invoked from* mind-maintenance flows.  
**Cross-ref:** memory-atlas already extracted the core verifier (`atlas build` / `check` / `stamp` / `status`) — this report inventories the *first implementation’s* full pipeline so generalization and the multi-repo update mechanism can be designed against real adoption pressure.

---

## Summary

- Mind automation is a **small, sharp CLI core** (`scripts/build-map.ts` + corpus/ledger linters) plus a **large convention layer** (CLAUDE.md recollection, skills, SessionStart hooks). Almost nothing auto-rewrites zone prose when code changes.
- **Package scripts:** `mind:build`, `mind:check`, `mind:check:ledger`, `mind:check:corpus`, `mind:bench`; aggregate `pnpm check` = lint + mind:check + mind:check:corpus. **`mind:check:ledger` is not in the aggregate.**
- **Writes only two committed artifacts by design:** regenerates `syndcast-mind/map/index.md` (generator); optional local/nav side files `.navidx-*` / `.navidx.log` (index refresh, gitignored or local). Zone cards, decisions, ledger notes are **hand/agent-edited**.
- **SessionStart hooks** (`.claude/settings.json`): (1) `mind-status.ts` one-liner health; (2) `nav-refresh-index.mjs` detached reindex of code+mind FTS buckets. No pre-commit / husky mind gate.
- **CI gap (important):** `.github/workflows/ci.yml` runs typecheck + lint + unit shards — **does not run `mind:check` or `mind:check:corpus`**. Drift can land on `main` if agents/humans skip local `pnpm check`.
- **Code↔mind sync model:** `owns.globs` / testids / tools / routes are machine-checked; `verifiedAt` + git history yields **advisory** freshness (hard only with `--strict`); **recollection is procedural** (skill + CLAUDE.md), not a codemod.
- **Syndcast-specific hard-wires** that memory-atlas already partially de-configures: tool resolver greps `src/features/project-workspace/registry/domains`; `nav-refresh-index.mjs` hardcodes `ROOT = '/home/dev/syndcast'`; route resolver assumes App Router `page.tsx` layout.
- **Worth generalizing first:** generator+check purity, ledger frontmatter lint, corpus retrieval lint (summary/headers/links/orphans/ownership SSOT), stamp discipline, SessionStart status, portable config-driven anchors, CI recipe. **Defer / keep host-specific:** mind-skin, nav-bench LLM evals, registry tool-ids, hardcoded index paths.
- **Primary drift vectors:** (1) no CI gate; (2) freshness advisory; (3) prose/invariants without matching glob churn; (4) forgotten `mind:build` after zone edits; (5) skill/CLAUDE.md text diverging from package scripts; (6) non-portable SessionStart refresh.
- **Update-to-latest implication:** treat atlas **tooling + templates + skills + config schema** as the versioned package; treat **vault content** (zones/decisions/specs) as host-owned. Propagate with config-aware merge + AI skill that never overwrites hand-made zones without review.

---

## Findings

### 1. Package scripts (root `package.json`)

| Script | Command | Reads | Writes | When |
|---|---|---|---|---|
| `mind:build` | `tsx scripts/build-map.ts` | zone/flow cards, whole-vault note ids, git tree via resolvers | **`syndcast-mind/map/index.md`** | Manual; recollection; local `check` |
| `mind:check` | `mind:build` then `git diff --exit-code syndcast-mind/map/index.md` | same + committed index | rebuilds index in working tree; fails if dirty vs HEAD | Local aggregate `pnpm check`; **not CI** |
| `mind:check:ledger` | `tsx scripts/check-ledger-frontmatter.ts` | `specs/**`, `plans/**` frontmatter; zone slug set | stdout only | Manual / ad-hoc; **not** in `pnpm check` |
| `mind:check:corpus` | `tsx scripts/check-corpus-quality.ts` | all vault `.md` (excl. `visuals/`), zone structural rules, git | stdout; exit 1 on structural/ownership | Local `pnpm check` |
| `mind:bench` | `tsx nav-bench/mind-bench.ts` | `nav-bench/tasks.jsonl`, ctx_search indexes, optional LLM | optional score/diff outputs under nav-bench | Manual corpus health; not a gate |
| `check` | `lint && mind:check && mind:check:corpus` | above | above | Human/agent pre-merge local gate |

Evidence: `package.json` lines ~21–27; scripts cited below.

---

### 2. Generator & validators (scripts/)

#### 2.1 `scripts/build-map.ts` (~346 lines) — the Map generator

**Role:** Validate zone/flow anchors against live code; soft graph coherence; rewrite `map/index.md`. Documented as **LOCAL + CI GATE ONLY — never wired into `next build`**.

| | |
|---|---|
| **Reads** | `syndcast-mind/map/zones/*.md`, `map/flows/*.md`; deep walk of map/, vision/, specs/, plans/, ideas/, tech-debt/, entities/, reference/, archive/, top-level vault notes (for note-id set / pillars); git (`ls-files`, `grep`, `diff`) |
| **Writes** | `syndcast-mind/map/index.md` only |
| **Hard errors** | dead `owns.globs` (excl. `:(exclude)` pathspecs); missing testids in `src/`; missing tools under **hardcoded** `src/features/project-workspace/registry/domains`; unresolvable flow steps |
| **Warnings** | route soft-verify; invariants without `enforcedBy`; graph dangling links; advances↔realizedBy reciprocity |
| **Freshness** | `changedSince(verifiedAt, globs)` → row marked `⚠ stale` in index; empty verifiedAt ⇒ stale |
| **When** | `pnpm mind:build` / `mind:check` / recollection checklist |

Pure core exported: `validate()`, `renderIndex()`, `noteIdAliases()` — unit-tested via injectable `Resolvers` (`tests/int/mind-generator.int.spec.ts`).

**memory-atlas parity:** `lib/validate.mjs` + `bin/atlas.mjs` `build`/`check` already mirror this shape (config-driven anchors via `lib/resolvers.mjs`). Syndcast still runs the **in-repo** copy, not the package CLI.

#### 2.2 `scripts/check-corpus-quality.ts` + `scripts/lib/corpus-quality.ts`

**Role:** Retrieval-readiness lint for **zones** (and vault-wide wikilink graph).

| | |
|---|---|
| **Reads** | All vault markdown except `visuals/`; zone frontmatter/body; git ls-files + log |
| **Writes** | none (stdout) |
| **Hard fail** | parse errors; missing/empty/overlong `summary` (max 500); no `##` headers; dead globs; broken `[[wikilinks]]`; orphans (no inbound + not treated as index members); **ownership SSOT** (file owned by >1 zone) |
| **Advisory** | `verifiedAt` drift (`commitsBehind`); becomes hard with `--strict` |
| **When** | `pnpm mind:check:corpus` as part of `pnpm check` |

Tests: pure checks in `scripts/lib/corpus-quality.test.ts`; integration-style in `tests/int/corpus-quality.int.spec.ts`.

**Gap vs memory-atlas:** ledger linter exists in atlas (`lib/ledger.mjs`); a full **corpus-quality** package (summary/headers/orphans/ownership) is a high-value extraction still denser in syndcast than in atlas’s public surface (verify before assuming parity).

#### 2.3 `scripts/check-ledger-frontmatter.ts`

| | |
|---|---|
| **Reads** | `specs/**`, `plans/**` only (despite STATUS_BY_TYPE also listing debt/idea/zone…) |
| **Checks** | frontmatter present; `type` known; `status` in lifecycle enum; non-empty `summary`; `zones:` array with known zone slugs |
| **Writes** | none |
| **When** | manual; **not** in `pnpm check` |

memory-atlas: `atlas check --ledger-only` / ledger path is the generalized form (`lib/ledger.mjs` + LIFECYCLES).

#### 2.4 `scripts/mind-status.ts` (~47 lines)

| | |
|---|---|
| **Reads** | zone files (count non-unmounted); open tech-debt; freshness via `parseNote`/`checkFreshness` |
| **Writes** | none — prints `🧠 Mind: N zones · M open tech-debt · K stale` |
| **When** | Claude **SessionStart** hook |

memory-atlas: `atlas status [--hook]` + `hooks.sessionStartStatus` in config.

#### 2.5 `scripts/nav-refresh-index.mjs` (~228 lines)

| | |
|---|---|
| **Reads** | `src/**` (.ts/.tsx) + `syndcast-mind/**` (.md); context-mode CLI under `~/.claude/plugins/cache/context-mode/...` |
| **Writes** | `.navidx-code/`, `.navidx-mind/`, `.navidx.lock`, `.navidx.log`, `.navidx.stamp` under a **hardcoded** `ROOT = '/home/dev/syndcast'` |
| **When** | SessionStart (detached spawn, <1s parent return); 10-minute stamp threshold; `--force` manual |
| **Portability issue** | hard-coded absolute path — breaks on any machine/layout not `/home/dev/syndcast` (e.g. this analysis host uses `/home/kento/Repositories/syndcast`) |

Skills `nav-retrieval` document project paths as `/home/dev/syndcast/.navidx-{code,mind}` — same host assumption.

#### 2.6 `nav-bench/` (`mind:bench`)

Corpus-quality **measurement** harness: fixed retriever (`ctx_search`), tasks in `tasks.jsonl`, LLM answer+judge. Reads mind+code indexes; writes reports/baselines under `nav-bench/` and occasionally references `syndcast-mind/reference/corpus-health-log.md`. **Not a pipeline gate** — R&D for retrieval conventions. Low priority to ship inside memory-atlas core; useful as optional “health lab” later.

---

### 3. Claude hooks, commands, skills, agents

#### 3.1 Hooks — `.claude/settings.json`

```json
SessionStart →
  npx tsx scripts/mind-status.ts
  node "$CLAUDE_PROJECT_DIR/scripts/nav-refresh-index.mjs"
```

No Stop/PreToolUse/PostToolUse mind hooks. No git pre-commit mind enforcement under `.husky` (none present).

#### 3.2 Commands — `.claude/commands/map-sync.md`

Thin wrapper: run `pnpm mind:build`, report zone count / stale / gaps, remind to re-stamp `verifiedAt`.

#### 3.3 Skills (mind-relevant; visuals noted but out of scope)

| Skill | Role | Touches automation? |
|---|---|---|
| `navigating-syndcast` | Orient: index → zone → sources/flows | Read-only procedure |
| `nav-retrieval` | Prefer ctx_search over grep; dual buckets | Depends on SessionStart reindex |
| `writing-for-retrieval` | Authoring conventions; points at `mind:check:corpus` | Soft gate instruction |
| `mind-skin` / `visuals-kit` / `excalidraw-diagrams` | Digest layer under `visuals/` | **Out of scope**; autopilot still *schedules* them after specs/recollection |
| Domain skills (`workspace-*`, `building-blocks`, …) | Point into zones; must not restate architecture | Contract in CLAUDE.md |

memory-atlas already ships portable twins: `skills/atlas-nav`, `writing-for-retrieval`, `atlas-recollection`.

#### 3.4 Agents

- `architect`, `data-modeler`, (and CLAUDE.md general rule): **orient Mind-first** before analysis.
- `boss-chapter` + `boss-dispatch/*`: **read** Mind for orientation; **forbidden to write** `syndcast-mind/` (writes `advisor-plans/` only).
- Recollection is **not** an agent type — it’s a skill/checklist (`atlas-recollection` in memory-atlas).

#### 3.5 Policy source of truth — `CLAUDE.md` (+ mind templates)

Operational pipeline is prose-encoded:

1. **Orient:** BACKLOG + `map/index.md` + zone cards.  
2. **Author:** specs/plans/ideas/tech-debt with templates under `syndcast-mind/templates/` (`zone.md`, `spec.md`, `plan.md`, …).  
3. **Implement code** on feature branch; docs often → local `main` (autopilot).  
4. **Recollection:** edit zones, stamp `verifiedAt` to HEAD, decisions, tech-debt, `pnpm mind:build`, commit `index.md`.  
5. Optional auto-visual (out of scope).

Obsidian Bases (`syndcast-mind/bases/*.base`) aggregate frontmatter for humans; CLAUDE.md states **Bases never replace the generator**.

---

### 4. CI / tests

#### 4.1 GitHub Actions — `.github/workflows/ci.yml`

| Job | Runs | Mind? |
|---|---|---|
| `verify` | `pnpm install --frozen-lockfile`, `typecheck:build`, `lint` | **No** |
| `unit` | vitest unit shards 1–4 | Only if unit config includes mind unit files (generator pure tests live under `tests/int/` naming — confirm shard inclusion; corpus pure tests under `scripts/lib/*.test.ts` may or may not be in unit config) |
| `integration` | disabled (`if: false`) | would include mind-generator int specs when enabled |

**Conclusion:** production PR gate does **not** enforce committed `map/index.md` freshness or corpus quality. The intended gate is local `pnpm check`.

#### 4.2 Automated tests that protect the mind pipeline

- `tests/int/mind-generator.int.spec.ts` — pure `validate`/`renderIndex` behavior (dead globs, tools, routes, staleness, graph soft warnings).
- `tests/int/corpus-quality.int.spec.ts` + `scripts/lib/corpus-quality.test.ts` — retrieval lint pure functions.

These protect **tooling correctness**, not **vault content** currency.

---

### 5. How the mind stays in sync with the code (as-built model)

```
 code change
     │
     ├─► owns.globs / testids / tools claims ──► mind:build / mind:check:corpus
     │         hard-fail if anchors dead; soft stale in index
     │
     ├─► verifiedAt (SHA) ──► git log/diff since SHA on globs
     │         advisory freshness (strict optional)
     │
     └─► prose / invariants / decisions ──► HUMAN or AGENT recollection only
               no auto-rewrite; skill checklist; optional map-sync command
```

**What is mechanical**

- Anchor existence (globs, testids, tools).
- Index regeneration + committed-index equality (`mind:check`).
- Ledger lifecycle enums (when run).
- Retrieval shape (summary, headers, links, orphans, multi-owner files).

**What is social/AI-procedural**

- Choosing which zone to update.
- Writing correct architecture prose.
- Stamping only reviewed zones (memory-atlas codifies “no blanket stamp”).
- Filing decisions / tech-debt.
- Keeping CLAUDE.md / skills aligned with scripts.

---

### 6. Where it drifts

| Drift mode | Mechanism failure | Severity for multi-repo atlas |
|---|---|---|
| **CI blind spot** | `mind:check` not in GHA | High — index + dead globs can merge silently |
| **Advisory freshness** | stale zones warn, don’t fail default corpus | Medium — map looks green while claims lag |
| **Prose lag** | code moved inside still-matching globs; summary wrong | High for agent orientation quality |
| **Forgotten rebuild** | zone edited, index not regenerated | Medium — caught only by `mind:check` if run |
| **Ledger not in aggregate** | `mind:check:ledger` optional | Low–medium for lifecycle hygiene |
| **Host-locked nav** | hardcoded `/home/dev/syndcast` | High for adoption outside one machine |
| **Syndcast-only anchors** | tools→registry/domains path | Medium — must stay config-driven in atlas |
| **Convention docs drift** | CLAUDE.md / skills describe scripts that rename | Medium — skill package versioning needed |
| **Visuals pipeline** | autopilot skins digests (out of scope) | N/A for atlas core |
| **Dual implementation** | syndcast still uses `scripts/build-map.ts` while memory-atlas has `atlas` CLI | High for “update to latest” — two sources of truth until syndcast dogfoods the package |

---

### 7. Inventory table (complete pipeline map)

| Asset | Path | R / W | Trigger |
|---|---|---|---|
| Generator | `scripts/build-map.ts` | R vault+git; W `map/index.md` | `mind:build` |
| Corpus lint | `scripts/check-corpus-quality.ts`, `scripts/lib/corpus-quality.ts` | R | `mind:check:corpus` |
| Ledger lint | `scripts/check-ledger-frontmatter.ts` | R | `mind:check:ledger` |
| Status line | `scripts/mind-status.ts` | R | SessionStart |
| Nav reindex | `scripts/nav-refresh-index.mjs` | R src+mind; W `.navidx*` | SessionStart / `--force` |
| Bench | `nav-bench/mind-bench.ts` (+ suite) | R/W nav-bench | `mind:bench` |
| Templates | `syndcast-mind/templates/*` | seed content | agent/human authoring |
| Bases | `syndcast-mind/bases/*.base` | Obsidian views | human |
| Command | `.claude/commands/map-sync.md` | invokes build | slash command |
| Skills | navigating / nav-retrieval / writing-for-retrieval (+ skin*) | procedural | agent load |
| Settings hooks | `.claude/settings.json` | invoke status+reindex | SessionStart |
| Policy | `CLAUDE.md`, `docs/README.md` | human/agent | always |
| CI | `.github/workflows/ci.yml` | — | **does not run mind gates** |
| Tests | `tests/int/mind-generator*`, corpus tests | assert tooling | vitest when run |

---

### 8. What is already in memory-atlas (avoid re-extracting blindly)

From package surface (`bin/atlas.mjs`, `lib/*`, `atlas.config.json`, skills, SPEC.md v0.1):

- `init` / `build` / `check` / `stamp` / `status` / `routine`
- Pure `validate` + `renderIndex`, config-driven resolvers, ledger lifecycles
- Hook toggles: `sessionStartStatus`, `sessionStartIndexRefresh` (declared; host still wires commands)
- Skills: `atlas-nav`, `writing-for-retrieval`, `atlas-recollection`
- Dogfood vault at `atlas/`; docs ONRAMP / CONFIG / ADOPTION

**Still denser or only in syndcast today**

- Full corpus-quality ownership-SSOT + orphan graph walk as a first-class hard gate
- End-to-end dual-bucket nav refresh implementation (portable)
- nav-bench retrieval measurement lab
- Autopilot integration (BACKLOG claims, docs→main vs code branch) — product-specific
- Hard-coded registry tool resolution patterns (should remain **config examples**, not core defaults)

---

## Recommendations for memory-atlas

Prioritized for: (1) mature conventions now for ~5 new repos, (2) later open-source, (3) AI/skill-driven update-to-latest that respects local config + handmade vault content.

### P0 — Must ship before multi-repo rollout

1. **Single CLI is the product; kill dual generators in adopters.**  
   Document dogfood path: syndcast should eventually call `atlas check` instead of vendored `scripts/build-map.ts`. Until then, treat syndcast scripts as **reference implementation lagging the package**.

2. **CI recipe as first-class docs + optional GitHub Action / composite.**  
   Minimum adopters should run: `atlas check` (and optionally `atlas check --strict` on scheduled jobs). Syndcast’s missing GHA mind step is proof that “local check only” will not scale to 5–50 repos.

3. **Config schema as the extension surface (already started).**  
   Freeze: `vaultDir`, folder map, modules, anchors.{globs,testids,tools,routes}, `check.strictFreshness`, hooks, retrieval excludes. Any syndcast-only behavior (registry tools, App Router pages) is **config**, not forks of `validate.mjs`.

4. **Corpus quality package (extract from syndcast).**  
   Promote summary/headers/broken-links/orphans/ownership-SSOT into `atlas check` (or `atlas check --corpus`) with the same hard/advisory split as freshness. This is the main retrieval gate that makes multi-repo minds useful to agents.

5. **Stamp discipline remains non-negotiable.**  
   Keep “no blanket stamp”; surface it in every host’s recollection skill. Stale-but-green maps are worse than failing CI.

### P1 — Update-to-latest mechanism (design now, implement next)

6. **Version the convention, not the vault content.**  
   Package versions cover: CLI, schema, templates (skeletons only), skills, ONRAMP snippets, optional hook stubs.  
   **Never auto-overwrite:** `map/zones/*`, decisions, specs, plans, tech-debt, custom config values, custom skills in the host repo.

7. **Three-layer update model (copier-ish, AI-executed):**  
   - **Layer A — mechanical (safe):** bump CLI dependency / `npx memory-atlas@latest`; regenerate **only** generated files (`map/index.md` via `atlas build`); refresh schema defaults **additively** into `atlas.config.json` (fill missing keys; never clobber set ones).  
   - **Layer B — template/skill sync (semi-safe):** three-way compare package templates/skills vs host copies; apply if host file still matches previous package hash; otherwise flag for AI merge.  
   - **Layer C — AI skill `atlas-upgrade` (judgment):** read SPEC changelog + host config + `git diff` of skill/template drift; propose a PR plan; never silent-mutate zone prose; respect `enabled: false` kill switch.

8. **Pin a content hash of “managed files” in host.**  
   e.g. `atlas.lock.json` or field in config: `{ "conventionVersion": "0.1.0", "managed": { "skills/writing-for-retrieval/SKILL.md": "<sha>" } }`. Enables 3-way: base package version → current package → host file.

9. **SessionStart packaging.**  
   Ship copy-paste ONRAMP snippets:  
   `atlas status --hook`  
   + optional portable index refresh (replace hardcoded ROOT with `findRepoRoot` + config `retrieval.engine`).  
   Config flags already exist; the syndcast bug is the implementation host path.

### P2 — Nice-to-have / later OSS polish

10. **Portable nav adapters**, not a single FTS engine — ctx-search as reference (as SPEC already says), plus dumb `rg` fallback for CI agents without plugins.

11. **Routines** (`atlas routine gardening`) for weekly stale-zone review prompts — already stubbed; flesh for multi-repo hygiene without human memory.

12. **nav-bench stays out of core** — publish later as `memory-atlas-bench` or docs recipe; don’t block 0.x usability.

13. **Explicit non-goals in SPEC** (already partial): visuals/, autopilot branching policy, product BACKLOG formats — host modules.

### P3 — What *not* to generalize from syndcast

- `mind-skin` / visuals MDX gallery / Pixabay heroes  
- Autopilot “docs to main, code to branch” product policy  
- Registry-domain tool grep as a default  
- Boss-dispatch / advisor-plans corpus orchestration  
- Hardcoded absolute paths  

---

## Open questions

1. **When does syndcast dogfood memory-atlas CLI?** Dual generators will fork behavior (graph warning wording, freshness encoding, corpus rules) unless one is deleted or thin-wrapped.
2. **Should default CI fail on freshness (`--strict`)?** Syndcast defaults advisory for agent velocity; multi-repo OSS may want schedule-strict + PR-loose.
3. **Is ownership-SSOT (one file → one zone) universal?** Large monorepos may need intentional multi-zone ownership or path-priority rules — SPEC should decide before corpus extraction hardens it.
4. **Who owns index refresh in OSS installs without Claude Code?** hooks are Claude-centric; need generic “agent session start” notes for Cursor/Codex/Grok.
5. **Update mechanism distribution:** npm package only vs also git subtree / submodule of skills? Skills under `.claude/skills` are often copied, not depended — 3-way merge is harder for copies.
6. **Vault directory naming:** syndcast uses `syndcast-mind/`; atlas dogfood uses `atlas/`; SPEC says `<repo>-atlas/`. Confirm one recommended default + rename story for existing syndcast.
7. **Ledger scope:** syndcast ledger check only specs+plans; should debt/idea/program always be included in `atlas check`?
8. **Migration of syndcast’s 50 zones / 128 decisions:** pure content — out of automation update path, but needs an ADOPTION runbook “import existing vault without re-stamping everything active.”

---

## Appendix A — Evidence index (paths)

| Kind | Path |
|---|---|
| Scripts package | `/home/kento/Repositories/syndcast/package.json` |
| Generator | `.../scripts/build-map.ts` |
| Corpus | `.../scripts/check-corpus-quality.ts`, `.../scripts/lib/corpus-quality.ts` |
| Ledger | `.../scripts/check-ledger-frontmatter.ts` |
| Status | `.../scripts/mind-status.ts` |
| Nav reindex | `.../scripts/nav-refresh-index.mjs` |
| Bench | `.../nav-bench/mind-bench.ts` |
| Hooks | `.../.claude/settings.json` |
| Command | `.../.claude/commands/map-sync.md` |
| Skills | `.../.claude/skills/{navigating-syndcast,nav-retrieval,writing-for-retrieval,mind-skin}/` |
| Policy | `.../CLAUDE.md`, `.../docs/README.md` |
| CI | `.../.github/workflows/ci.yml` |
| Templates | `.../syndcast-mind/templates/` |
| Tests | `.../tests/int/mind-generator.int.spec.ts`, `.../tests/int/corpus-quality.int.spec.ts` |
| Atlas package | `/home/kento/Repositories/memory-atlas/{bin/atlas.mjs,lib/*,SPEC.md,atlas.config.json,skills/*}` |

No web research (stars/URLs) was required; this is a single-repo pipeline inventory. Sibling products mentioned by owner for later OSS positioning: **agentic-sage**, **token-oracle** (local repos under `~/Repositories/`; not re-surveyed here).

---

## Appendix B — One-sentence sync thesis

**The mind stays true to the code only where anchors and stamps are mechanical; everything else is recollection discipline — and without CI, even the mechanical layer is optional.**
