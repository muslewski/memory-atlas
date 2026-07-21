# Template-update mechanics for multi-repo convention propagation

Research date: 2026-07-17  
Scope: how scaffolding/template tools propagate **template updates** while preserving user modifications; map to memory-atlas markdown vault conventions across many adopting repos.  
Out of scope: syndcast-mind `visuals/`.

## Summary

- **Two families dominate:** (A) *replay + patch* tools that re-render old/new template snapshots and apply a git-style diff to the project (Copier, Cruft/Cookiecutter); (B) *owned synthesis* tools that re-generate managed files from code and forbid hand-edits (projen); (C) *versioned codemods* that transform project state along a package upgrade path (Nx migrate); (D) *interactive conflict gate* generators with no durable update story (Yeoman).
- **Copier** (~3.5k★, [copier-org/copier](https://github.com/copier-org/copier)) is the strongest lifecycle model for “template evolves, project evolves”: `.copier-answers.yml` + Git-tagged template versions + 3-way-style merge (fresh-old vs current project, then apply new template, re-apply project diff) + pre/post **migrations** + conflict modes `inline` | `rej`.
- **Cruft** (~1.6k★, [cruft/cruft](https://github.com/cruft/cruft)) bolts updates onto Cookiecutter (~25k★): `.cruft.json` stores template URL + commit + context; update regenerates old-commit and new-commit trees, `git diff --no-index`, then `git apply -3` with fallback to `git apply --reject` (`.rej` files). Skip lists and `cruft check` / fleet PRs are practical ops patterns.
- **Projen** (~2.9k★, [projen/projen](https://github.com/projen/projen)) solves multi-repo consistency by **never letting users edit synthesized files** — only `.projenrc.*` is owned by humans; `npx projen` overwrites managed files. Excellent for config/CI, a poor fit for a *hand-authored knowledge vault*.
- **Nx migrate** (~29k★, [nrwl/nx](https://github.com/nrwl/nx)) is the best *codemod* model: two-phase (`migrate` → edit `package.json` + emit `migrations.json` → `migrate --run-migrations`), version-scoped generators, optional **prompt/AI hybrid** migrations for non-deterministic changes.
- **Yeoman** (~10k★ tool / ~1.3k★ generator) only has **per-write Conflicter** (ask overwrite/skip on each file); no answers-file lifecycle update. Treat as historical baseline for “safe overwrite UX,” not as an update platform.
- **Hard lesson from production cruft use:** long-lived fat templates cause conflict fatigue; teams abandon updates. Prefer **thin convention surface + versioned CLI/package** (Dumont 2025 critique of cookiecutter+cruft).
- **For memory-atlas:** split the adopting-repo surface into **toolkit-owned** (CLI binary/package, schema, default templates, check rules), **user-owned** (zone cards, decisions, specs, local config toggles), and **mergeable** (CLAUDE.md atlas section, skill stubs, ONRAMP snippets). Replay-merge alone is insufficient for prose vaults; **versioned migrations + ownership model + AI agent for mergeable markdown** is the right hybrid.
- **Best prior-art hybrid for “update to latest” skill:** Copier’s *state file + migrations + conflict markers* × Nx’s *two-phase plan then apply* × projen’s *owned vs free files* × agentic resolution of residual conflicts (Nx already ships prompt-based migrations).

## Findings

### 1. Problem statement (shared across tools)

Once a project is generated from a template, three timelines diverge:

1. **Template evolution** — convention authors add files, fix security defaults, rename keys.
2. **Project evolution** — adopters edit generated files, delete pieces, add local overrides.
3. **Answer / config evolution** — original questionnaire answers no longer match current needs.

Naive re-copy **destroys** (2). Never updating **starves** (1). The tools below are different bets on which of those losses is acceptable.

---

### 2. Copier — answers file + smart update (primary reference)

| | |
|---|---|
| Repo | [copier-org/copier](https://github.com/copier-org/copier) (~3.5k★, 2026-07) |
| Docs | https://copier.readthedocs.io/en/stable/updating/ |
| Language | Python; Jinja templates; `copier.yml` |

**State carried in the project**

- `.copier-answers.yml` (configurable via `_answers_file`): last answers + `_src_path` + `_commit` (template VCS ref).
- Template must be **Git-versioned with tags** (PEP 440) for reliable updates.
- Destination project should itself be Git-clean before update.

**Update algorithm** (official diagram, paraphrased):

1. Clone template at **current recorded tag** and at **target tag**.
2. Regenerate a **fresh project** from the old tag using stored answers (plus run tasks as configured).
3. **Diff** `fresh_old` → `current_project` → captures “what the user changed.”
4. Apply **pre-migrations** to the real project.
5. Re-render project from **latest** template (prompting; defaults from last answers) → `updated_project`.
6. **Re-apply** the user diff onto `updated_project`.
7. Apply **post-migrations**.

This is deliberately 3-way thinking with a synthetic base (`fresh_old`), not a pure git merge of template history into the project.

**Conflict handling**

- `--conflict inline` (default): git-merge-style markers in files.
- `--conflict rej`: leave unresolved hunks in `*.rej`.
- `--context-lines` (default 1; git often uses 3): trade accuracy vs number of conflicts.
- Docs strongly recommend pre-commit hooks (`check-merge-conflict` or forbid `*.rej`).
- Deleted template-derived paths stay deleted on later updates (recovery via `copier recopy`); `skip_if_exists` paths are always re-ensured if missing.

**Migrations (version-gated tasks)**

- `_migrations` entries with `command`, optional `version` (PEP 440), `when`, `working_directory`.
- Run only when `new_version >= declared > old_version`.
- Stages `before` / `after` via `$STAGE`; env exposes `$VERSION_FROM` / `$VERSION_TO` (and PEP440-normalized variants).
- Tasks/migrations can run arbitrary code → require `--trust` / `--UNSAFE`.

**Answers discipline**

- **Never hand-edit** `.copier-answers.yml` — breaks the smart-diff assumption.
- Change answers via `copier update --defaults --data key=value` or `--vcs-ref=:current:` (answers only, no template bump).

**Ops**

- `copier check-update` with JSON/`--quiet` exit codes for CI / Renovate-style automation (GitLab common-ci-tasks have used Renovate to drive Copier updates).

**Evidence / practice notes**

- Official comparison table claims **template updates: Copier yes, Cookiecutter no (use Cruft), Yeoman no** — https://copier.readthedocs.io/en/stable/comparisons/
- Practitioners emphasize `_subdirectory: template`, pre-commit conflict hooks, and modular multi-template composition with distinct answers files (Brownian Tech, 2025).

**Transferable primitives:** durable answers/version pin; synthetic 3-way; versioned migrations; skip_if_exists; deleted-path memory; CI check-update; explicit conflict format.

---

### 3. Cruft + Cookiecutter ecosystem

| | |
|---|---|
| Cookiecutter | [cookiecutter/cookiecutter](https://github.com/cookiecutter/cookiecutter) (~25k★) — one-shot Jinja scaffold |
| Cruft | [cruft/cruft](https://github.com/cruft/cruft) (~1.6k★) — https://cruft.github.io/cruft/ |

**Cookiecutter alone has no update.** Issue #784 (2016+) is the long-running “how do I update?” discussion; Cruft is the community answer.

**Cruft state:** `.cruft.json` — `template` URL, `commit` SHA, cookiecutter `context`, optional `skip` globs (also `pyproject.toml` `[tool.cruft] skip`).

**Update algorithm** (from `cruft/_commands/update.py` + `utils/diff.py`, master branch):

1. Require clean git worktree (optional allow-untracked).
2. Clone template repo; if HEAD == recorded commit and no variable refresh → no-op.
3. Cookiecutter-render **old** tree at recorded commit (same context).
4. Cookiecutter-render **new** tree at latest (or checkout) commit; optionally refresh private `_` variables / CLI variable overrides.
5. `git diff --no-index --binary` between old and new expanded trees (normalized prefixes `upstream-template-old/` / `...-new/`).
6. Prompt: apply / view / skip-mark-updated / cancel.
7. Apply patch: prefer **`git apply -3`** (three-way) in a git repo; on failure if tree still “clean”, fall back to **`git apply --reject`** → `*.rej`.

**Extra features**

- `cruft check` — exit 1 if template commit drifted (CI-friendly).
- `cruft diff` — local project vs template expansion (drift detection; can enforce “push improvements upstream”).
- `cruft link` — attach an already-cookiecutter’d project after the fact.
- Documented GitHub Actions pattern: scheduled job opens **two PRs** — accept update (full tree) vs reject (only bump `.cruft.json`).

**Conflict-resolution model:** patch application, not full Copier-style “user-diff re-apply after re-render.” Critics note that when both template and project edited the same region, conflicts resemble git merges but are **harder than real 3-way** because there is no shared object ancestry in the project history (Dominique Dumont, Feb 2025, “Drawbacks of using Cookiecutter with Cruft”).

**Operational failure mode (highly relevant):** users hit large conflict sets, roll back, and **stop taking updates** — including security/compliance fixes. Recommended escapes: thin templates; move logic into versioned libraries; one-shot CLI scaffold; treat template as non-updatable after create.

**Transferable primitives:** skip globs for “user forever” paths; check + fleet PR automation; accept/reject dual-PR; variable re-answer without full regenerate; link brownfield projects.

---

### 4. Projen — owned-files / continuous synthesis

| | |
|---|---|
| Repo | [projen/projen](https://github.com/projen/projen) (~2.9k★) |
| Docs | https://projen.io/docs/introduction/ |
| Model | “CDK for project configuration” |

**Core bet:** scaffolding is **continuous**, not one-shot. Humans only edit `.projenrc.js|ts|py|java|json`. Running `projen` synthesizes `package.json`, tsconfig, workflows, eslint, etc. Synthesized files are:

- Marked managed (often read-only on disk),
- Listed in projen’s internal file inventory,
- Protected by **anti-tamper CI** (build fails if generated files were hand-edited).

**“Update” across dozens of repos** = bump the shared project-type package / change `.projenrc` options → re-synth. There is no 3-way merge of user edits into managed files — **user edits of managed files are invalid by definition**.

**Escape hatches:** some components allow non-managed files; custom components extend ownership. But the philosophy is ownership clarity, not conflict resolution.

**Transferable primitive (critical for atlas):** explicit **file ownership classes**. Anything the toolkit must keep consistent should be toolkit-owned and re-synced; anything that is knowledge content must be user-owned and never overwritten. Ambiguous “sometimes template, sometimes hand-edited” is the cruft failure mode.

**Anti-transfer:** do **not** make zone cards / decisions projen-style managed files. That would destroy the product (human/agent-authored understanding).

---

### 5. Nx migrate — versioned codemods (+ optional AI)

| | |
|---|---|
| Repo | [nrwl/nx](https://github.com/nrwl/nx) (~29k★) |
| Docs | https://nx.dev/docs/features/automate-updating-dependencies ; migration generators guide |

**Problem solved:** not “re-apply a project template,” but “upgrade packages across breaking changes while transforming config and source.”

**Two-phase protocol:**

1. **`nx migrate`** — resolve target versions; rewrite `package.json`; write **`migrations.json`** listing pending generators (and packageJsonUpdates). *No source tree rewrite yet.* Operator can edit versions / drop migrations.
2. **Install packages**, then **`nx migrate --run-migrations`** — run generators in order; each may be:
   - **Generator-only** (deterministic AST/config rewrites),
   - **Prompt-only** (AI-aided, non-deterministic judgment),
   - **Hybrid** (generator then agent validation/completion).

**Design strengths**

- Migrations are **version-scoped** (only fire for the jump you’re taking).
- Plugins declare migrations in `migrations.json` (`version`, `description`, `implementation`).
- Large monorepos can commit **per-migration**, keep `migrations.json` until old branches catch up.
- Explicit recognition that some upgrades **cannot** be pure codemods → agentic step with human review.

**Transferable primitives:** two-phase “plan then apply”; version-gated migration registry; deterministic codemods for structured data; AI prompts for residual judgment; keep migration ledger until fleet is green.

---

### 6. Yeoman — Conflicter (write-time only)

| | |
|---|---|
| Tooling | [yeoman/yeoman](https://github.com/yeoman/yeoman) (~10k★), [yeoman/generator](https://github.com/yeoman/generator) (~1.3k★) |
| Docs | https://yeoman.io/authoring/file-system |

**Model:** every write to an existing file goes through **Conflicter** — compare content, if different prompt user (overwrite / skip / abort; force/skip flags for automation). There is **no** answers file for lifecycle updates, **no** template version pin, **no** synthetic 3-way.

Useful historically for “don’t silently clobber.” Insufficient for “propagate convention v3 → v7 across 30 repos.” SPFx’s move away from Yeoman toward a dedicated CLI (2026 notes) underscores the lifecycle gap.

**Transferable primitive:** interactive overwrite gate as a **last-mile UX** when an agent/tool proposes writing a file the user already customized.

---

### 7. Cross-tool comparison (conflict-resolution models)

| Tool | State pin | Update engine | User-edit preservation | Conflict UX | Versioned transforms | Multi-repo scale pattern |
|---|---|---|---|---|---|---|
| **Copier** | `.copier-answers.yml` + template tag | Synthetic 3-way (regen old, diff user, apply new, re-apply user) | Strong when diffs clean | inline markers or `.rej` | `_migrations` | check-update + Renovate/CI |
| **Cruft** | `.cruft.json` + template SHA | Diff old/new renders → `git apply -3` / `--reject` | Medium; skip lists | `.rej` / failed apply | None (only template commits) | scheduled dual PRs + `cruft check` |
| **Cookiecutter** | optional replay JSON | None | N/A | overwrite | None | regenerate manually |
| **Projen** | `.projenrc` + package versions | Full re-synth of managed files | Only via rc code; managed files not editable | Anti-tamper fail | Dependency upgrade tasks | shared project type package |
| **Nx migrate** | package versions + migrations.json | Codemod generators (+ optional AI) | By construction of generators | Review unstaged / per-migration commits | First-class | monorepo-native; per-plugin migrations |
| **Yeoman** | none durable | Re-run generator writes | Interactive per file | Conflicter prompts | ad-hoc | weak |

**Conceptual spectrum**

```
overwrite freely          merge intelligently           forbid hand-edit
Yeoman force ── Cookiecutter ── Cruft ── Copier ── Nx codemods ── projen
                                              │
                                              └── AI residual (Nx hybrid, agent skills)
```

---

### 8. What does and does not transfer to a markdown knowledge-vault convention

Context: memory-atlas ships a **CLI + schema + templates + vault layout** (`atlas/`, `atlas.config.json`, zone cards, decisions, skills, CLAUDE.md conventions). Adopters customize heavily: module toggles, zone taxonomy, hand-written knowledge, local anchors. Sibling tools (agentic-sage, token-oracle) already show **install/upgrade of tooling** as package + non-clobbering installers — separate from **content** updates.

#### 8.1 Mechanics that transfer well (deterministic)

| Mechanic | Source | Atlas application |
|---|---|---|
| **Version pin in repo** | Copier answers / Cruft commit / package version | Record `conventionVersion` + toolkit package version in `atlas.config.json` or `atlas.lock.json` |
| **Owned vs free files** | Projen | Manifest: toolkit-owned (`schema/*` copies?, default note templates, `atlas check` rules shipped with CLI), user-owned (`map/zones/*`, decisions, specs, plans, tech-debt), mergeable (`CLAUDE.md` atlas block, skills stubs) |
| **skip_if_exists / skip globs** | Copier / Cruft | Never overwrite existing zone cards, decisions, or user templates; only seed missing scaffold files |
| **Thin scaffold + fat library** | Dumont critique / projen | Ship **logic in the `atlas` CLI package** (check, stamp, build, schema validation). Vault holds data + thin convention docs, not reimplemented tool code |
| **Versioned migrations** | Copier migrations / Nx | `atlas migrate` registry: e.g. rename frontmatter enums, move folder keys, enable new schema fields, rewrite `verifiedAt` policy notes |
| **Two-phase plan** | Nx | `atlas update --plan` → write proposed file ops + migration list → human/agent review → `atlas update --apply` |
| **check / drift CI** | Cruft check, Copier check-update | `atlas outdated` / `atlas doctor` exit codes for “convention behind latest” |
| **Additive init** | memory-atlas `atlas init` (already) | Keep: re-init never clobbers; only creates missing structure (`docs/ADOPTION.md`) |
| **Non-clobbering installer** | agentic-sage `install.mjs` | Install skills/hooks: backup, skip-if-present, abort on malformed settings |

#### 8.2 Mechanics that transfer poorly without redesign

| Mechanic | Why it breaks on vaults |
|---|---|
| **Full-tree template re-render** | Knowledge notes are not parameterized clones of a template; re-render would invent wrong content or conflict on every line of prose |
| **Projen “never edit managed files” for zones** | Product requires human/agent authorship of understanding |
| **Line-oriented 3-way on CLAUDE.md** | Instruction prose is reordered/rewritten; synthetic base quickly diverges → marker soup |
| **Fat cookiecutter of entire atlas/** | Guarantees cruft abandonment at fleet scale |
| **Yeoman re-run as “update”** | No version awareness; pure overwrite UX |

#### 8.3 Where an AI agent is the right executor

Use an agent (skill-driven “update to latest”) when the change is **semantic** rather than **mechanical**:

1. **Mergeable markdown** — fold new convention sections into existing `CLAUDE.md` / `AGENTS.md` without deleting local rules; preserve local path preferences and pipeline lines.
2. **Schema/enum migrations that touch free-form notes** — e.g. lifecycle status renames across heterogeneous frontmatter (`docs/ADOPTION.md` already enumerates common renames); agent can map with judgment + report leftovers.
3. **Brownfield adoption** — inventory existing ADRs/TODOs into vault shapes (already described in `docs/ADOPTION.md`); not a patch apply.
4. **Conflict resolution after deterministic steps** — run codemods first; agent resolves residual inline markers or proposes dual PRs (accept toolkit change vs keep local).
5. **Module-aware enablement** — respect `atlas.config.json` `modules.*` and local `anchors`/`retrieval` config; do not force-enable flows/programs/vision.
6. **Skill/projection updates** — vendored third-party skills must not be tombstoned (CLAUDE.md rule); agent must distinguish atlas projections from user skills.

**Nx’s hybrid migration model is the closest product precedent:** generators for deterministic bits, prompts for judgment, optional agent runtime.

#### 8.4 Recommended architecture for memory-atlas updates (conceptual)

```
┌─────────────────────────────────────────────────────────────┐
│  memory-atlas release N  (CLI package + convention pack)    │
│  - migrations/*.ts|js  (version-gated)                      │
│  - ownership.json      (owned | free | mergeable globs)     │
│  - convention pack     (default templates, CLAUDE fragment) │
└────────────────────────────┬────────────────────────────────┘
                             │
         atlas update --plan │ (read-only proposal)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  adopting repo                                              │
│  atlas.config.json  (local toggles; conventionVersion pin)  │
│  ownership-respecting ops:                                  │
│    owned     → overwrite/sync from pack                     │
│    free      → never touch                                  │
│    mergeable → markers OR agent merge                       │
│  migrations  → codemod frontmatter / config keys            │
└────────────────────────────┬────────────────────────────────┘
                             │
              atlas update --apply (+ optional agent skill)
                             ▼
                    atlas check  → green or residual report
```

**Not recommended:** shipping the entire vault as a Copier/Cruft template and expecting `copier update` to be the sole mechanism. **Recommended:** Copier/Cruft-style **state + 3-way thinking only for the thin convention pack**, projen-style **ownership**, Nx-style **migrations**, agent skill for **mergeable layer**.

---

### 9. Evidence index (web + local)

**Web / projects**

| Project | Stars (approx, 2026-07 API) | URL |
|---|---:|---|
| cookiecutter/cookiecutter | ~25,000 | https://github.com/cookiecutter/cookiecutter |
| nrwl/nx | ~29,100 | https://github.com/nrwl/nx |
| yeoman/yeoman | ~10,100 | https://github.com/yeoman/yeoman |
| copier-org/copier | ~3,500 | https://github.com/copier-org/copier |
| projen/projen | ~2,900 | https://github.com/projen/projen |
| cruft/cruft | ~1,600 | https://github.com/cruft/cruft |
| yeoman/generator | ~1,300 | https://github.com/yeoman/generator |

**Primary docs / sources used**

- Copier updating: https://copier.readthedocs.io/en/stable/updating/
- Copier configuring (migrations, skip_if_exists, answers file): https://copier.readthedocs.io/en/stable/configuring/
- Copier comparisons: https://copier.readthedocs.io/en/stable/comparisons/
- Cruft docs: https://cruft.github.io/cruft/
- Cruft source: `cruft/_commands/update.py`, `cruft/_commands/utils/diff.py` (git apply -3 / --reject)
- Projen README / intro: https://github.com/projen/projen/blob/main/README.md , https://projen.io/docs/introduction/
- Nx migrate: https://nx.dev/docs/features/automate-updating-dependencies
- Nx migration generators: https://nx.dev/docs/extending-nx/migration-generators
- Yeoman filesystem / Conflicter: https://yeoman.io/authoring/file-system
- Dumont 2025 cruft drawbacks: https://ddumont.wordpress.com/2025/02/06/drawbacks-of-using-cookiecutter-with-cruft/
- Brownian Tech Copier practices: https://www.browniantech.com/blog/post/Effective-Repository-Templates-with-Copier

**Local repo analysis (read-only)**

- `/home/kento/Repositories/memory-atlas/docs/ADOPTION.md` — brownfield migration, additive `atlas init`, status enum renames, coexistence, rollback
- `/home/kento/Repositories/memory-atlas/atlas.config.json` — versioned config, modules, anchors, retrieval, skills, hooks
- `/home/kento/Repositories/memory-atlas/templates/` — config / notes / routines / vault scaffolds
- `/home/kento/Repositories/agentic-sage/README.md` — non-clobbering install, upgrade-safe npm package model
- `/home/kento/Repositories/token-oracle/README.md` — install/run-latest patterns

## Recommendations for memory-atlas

Prioritized for “5 new minds now, dozens later, open-source later.”

### P0 — Define ownership + version pin (this week)

1. **Publish an ownership manifest** (even as a design table before code):  
   - **Toolkit-owned:** anything regenerated by the CLI package (check rules, schema defaults shipped with binary, optional vendored skill *if* marked projection).  
   - **User-owned:** all knowledge notes under vault folders, custom templates under vault `templates/` if forked, local hooks.  
   - **Mergeable:** root agent instruction fragments (CLAUDE.md atlas section), install-time skill stubs, ONRAMP snippets.  
2. **Add `conventionVersion` (or dual pin: `toolkitVersion` + `conventionVersion`)** to `atlas.config.json` schema; write it on `atlas init` / first successful update.  
3. **Keep fat logic in the CLI package**, not in copied vault files — avoid the cookiecutter “hundreds of diverged copies” trap.

### P1 — `atlas outdated` + migration registry (before 5-repo fleet pain)

4. Implement **`atlas outdated` / `atlas doctor`** (cruft-check analogue): compare pin to latest published convention, exit non-zero for CI.  
5. Implement **versioned migrations** (Nx/Copier analogue) for *structured* changes only:  
   - config key renames,  
   - frontmatter enum renames,  
   - folder layout moves declared in schema,  
   - default module flag introductions (default **off** to respect local config).  
6. **Two-phase UX:** `--plan` (JSON/markdown ops list) then `--apply`. Never silent overwrite of free/mergeable paths.

### P2 — AI skill “update to latest” for mergeable layer

7. Ship a skill (e.g. `atlas-update` / `/atlas-update`) that:  
   - runs deterministic migrations first,  
   - syncs toolkit-owned files,  
   - **agent-merges** mergeable markdown with explicit preserve-local rules,  
   - leaves a residual report (not fake success),  
   - ends with `atlas check`.  
8. Borrow **Nx hybrid** framing: generators for deterministic, prompts for judgment; prefer PR-per-repo over force-push.  
9. Support **accept vs reject** fleet workflow (Cruft dual-PR): bump pin without taking content changes when a repo opts out of a convention bump.

### P3 — Scaffold thin, adopt brownfield carefully

10. Greenfield: `atlas init` + ONRAMP only (already solid).  
11. Brownfield: keep ADOPTION.md agent-driven inventory; do **not** try to encode full brownfield import as a template patch.  
12. If using Copier/Cruft at all, use them **only** for a thin “convention pack” (config defaults + instruction fragment + empty folder tree), never for populated zone content.  
13. Document **anti-patterns:** hand-editing version pin; editing toolkit-owned files; fat templates with business logic; automatic stamp of seeded zones.

### P4 — Open-source readiness

14. Mirror agentic-sage/token-oracle install story: package-upgradable CLI, non-clobbering skill install, explicit uninstall/rollback (`docs/ADOPTION.md` already notes vault+config delete is clean).  
15. Public docs should show the ownership table and “what update will never touch.”

## Open questions

1. **Single pin vs dual pin?** Is the atlas CLI package version sufficient as the convention version, or can convention packs release independently of CLI (like Nx plugins vs core)?
2. **Where does the ownership manifest live** — in the CLI package only, or also a copy in each repo for offline agent use?
3. **Mergeable CLAUDE.md strategy:** section markers (`<!-- atlas:begin -->`), whole-file ownership of a fragment under `atlas/CONVENTIONS.md` included by reference, or pure agent merge without markers?
4. **Should `atlas update` ever invoke Copier as a library**, or reimplement the thinner subset (pin + ownership sync + migrations) in Node to match the existing toolchain?
5. **Fleet automation:** Renovate/GitHub Action that only opens “convention outdated” PRs, leaving apply to humans/agents — what’s the desired default for private multi-repo vs public OSS adopters?
6. **How to version migrations when modules are optional?** (e.g. migration for `programs/` must no-op if module disabled.)
7. **Interplay with recollection (`atlas stamp`, `map/index.md`):** is index rebuild always post-update, and can update force re-stamp? (Probably never auto-stamp — SPEC honesty.)
8. **Vendored skills vs atlas projections:** need a durable marker so update never deletes third-party skills (CLAUDE.md already forbids this — enforce in ownership manifest).
9. **Conflict policy for open-source adopters** who heavily fork note templates — skip globs in config, or first-class `overrides/` directory?
10. **Can/should Nx-style AI hybrid migrations be first-class in atlas**, or remain an external skill that shells `atlas update --plan`?

---

*Read-only research; single deliverable. No repository mutations beyond this report file.*
