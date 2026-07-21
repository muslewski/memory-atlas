# M3 — Atlas update story: how adopted repos receive improvements

**Date:** 2026-07-17  
**Role:** repo analyst (read-only)  
**Scope:** memory-atlas (`/home/kento/Repositories/memory-atlas`) update path for already-adopted repos; grounded in package layout, SPEC, CLI, and the first implementation (syndcast-mind). Visuals/ out of scope.  
**Web/sibling notes:** GitHub API star counts for `muslewski/*` were unavailable this session (unauthenticated rate limit). Package is still pre-publish (local `0.1.0`; `docs/LAUNCH-CHECKLIST.md` still treats GitHub/npm as owner steps). Copier update model cited from public docs ([copier updating](https://copier.readthedocs.io/en/stable/updating/)).

---

## Summary

- **There is no `atlas update` / upgrade / migrate command today.** Adopted repos only get CLI improvements via installing a newer `memory-atlas` package (`npx` / global / local dep). Everything else is manual.
- **Three version axes exist and are independent:** package semver (`package.json` → `0.1.0`), SPEC convention version (`SPEC.md` frontmatter `version: 0.1`), config *shape* version (`atlas.config.json` → `version: 1`). None of them drive migrations.
- **`config.version` is dead metadata for upgrades:** documented as “bumps only on a breaking shape change,” loaded into defaults, **never read** by any `lib/*` migration path.
- **`atlas init` is additive-only create-if-missing.** Re-runs never overwrite existing vault files, templates, or `atlas.config.json` (tested: byte-identical tree). That protects customizations and **also freezes** first-install scaffolding forever.
- **State splits cleanly into four ownership classes:** (1) package-owned runtime, (2) vendored/copied on-ramp artifacts, (3) regenerable vault artifacts, (4) user-owned vault content + local config. Mixed ownership is the hard problem (skills, note templates, CLAUDE blocks, adapters).
- **Routines already model a good update-respecting pattern:** vault `<templates>/routines/*.md` shadows package `templates/routines/*.md`. Note templates do **not** — they are one-shot copies.
- **Syndcast (first mind) has not migrated to memory-atlas tooling.** It still runs local `scripts/build-map.ts` via `pnpm mind:build`, has **no** `atlas.config.json`, keeps an `entity` template (cut from core SPEC), and a customized `writing-for-retrieval` skill that already differs from the package skill.
- **Sibling tools (agentic-sage, token-oracle) update the *tool binary/wiring*, not per-repo knowledge trees.** SAGE’s `sage init --repair` re-asserts hook/skill symlinks with skip-if-present / backup semantics — a useful pattern for **wiring**, not for vault content.
- **Without new provenance stamps now, fleet-scale “update to latest” will be guesswork** once five+ repos diverge on skills, templates, instruction blocks, and config keys.
- **Recommended direction:** stamp provenance + file classes **now**; ship a dry-run `atlas doctor` / inventory; evolve an AI-skill-driven `atlas update` that is 3-way (baseline / local / latest) with explicit never-touch lists for zone cards and ledger notes.

---

## Findings

### 1. What “update” means for memory-atlas (two different products)

| Product layer | Lives in | How it improves today | Risk of clobbering user work |
|---|---|---|---|
| **Tool runtime** (CLI + lib + schema + package templates + package skills source) | `memory-atlas` package (`bin/`, `lib/`, `schema/`, `templates/`, `skills/`, `adapters/`, `docs/`, `SPEC.md`) | Bump/install package | Low (unless adopter vendored copies) |
| **Adopted surface** (vault + config + copied skills/adapters + instruction blocks + CI hooks) | Each consuming repo | **No automated path** | High if naive overwrite |

The tool is designed so the **canonical convention lives in the package** and the **understanding lives in the vault**. That split is good — but the install surface deliberately **copies** several files out of the package (`docs/ONRAMP.md` install flow), after which package and adopter diverge silently.

### 2. Commands and version surfaces (evidence)

**CLI surface** (`bin/atlas.mjs`): `init`, `build`, `check`, `stamp`, `status`, `routine`. No `update` / `upgrade` / `migrate` / `doctor`. `--version` prints `package.json` version only.

**Version axes** (all present, none coordinated):

| Axis | Where | Current | Used for |
|---|---|---|---|
| Package semver | `package.json` `"version": "0.1.0"` | 0.1.0 | npm identity; `atlas --version` |
| SPEC convention | `SPEC.md` frontmatter `version: 0.1` | 0.1 | Human/normative breaking-change story pre-1.0 (`SPEC.md` §Versioning; `CHANGELOG.md` echoes no stability guarantee) |
| Config shape | `atlas.config.json` / schema / `DEFAULTS.version` | integer `1` | Documented shape version; **no migration code** (`lib/config.mjs` never branches on it) |

**CHANGELOG.md** documents a single release `[0.1.0] - 2026-07-09` (features + pack/test/README fixes). No “Migration” section, no “for adopters upgrading from X” notes, no file-class inventory of what consumers must re-copy.

**Config loader tolerance** (`lib/config.mjs`): missing/partial/unknown keys warn and fall back to defaults — excellent for forward-compat of *new* keys on old configs, **silent** about “you are on package 0.4 but config shape 1 and never received skill v3.” Unknown keys are *ignored*, not preserved in the merged runtime object (they remain on disk in the user’s JSON).

### 3. Exact ownership map (tool repo vs adopting repo)

#### A. Package-owned (always received by upgrading the package)

Paths under the memory-atlas repo / published `files` list:

- `bin/atlas.mjs`, `lib/**` — runtime behavior (`build`/`check`/`stamp`/`status`/`routine`/`init`)
- `schema/atlas.config.schema.json` — editor autocomplete (via `$schema` pointer)
- `templates/**` — **source** scaffolds used by `init` and built-in routines
- `skills/**` — **canonical skill texts** (only if consumer points skill path at package or re-copies)
- `adapters/**` — reference adapter sources
- `docs/**`, `SPEC.md`, `examples/**`

Adopter receives these automatically **only if** they invoke the installed package binary / read package docs — not if they only keep a vendored snapshot.

#### B. One-shot scaffolded, then user-owned (create-if-missing; never refreshed)

Produced by `atlas init` (`lib/init.mjs` → `ensureDir` / `ensureFile` skip if exists):

| Path (relative to repo) | Initial content source | After first write |
|---|---|---|
| `<vault>/` core dirs | `config.folders` map | User content accumulates |
| `<vault>/README.md` | `templates/vault/README.md` | Free to edit |
| `<vault>/map/index.md` | Placeholder banner; later **regenerated** by `build`/`check` | Regenerable (see C) |
| `<vault>/templates/*.md` | `templates/notes/*` with `{{DATE}}` baked to init day | **User-owned copy**; package template fixes never land |
| `atlas.config.json` (repo root) | `templates/config/atlas.config.json` with `{{VAULT}}` | **User-owned**; modules/hooks/folders remaps hand-edited |

Optional modules (`--modules flows,programs,vision,reference,archive,backlog,drafts`) create extra dirs/files the same way. If config **already exists**, `ensureFile` for config **skips** — so `--modules backlog` on a second run can create `BACKLOG.md` without flipping `modules.backlog: true` in the existing config (gap in additive init).

**Dogfood evidence of template freeze:**  
`templates/notes/zone.md` still has `{{DATE}}`; `atlas/templates/zone.md` has `created/updated: 2026-07-09` only. Content-identical except the substituted date — but any future package template change would not propagate without overwrite policy.

#### C. Regenerable (safe to overwrite from tool)

| Artifact | Generator | Marker |
|---|---|---|
| `<vault>/map/index.md` | `atlas build` / `atlas check` (`renderIndex`) | `<!-- GENERATED by atlas build — do not hand-edit. -->` |
| Status line / routine live counts | `atlas status`, `atlas routine` | stdout only, not committed |
| ctx-search runtime artifacts | adapter script | `.navidx.stamp`, `.navidx.lock`, `.navidx.log` (gitignored / npmignored in package) |

`atlas check` fails if committed `map/index.md` differs from regeneration — this is the **only** enforced “update generated file” loop today.

#### D. Pure user-owned knowledge (must never be tool-overwritten)

Everything that carries understanding:

- `map/zones/*.md`, `map/flows/*.md` (present-tense Map)
- `map/decisions/*` (Ledger ADRs)
- `specs/*`, `plans/*`, `programs/*`
- `ideas/*`, `tech-debt/*`, `vision/*`, `reference/*`, `archive/*`, `drafts/*`
- `BACKLOG.md` content
- Obsidian conveniences (`.obsidian/`, `Home.md`, `bases/` — SPEC optional)
- **Out of scope / reserved:** `visuals/` (syndcast; not part of standard)

`verifiedAt` / `status` / frontmatter fields are user+stamp lifecycle, not package versioning.

#### E. Vendored / mixed (the update minefield)

From `docs/ONRAMP.md` install flow + zone `agent-onramp`:

| Artifact | How it lands | Customization expected? | Update today |
|---|---|---|---|
| Skills `atlas-nav`, `writing-for-retrieval`, `atlas-recollection` | Copy into `skills.dir` (default `.claude/skills`) **or** point skill path at package | Yes (repos already diverge) | Manual re-copy |
| `scripts/nav-refresh-index.mjs` | Copy from `adapters/ctx-search/` | Path hard-coded assumptions; may be patched | Manual re-copy |
| CLAUDE.md / AGENTS.md Atlas blocks | Paste from ONRAMP, then edit vault name / extra rules | **Always** customized | Manual merge |
| `.claude/settings.json` SessionStart hooks | Paste JSON fragments | Merged with other tools | Manual |
| CI step `atlas check` | Documented, not scaffolded | Repo-specific | Manual |
| Vault note templates | Copied at init | Sometimes edited | Never |
| Built-in routines | Read from package unless vault shadows | Vault override intentional | Package update improves built-ins automatically |

**Historical motivation (advisor plan 004):** navigation skill was “hand-copied into five repos and drifted into five distinct versions.” Extraction to the package fixed the *source of truth* for new installs; it did **not** ship a reconvergence path for old copies.

**Live drift sample (syndcast):**  
`/home/kento/Repositories/syndcast/.claude/skills/writing-for-retrieval/SKILL.md` **differs** from package `skills/writing-for-retrieval/SKILL.md`. Syndcast also has mind-specific skills (`navigating-syndcast`, `mind-skin`, `nav-retrieval`) outside the three portable skills — legitimate local extensions that must not be tombstoned (recollection skill already says vendored third-party skills are not Atlas projections).

### 4. How an already-adopted repo receives improvements **today** (step-by-step reality)

Assume a greenfield adopter after ONRAMP (or dogfood `atlas/` + local package).

1. **CLI/engine improvements** (new check rules, stamp behavior, status format, routine templates built-in):  
   `npm update memory-atlas` / reinstall / newer `npx memory-atlas@x` → immediate.  
   **Requires** the binary used by CI/hooks is the package, not a vendored fork of `lib/`.

2. **New config keys** (e.g. future `check.foo`):  
   Old `atlas.config.json` keeps working via deep-merge defaults. User does not see the new key unless they re-init (won’t overwrite) or hand-edit. Schema pointer may still point at old installed package path.

3. **New optional modules / template improvements / skill text / ONRAMP wording / adapter bugfixes:**  
   **Not received.** Re-run `atlas init` only fills *missing* paths. Skills and adapters are outside `init` entirely.

4. **SPEC convention breaking change (0.1 → 0.2):**  
   Documented as minor bump pre-1.0 with **no stability guarantee**. No migration notes, no codemod, no “atlas migrate 0.1→0.2”. Adopter discovers breakage when `atlas check` starts failing on status enums / frontmatter / anchors.

5. **Brownfield migration** (`docs/ADOPTION.md`):  
   Human/agent process for **first** import of legacy docs into vault shape — not ongoing package upgrade. Additive `init` is called out; honest `seeded` zones and no blanket stamp.

6. **Pause without uninstall:**  
   `enabled: false` kill switch (config) — present; useful, not an updater.

**Bottom line today:** “Update to latest” = (a) bump package, (b) re-read CHANGELOG/SPEC by hand, (c) manually re-copy/merge skills, adapters, docs blocks, and any desired template changes while protecting vault notes and local config.

### 5. First implementation (syndcast-mind) as the future fleet worst case

Path: `/home/kento/Repositories/syndcast/syndcast-mind/` (visuals/ ignored per task).

| memory-atlas expectation | syndcast today |
|---|---|
| `atlas` CLI | Local `scripts/build-map.ts` + `pnpm mind:build` / `mind:check` |
| `atlas.config.json` | **Absent** |
| Vault name via config | Hardcoded `syndcast-mind/` |
| Index banner | `GENERATED by scripts/build-map.ts` / `pnpm mind:build` |
| Core taxonomy | Extra **`entity`** template still present (SPEC cut entity from core; extension point only) |
| Skills | Local names + drifted `writing-for-retrieval` |
| Optional modules | Heavy use: programs, vision, reference, archive, BACKLOG, drafts/human-drafts, bases, Home.md |
| Tooling deps | `gray-matter` etc. in app scripts — not zero-dep atlas package |

An “update to memory-atlas latest” for syndcast is **not** a template refresh — it is a **brownfield re-platform** (ADOPTION.md class problem) plus ongoing sync. Any fleet update design must treat “pre-atlas mind” and “atlas init adopter” as different profiles.

### 6. Sibling open-source patterns (wiring vs knowledge)

| Repo (local path) | Publish model (from tree) | Update story | Lesson for atlas |
|---|---|---|---|
| `agentic-sage` | npm package + `install.mjs` / `sage init` / `--repair`; global hooks & skill **symlinks** | Re-init is conservative: skip-if-present settings keys, `.bak` once, symlink retarget, marker JSON merge preserving unknown keys; upgrade docs say old state dir still works | **Symlink or re-assert wiring**; never rewrite repo knowledge; doctor command validates |
| `token-oracle` | PyPI / `install.sh` / `uv tool install` | Update the installed tool; no per-repo scaffold tree | Pure CLI product — simpler than atlas’s dual product |
| Copier (external) | Template tool | Stores `.copier-answers.yml` + template version; `copier update` does 3-way merge against last template apply on a clean git tree | **Provenance file is the unlock**; merge conflicts expected for customized files |

Star counts: not retrieved this session (GitHub API rate-limited). Treat sibling maturity as “owner’s published fleet tools,” not as popularity metrics.

### 7. What is regenerable vs user-owned vs mixed (compact matrix)

| Class | Examples | Tool may overwrite? | Needs provenance stamp? |
|---|---|---|---|
| **Regenerable** | `map/index.md` | Yes (already) | Optional (generator version nice-to-have) |
| **User-owned content** | zones, decisions, specs, plans, debt, ideas, pillars, BACKLOG body | **Never** | No (content is the point) |
| **User-owned config** | `atlas.config.json` values, folder remaps, enabled modules, hooks | Merge only; never blind replace | Yes (`config.version` + `packageVersion` + last migrate) |
| **Scaffold templates** | `<vault>/templates/*.md` | Only with 3-way / prompt / “if unmodified” | **Yes** (hash at copy) |
| **Portable skills** | `.claude/skills/atlas-*` | Only if unmodified or explicit replace | **Yes** |
| **Adapters** | `scripts/nav-refresh-index.mjs` | Same as skills | **Yes** |
| **Instruction pastes** | CLAUDE.md / AGENTS.md blocks | AI-assisted merge only | Soft (block marker comments) |
| **Built-in routines** | package `templates/routines` | N/A (read from package) | No |
| **Vault routine overrides** | `<vault>/templates/routines` | Never auto-delete | Optional |

### 8. Gaps that make future updates hard *right now*

1. **No install/update inventory** of which files an adopter is expected to have, with class tags.
2. **No stamp of which package/SPEC version last touched the repo** (config has shape version only; no `packageVersion`, no `specVersion`, no answers file).
3. **Skills/adapters outside `init`** — not even additive create, so tooling cannot “ensure latest skills exist.”
4. **DATE substitution at copy time** destroys byte-equality with package templates → “unmodified?” detection needs stored hash of *source* template, not equality to current package file with placeholders.
5. **Dogfood does not vendor skills** under `.claude/skills` — so this repo itself is not a realistic multi-repo skill-drift lab.
6. **CHANGELOG has no adopter migration sections.**
7. **Tolerant config merge hides needed migrations** (unknown old keys ignored; missing new keys silently defaulted — good runtime, poor “what should I adopt intentionally?” UX).

---

## Recommendations for memory-atlas (concrete, prioritized)

### P0 — Stamp metadata **now** (cheap, unblocks everything)

Add fields / files that do not change behavior yet, so five new minds do not start untracked.

1. **Extend `atlas.config.json` (keep `version: 1` or bump to 2 only if required):**
   - `tool.packageVersion` — last applied `memory-atlas` semver (string)
   - `tool.specVersion` — last applied SPEC frontmatter version (string, e.g. `"0.1"`)
   - `tool.updatedAt` — ISO date of last successful update/init apply
   - Optionally `tool.initCommit` / `tool.updateCommit` of the package when known

2. **Write a small provenance manifest at init (and later update), e.g. `.atlas/provenance.json` or `atlas.lock.json` at repo root** (pick one; prefer **not** inside the vault so Obsidian users don’t treat it as knowledge):

   ```json
   {
     "packageVersion": "0.1.0",
     "specVersion": "0.1",
     "configShapeVersion": 1,
     "files": {
       "skills/atlas-nav/SKILL.md": {
         "class": "portable-skill",
         "source": "skills/atlas-nav/SKILL.md",
         "sourceSha256": "...",
         "policy": "update-if-unmodified"
       },
       "my-app-atlas/templates/zone.md": {
         "class": "note-template",
         "source": "templates/notes/zone.md",
         "sourceSha256": "...",
         "policy": "update-if-unmodified"
       }
     }
   }
   ```

   Policies: `update-if-unmodified` | `never` | `merge-assist` | `regenerate`.

3. **Marker comments for pasted instruction blocks** in ONRAMP (non-breaking):

   ```markdown
   <!-- atlas:onramp-block begin version=0.1.0 -->
   ...
   <!-- atlas:onramp-block end -->
   ```

   Enables AI update skill to locate the block without swallowing the rest of CLAUDE.md.

4. **Hash package template *before* `{{DATE}}` substitution** (store pre-substitution hash in provenance). Current DATE bake-in is the main reason naive equality checks fail.

5. **Document file classes in SPEC or `docs/UPDATE.md`** (regenerable / portable / scaffold / user-owned) so CHANGELOG entries can say “portable-skill change — re-run update” vs “engine-only.”

### P1 — Ship detection before mutation: `atlas doctor` / `atlas update --dry-run`

Before any writer:

- Resolve package version, SPEC version, config shape, vault presence, skills dir contents, adapter path, hooks presence.
- Compare provenance hashes → report: **missing / unmodified-outdated / modified-diverged / unknown-local**.
- Exit non-zero in CI optional mode when portable skills are outdated and unmodified (safe auto-fix candidate).

This can be pure read-only and still massively help the five-repo rollout.

### P2 — Three candidate “update to latest” mechanisms (AI-skill-driven)

All three assume P0 provenance. Prefer implementing **A + B** (CLI inventory + skill executor); treat **C** as optional later.

#### Candidate A — **Classed file sync + AI merge skill** (recommended primary)

**Shape:**

- Deterministic core: `atlas update [--dry-run] [--apply]` reads package tree + provenance + local config.
- Per class:
  - **regenerable:** run `atlas build` (already exists).
  - **portable-skill / adapter / scaffold-template:** if local hash == last applied source hash → overwrite from package and refresh provenance; if diverged → **do not overwrite**; emit a conflict record (path, package diff, local path).
  - **config:** deep-merge *new default keys only*; never reset user values; optionally rewrite `$schema` path; bump recorded `tool.*` stamps; if `config.version` shape break → hand off to migration module.
  - **user-owned vault notes:** never touch.
  - **instruction blocks:** AI-only path (see below).

- **AI skill `atlas-update` (or extend recollection):** for each diverged portable file and for CLAUDE/AGENTS blocks, perform a **3-way reasoning merge**:
  - base = content at last provenance `sourceSha256` (package must keep old versions **or** store base blob in provenance / git tag)
  - local = current file
  - latest = current package file  
  Agent proposes patch; human or `--apply` with review applies. This is copier-like 3-way thinking without requiring Python copier as a runtime dep (fits zero-dependency ethos if the *engine* stays Node and the *merge* is agent-side).

**Respects customizations:** diverged files never silent-clobber; config merges; vault content sacred.

**Needs from P0:** provenance + retention of previous source hashes (or tagged package versions in git so base can be fetched).

#### Candidate B — **“Thin adopter” model: stop vendoring skills; pin package**

**Shape:**

- ONRAMP prefers **skill search path → installed package** (or symlink skills to `node_modules/memory-atlas/skills/*`) rather than copy.
- Adopter repo stores only: vault + `atlas.config.json` + thin CLAUDE pointer + optional adapter.
- Update = `npm update memory-atlas` (+ `atlas doctor`).

**Pros:** eliminates skill drift class entirely (matches agentic-sage symlink approach).  
**Cons:** not all agent hosts resolve skills from node_modules; offline/vendored monorepos still copy; CLAUDE blocks and vault templates still drift.  
**Hybrid:** package-default skills via symlink when possible; provenance still tracks copies when copy is required.

#### Candidate C — **Copier/cookiecutter-style answers file + external template apply**

**Shape:**

- Treat memory-atlas `templates/` + skills + ONRAMP fragments as a template project.
- Store `.atlas-answers.yml` (vault name, modules, skills dir, hooks on/off).
- `copier update` or a Node reimplementation using git ancestry of the template.

**Pros:** battle-tested update UX ([Copier updating docs](https://copier.readthedocs.io/en/stable/updating/)).  
**Cons:** adds Python toolchain or reimplementation cost; vault *content* must be excluded from template paths carefully; conflicts still need resolution; fights “zero runtime deps” if copier becomes required for adopters.

**Verdict:** use Copier as a **design metaphor** (answers + version + 3-way), not necessarily as the runtime, unless open-source consumers already live in Python-heavy environments.

### P3 — Migration pipeline for SPEC/config shape breaks

When `SPEC` 0.1→0.2 or `config.version` 1→2:

1. Ship `lib/migrations/v1-to-v2.mjs` (pure transforms + report).
2. `atlas update` runs migrations **before** file sync.
3. CHANGELOG gains mandatory sections: **Engine**, **Portable artifacts**, **Migrations**, **Manual agent steps**.
4. Never auto-rewrite zone cards except mechanical frontmatter renames listed in migration (and only with backup / dry-run).

### P4 — Init improvements that help updates (without becoming update)

- `atlas init --modules X` on existing vault should **merge** `modules.X=true` into existing config (today skipped).
- Optional `atlas init --refresh-templates --only-unmodified` once provenance exists.
- Copy (or symlink) portable skills as part of init when `skills.dir` is set — so skills enter provenance from day one.

### P5 — Fleet rollout posture for the five new repos

1. Install package as a **devDependency** (pin minor until 1.0) so CI and agents share one version.  
2. Run init + ONRAMP with **provenance enabled** (P0).  
3. Prefer skill path / symlink (Candidate B) where the agent host allows.  
4. Run `atlas doctor` in CI as warn-only until stable.  
5. Defer syndcast re-platform; treat it as migration profile “pre-atlas-mind,” not as the template for new repos.

### Suggested sequencing (pragmatic)

| Step | Deliverable | Unblocks |
|---|---|---|
| 1 | Provenance + `tool.*` stamps + ONRAMP markers | All update designs |
| 2 | `atlas doctor` / `update --dry-run` | Safe ops on 5 repos |
| 3 | Deterministic apply for unmodified portables | 80% of skill/template updates |
| 4 | AI skill for diverged + CLAUDE blocks | Customization-respecting remainder |
| 5 | SPEC/config migrations as needed | Pre-1.0 churn without fleet pain |

---

## Open questions

1. **Should portable skills be copied into every repo, symlinked, or resolved from the package?** Host support differs (Claude Code project skills vs global vs Grok paths). This choice dominates update complexity.
2. **Where should provenance live?** Repo-root `atlas.lock.json` vs `.atlas/provenance.json` vs fields only in `atlas.config.json`. Vault-internal is wrong (pollutes knowledge graph); root noise vs clarity tradeoff.
3. **Must package keep historical template blobs for true 3-way merges**, or is “latest vs local with human intent” enough for v0.x?
4. **Is `config.version` ever going to drive code paths**, or should it be replaced/supplemented by `tool.specVersion` + explicit migrations table?
5. **Will adopters pin `memory-atlas` as a dependency** (recommended) or only use `npx` from npm latest? Provenance and CI reproducibility differ.
6. **How far should update go into instruction files?** Auto-merge CLAUDE.md is high-value and high-risk (other agents’ blocks co-live). Marker comments + AI skill is safer than regex replace.
7. **Syndcast migration timeline:** does the first mind need an adapter profile (`vaultDir`, custom generators, `entity` extension) before any fleet updater claims “all minds”?
8. **Open-source packaging:** until GitHub/npm launch completes (`docs/LAUNCH-CHECKLIST.md`), update story for *external* adopters is theoretical; internal five repos can still dogfood doctor/provenance against a path/git dependency.
9. **Routines precedent:** should note templates switch to “package default + vault override” like routines, instead of one-shot copy? That would shrink scaffold drift but change author UX for “edit template in vault.”
10. **MongoDB `atlas` binary collision** (launch checklist): does the dual bin name (`memory-atlas`) imply docs/hooks should standardize on `memory-atlas` for updaters to avoid PATH skew across machines?

---

## Appendix A — Evidence index (local paths)

| Claim | Evidence |
|---|---|
| No update command | `bin/atlas.mjs` COMMANDS map |
| Single changelog release | `CHANGELOG.md` |
| Config version unused for migration | `lib/config.mjs` (no `.version` branch); schema description only |
| Init never overwrites | `lib/init.mjs` `ensureFile`; `test/init.test.mjs` idempotent snapshot |
| Skills are copy/path, not init | `docs/ONRAMP.md` §4 steps 4–5; `atlas/map/zones/agent-onramp.md` |
| Routine shadowing | `lib/routine.mjs` vault then built-in |
| Regenerable index | `lib/validate.mjs` / `bin/atlas.mjs` buildCore; banner in `atlas/map/index.md` |
| SPEC versioning policy | `SPEC.md` §Versioning |
| Adoption = first migrate, not upgrade | `docs/ADOPTION.md` |
| Skill drift history | `advisor-plans/004-skills-onramp-and-retrieval-adapters.md` |
| Syndcast not on atlas CLI | `syndcast/package.json` `mind:*`; no `atlas.config.json`; local `scripts/build-map.ts` |
| Skill text already diverged | diff syndcast vs package `writing-for-retrieval` |
| SAGE conservative re-wire | `agentic-sage/lib/wiring.mjs`, `SETUP.md` upgrade notes |
| Copier 3-way metaphor | https://copier.readthedocs.io/en/stable/updating/ |

## Appendix B — “Update story” one-liner for SPEC/README later

> **Today:** upgrading memory-atlas upgrades the verifier engine; vault knowledge is yours forever; portable on-ramp files (skills, adapters, scaffolds) are copy-once and do not auto-refresh.  
> **Target:** provenance-stamped portable files refresh when unmodified; diverged files and instruction blocks are AI-merged with explicit review; zone cards and ledger notes are never tool-mutated except declared mechanical migrations.
