# Propagating Atlas Convention Changes Across Many Repos

Research date: 2026-07-17  
Scope: multi-repo sync tooling, template update models, and what “Renovate for knowledge-base conventions” would look like for memory-atlas.  
Out of scope: syndcast-mind `visuals/`.  
Method: web research (GitHub READMEs, docs, issues, comparative writeups) plus light local read of memory-atlas layout (`docs/ADOPTION.md`, `schema/atlas.config.schema.json`, `package.json`). No mutating git or installs.

Star counts are approximate as of scrape/HTML sampling on 2026-07-17 (GitHub unauthenticated API was rate-limited; counts from public repo pages).

---

## Summary

- **GitHub Template Repos do not push updates** to children; the ecosystem fills that gap with PR-based sync actions, not native GitHub features.
- **Two complementary sync directions exist:** *pull* (each child repo watches a template — `actions-template-sync` ~326★) and *push* (a hub fans files out — `repo-file-sync-action` ~363★). Both treat human merge of a PR as the safety valve.
- **Renovate (~22k★) is the best mental model for multi-repo propagation at scale:** version detection → grouped PRs → repo-local config merge → rate limits / dashboards / ignore rules. Dependabot (~5.7k★ core) is simpler and less programmable for org-wide policy.
- **Copier (~3.5k★) / cruft (~1.6k★) are the best mechanical models for “template evolved, project customized”:** true 3-way (or template-diff) updates with an answers/lock file; Cookiecutter (~25k★) scaffolds once and does not update.
- **Backstage (~34k★) golden-path templates solve day-0, not day-N:** an open upstream issue (2025) still asks how to propagate template updates to existing projects — same gap memory-atlas must not inherit.
- **Git submodule / subtree / subrepo** work for *shared binary blobs of docs/code*, not for “convention + local config + hand-edited vault.” Submodules pin commits; subtrees vendor history; both fight local edits poorly for knowledge bases.
- **Projen (~2.9k★) “managed files”** is the opposite of memory-atlas’s goal for vault content: synth overwrites managed files. Useful analogy for *CLI/skills/schema* files only, never for zone cards.
- **Meta-repos (`mateodelnorte/meta` ~2.2k★)** orchestrate *workspaces* (clone/exec across many repos); they do not intelligently merge convention files.
- **For memory-atlas, pure file-sync is wrong for vault notes and right (carefully) for package/skills/templates.** The winning design is layered: **semver convention package + pin + PR bot + AI/skill merge for conflicts + hard ownership boundaries** (convention-owned vs repo-owned).
- **“Renovate for knowledge-base conventions”** ≈ versioned `memory-atlas` release stream + adoption lockfile + scheduled PRs that update tooling/skills/templates while **never clobbering** `atlas.config.json` customizations or hand-written vault content without a 3-way/agent merge.

---

## Findings

### 1. Problem shape (why naive sync fails for minds)

memory-atlas is **not** “identical CI YAML in 50 repos.” An adopting repo holds three different kinds of content:

| Layer | Examples | Desired update behavior |
| --- | --- | --- |
| **A. Convention tooling** | `atlas` CLI package, schema, core skills, note scaffolds under `templates/` | Track upstream versions; prefer automatic PRs |
| **B. Local policy** | `atlas.config.json` (folders remap, modules, anchors, hooks, `enabled`) | **Never overwrite**; merge schema/version carefully |
| **C. Local knowledge** | vault zone cards, decisions, specs, plans, debt | **Never bulk-overwrite**; at most advise / migrate formats |

Pure byte-sync (hub overwrites path X in all children) is safe for A-only paths, catastrophic for C, and hostile to B unless `replace: false` / ignore files exist.

Evidence in-repo: config is explicitly designed for per-repo remaps and module toggles (`schema/atlas.config.schema.json`); adoption docs emphasize brownfield migration and coexistence, not forced identical vault trees (`docs/ADOPTION.md`).

---

### 2. PR-based file / template sync (GitHub Actions era)

#### 2.1 `AndreasAugustin/actions-template-sync` (~326★)

- **URL:** https://github.com/AndreasAugustin/actions-template-sync  
- **Marketplace:** https://github.com/marketplace/actions/actions-template-sync  
- **Mechanics:** Runs *in each target (child) repo* on schedule / `workflow_dispatch`. Pulls a configured `source_repo_path` (template or any git source: GitHub/GitLab/etc.), diffs against the child, opens a PR with upstream changes.  
- **Local divergence:** `.templatesyncignore` excludes paths from sync (primary escape hatch). Lifecycle hooks allow injecting custom steps around the sync. Does **not** require shared git history with the template (can merge unrelated trees).  
- **Failure modes:** Auth pain (PAT / GitHub App / SSH for private sources); private template + public target PAT edge cases; ignore-file misconfiguration either clobbers local files or forever skips needed updates; open-PR policy (new PR vs update existing) can create PR noise; semantic conflicts still dumped on human reviewers as raw file diffs.  
- **Fit for memory-atlas:** Good for **consumer-driven** “pull latest convention files” if each adopter installs a workflow. Weak for vault content. Strong precedent that **ignore files + PR review** are the industry default for local customization.

#### 2.2 `BetaHuhn/repo-file-sync-action` (~363★)

- **URL:** https://github.com/BetaHuhn/repo-file-sync-action  
- **Marketplace:** https://github.com/marketplace/actions/repo-file-sync-action  
- **Mechanics:** Runs *in a hub/source repo* on push. Reads `.github/sync.yml` mapping target repos → file/dir lists; opens PRs in each target with diverged content. Supports groups of repos, `dest` remaps, directory sync, `exclude`, Nunjucks templates, optional `deleteOrphaned`, `replace: false` (don’t overwrite existing), labels/reviewers, dry-run.  
- **Local divergence:**  
  - `replace: false` → keep child’s existing file if present  
  - `exclude` → skip paths when syncing dirs  
  - PR review still final authority  
  - Does **not** do 3-way merge of customized files — if `replace` is true (default), **last write from hub wins** after merge.  
- **Failure modes:** Central PAT/App needs write access to **all** targets (security blast radius); target list is static YAML (org growth = config toil); concurrent hub pushes can thrash PR branches; semantic customization of a “shared” file is overwritten next sync; workflow files need elevated App permissions.  
- **Commercial adjacent:** RepoFileSync (https://repofilesync.com/) markets drift dashboards + PR sync (free tier ≤3 repos) — signals that **drift visibility** is the missing product surface after basic PR sync.  
- **Fit for memory-atlas:** Best for **publisher-driven** org-internal fleets (owner’s own 5–20 repos) pushing **A-layer** files only (e.g. shared `atlas-recollection` skill snapshot, default workflow that runs `atlas check`). Not open-source friendly as the primary model (adopters outside your org can’t be push-targets without their consent/tokens).

#### 2.3 `ahmadnassri/action-template-repository-sync` (~19★)

- **URL:** https://github.com/ahmadnassri/action-template-repository-sync  
- **Mechanics:** Template-side action that discovers dependent repos (template relationship + optional explicit list) and syncs outward. Smaller adoption; same conceptual class as push-sync.  
- **Fit:** Worth knowing as “template discovers children”; too small to bet on for open-source convention propagation.

#### 2.4 Cross-cutting: what PR file-sync gets right / wrong

| Gets right | Gets wrong for knowledge conventions |
| --- | --- |
| Human gate via PR | No semantic understanding of frontmatter / modules |
| Explicit ignore / replace flags | Treats customized “same path” as drift to fix |
| Schedules + labels + automerge hooks | No versioning of *convention releases* — only git tip of template |
| Works today with zero platform | Auth and fan-out toil at dozens of repos |

---

### 3. Renovate / Dependabot as an **update-propagation model**

#### 3.1 Renovate (`renovatebot/renovate`, ~22k★)

- **URL:** https://github.com/renovatebot/renovate  
- **Docs:** https://docs.renovatebot.com/ — “How Renovate works”: https://docs.renovatebot.com/key-concepts/how-renovate-works/  
- **Mechanics (compressed):** For each repo: clone → discover managers/package files → look up datasources → compute valid next versions → apply `packageRules` / grouping / schedules / limits → create/update branches & PRs → dependency dashboard → clean stale branches. Config merge order prioritizes CLI/env/repo config over defaults; orgs use **inherited config + presets** then repo-local overrides.  
- **How local divergence is handled (the important part):**  
  - Each repo **opts in** (App install / self-hosted schedule) and owns `renovate.json` / `package.json` renovate key.  
  - **packageRules** disable, pin, group, label, require dashboard approval, automerge selectively.  
  - **ignorePaths** / enabled managers limit blast radius.  
  - Updates are **version-addressable** (registry/git tags), not “whatever is on main of some template.”  
  - Human (or automerge after CI) remains the merge authority; Renovate rebases/updates existing PR branches rather than endless open/close churn.  
- **Failure modes:** PR flood without limits; broken majors merged via over-eager automerge; monorepo grouping mistakes; private registry auth; inherited org rules surprising local owners; config complexity itself becomes a skill.  
- **Why this is the right metaphor for memory-atlas:**  
  1. **Addressable releases** of the convention (npm package / git tags).  
  2. **Per-repo policy** that can refuse or delay updates.  
  3. **Dashboard of lag** (“who is still on convention 0.1?”).  
  4. **PR as the unit of change**, not silent force-push into main.  
  5. **Selective enablement** (update skills/schema, never touch vault notes).

#### 3.2 Dependabot (`dependabot/dependabot-core`, ~5.7k★; product is first-party on GitHub)

- **Docs:** https://docs.github.com/en/code-security/…  
- **Mechanics:** Per-repo `.github/dependabot.yml` declares ecosystems + schedules; GitHub-hosted service opens version/security PRs. Recent work includes grouping (incl. cross-directory by dependency name in monorepos, 2026).  
- **Local divergence:** Less expressive packageRules story than Renovate; org-wide shared config is historically awkward (people script-commit `dependabot.yml` into many repos).  
- **Failure modes:** Config sprawl across repos; limited multi-manager intelligence; still not designed for “markdown convention trees.”  
- **Fit:** Fine for keeping the **`memory-atlas` npm dependency** itself updated in adopters once published; **insufficient alone** for migrating vault shapes / skill prose / config schema across major convention bumps.

#### 3.3 Mapping Renovate concepts → convention updates

| Renovate concept | Convention analog |
| --- | --- |
| Package / datasource | `memory-atlas` version (npm + git tags) + optional “convention pack” artifacts |
| Current version in lock/manifest | Pin in `package.json` / `atlas.config.json` `version` / `.atlas-lock.json` |
| packageRules | Per-repo: which layers auto-update (skills? templates? CLI only?) |
| ignorePaths | Never propose diffs under vault `map/`, `specs/`, hand notes |
| Dependency Dashboard | Fleet board: adopters lagging N majors; open migration PRs |
| Merge confidence / age | “Convention release matured 7d; CI green on dogfood repos” |
| Automerge patch | Patch: skill typo / schema non-breaking defaults |
| Major requires approval | Breaking folder taxonomy / frontmatter enum changes |

---

### 4. Scaffold + update: Copier, Cruft, Cookiecutter, Projen

#### 4.1 Cookiecutter (~25k★) — scaffold only

- **URL:** https://github.com/cookiecutter/cookiecutter  
- Generates once from a template. **No first-class update path.** Long-standing community pain (“how do I pull template changes?”) led to cruft/copier.  
- **Lesson:** Day-0 templates without day-N updates create permanent drift — exactly Backstage’s gap and GitHub Template Repos’ gap.

#### 4.2 Cruft (~1.6k★) — Cookiecutter + update

- **URL:** https://github.com/cruft/cruft · https://cruft.github.io/cruft/  
- **Mechanics:** Records template commit/context in `.cruft.json`; `cruft update` applies template deltas; `cruft check` for CI drift detection. Can skip files that shouldn’t update.  
- **Local divergence:** 3-way-ish update against last template application; conflicts when both template and project edited the same regions (known issue reports when merges fail awkwardly).  
- **Fit:** Pattern of **lockfile + check in CI + update command** is gold for conventions. Cookiecutter-specific; less rich than Copier for evolving questionnaires.

#### 4.3 Copier (~3.5k★) — best-in-class template lifecycle

- **URL:** https://github.com/copier-org/copier  
- **Update docs:** https://copier.readthedocs.io/en/stable/updating/  
- **Mechanics:**  
  1. Template is git-tagged (PEP 440).  
  2. Generated project keeps `.copier-answers.yml` (answers + template ref).  
  3. `copier update` regenerates a fresh copy from **old** template version, diffs against **current project** to recover user changes, applies **new** template, re-applies user diff; optional pre/post migrations; conflicts as inline markers or `.rej`.  
  4. `copier check-update` for automation (JSON / exit codes).  
  5. Deleted-in-project template files stay deleted (respect local removal); `skip_if_exists` paths are special-cased.  
- **Hard rule:** Do **not** hand-edit answers file — it poisons the smart diff.  
- **Failure modes:** External resources / Jinja extensions breaking replay of old template; messy conflict abort UX (not a git merge — needs `git reset`/`checkout`/`clean`); over-complex templates amplify update fragility; `recopy` nuke option discards smart merge.  
- **Fit for memory-atlas:** Closest existing algorithm to “respect hand-made customizations.” Ideal for **A+B layers** if you treat adoption as a Copier (or Copier-like) project: answers encode module flags / vaultDir / anchors. **Not** ideal to put live zone cards inside the template update surface.

#### 4.4 Projen (~2.9k★) — managed-file synthesis

- **URL:** https://github.com/projen/projen  
- **Model:** Project is defined in code; `projen` synthesizes managed files and **overwrites** them. Local edits to managed files are fighting the tool.  
- **Fit:** Correct for *generated* machine files if memory-atlas ever had a “synth” mode; **incorrect** for Obsidian vault knowledge. Use as a cautionary tale: if everything is “managed,” humans stop trusting the system or stop customizing.

---

### 5. Backstage golden-path templates (~34k★)

- **URL:** https://github.com/backstage/backstage  
- **Docs:** https://backstage.io/docs/features/software-templates/  
- **Mechanics:** Scaffolder loads skeletons, parameterizes, publishes new repos / PRs. Golden paths encode org standards at **create** time (CI, catalog-info, service shape).  
- **Update propagation:** Largely **absent**. Community/product gap is explicit:  
  - Issue: “How to automatically propagate template updates to existing projects?”  
    https://github.com/backstage/backstage/issues/31361 (opened 2025-10)  
  Templates can open PRs for *onboarding* (e.g. add `catalog-info.yaml`), but continuous reconvergence is not a solved core feature.  
- **Local divergence:** After create, the service owns its repo; platform standards evolve independently → **config drift** is expected unless org builds a second system (file-sync, Renovate, compliance scanners).  
- **Lesson for memory-atlas:** Shipping a great `atlas init` without an `atlas update-convention` / fleet bot recreates the golden-path trap. Day-0 ≠ day-N.

---

### 6. Meta-repo tooling

#### 6.1 `mateodelnorte/meta` (~2.2k★)

- **URL:** https://github.com/mateodelnorte/meta  
- **Mechanics:** `.meta` declares child repos; `meta git clone`, parallel git ops, script exec across the set. “Both mono and multi.”  
- **Does not:** merge file content intelligently; resolve template vs local.  
- **Fit:** Operator UX for the *owner* running “update all my minds” (`meta exec "atlas convention-update --defaults"`), not the update algorithm itself.

#### 6.2 Newer “agentic meta” / Mars-style workspace tools

Writeups on meta-repo patterns (e.g. Dev Newsletter “Meta-Repo Pattern”) emphasize clone/status/exec and AI agents operating across polyrepos. Same split: **orchestration ≠ content reconciliation**.

---

### 7. Git submodule / subtree / subrepo for shared docs

| Mechanism | Stars / status | How updates work | Local divergence | Failure modes | Fit for atlas convention |
| --- | --- | --- | --- | --- | --- |
| **Submodule** | Built-in | Parent pins SHA; `submodule update --remote` advances pin | Local commits in submodule are easy to lose if users don’t understand detached HEAD | Empty dirs after clone; forgotten updates; poor DX; branch sync pain | Shared **immutable** docs pack only; terrible for mixed vault |
| **Subtree** | Built-in contrib | `subtree pull` merges remote history into prefix | Edits are normal files; push-back is awkward | History bloat; multi-consumer conflicting edits; merge skill required | Vendoring a **docs/skills snapshot** possible but heavy |
| **git-subrepo** (`ingydotnet/git-subrepo`, ~3.6k★) | Popular DX layer | Friendlier pull/push than raw subtree | Similar ownership issues | Extra tool dependency | Same niche as subtree, nicer CLI |

Industry guidance (Atlassian subtree tutorial; many “avoid submodules” posts) converges: submodules for **version-pinned third-party you rarely edit**; subtree when you want **plain files** and rare upstream pulls. Neither implements Copier-style respect for divergent customization of the same logical file.

**Shared-docs pattern that works:** keep *canonical* convention sources in `memory-atlas` package; adopters consume via **package install**, not nested git. Nested git is a last resort for non-packageable blobs.

---

### 8. Comparative matrix (propagation strategies)

| Strategy | Direction | Versioned? | Respects local config? | Respects hand notes? | Scale to dozens of repos | Stars (approx.) |
| --- | --- | --- | --- | --- | --- | --- |
| GitHub Template only | create-time | No | N/A after create | N/A | Day-0 only | n/a (platform) |
| actions-template-sync | pull | git tip / branch | via ignore file | only if ignored | Medium (per-repo workflow) | ~326 |
| repo-file-sync-action | push | git tip | replace:false / exclude | only if excluded | High **inside one token boundary** | ~363 |
| Renovate | pull versions | **Yes** | packageRules / local config | N/A (deps only) | **Excellent** | ~22k |
| Dependabot | pull versions | Yes | limited | N/A | Good on GitHub | ~5.7k core |
| Copier update | pull template tags | **Yes** | answers + 3-way | if not in template paths | Medium (CLI/CI per repo) | ~3.5k |
| Cruft update | pull | Yes | .cruft.json + skips | if skipped | Medium | ~1.6k |
| Backstage templates | create-time | Template git | N/A post-create | N/A | Day-0 | ~34k |
| meta repo | orchestrate | No | N/A | N/A | Operator scale | ~2.2k |
| submodule/subtree | embed | SHA/history | poor for dual-edit | poor | Low-medium | built-in / ~3.6k subrepo |
| Projen synth | regenerate | project version | overrides discouraged | no | High if adopted | ~2.9k |

---

### 9. What “Renovate for knowledge-base conventions” looks like

Not a new general Renovate manager for markdown. A **convention update system** with Renovate’s *product shape* and Copier’s *merge intelligence*, specialized for atlas layers.

#### 9.1 Artifacts & versioning

1. **Publish `memory-atlas` as a versioned package** (already `package.json` 0.1.0, MIT, bin `atlas`).  
2. **Tag convention releases** with clear semver policy:  
   - **patch:** skill wording, bugfixes, non-breaking schema defaults  
   - **minor:** new optional modules, new skills, additive frontmatter  
   - **major:** folder taxonomy breaks, required frontmatter renames, verifier behavior that fails previously valid vaults  
3. **Adoption lock** in each repo, e.g. one of:  
   - npm/`package.json` dependency on `memory-atlas` (tooling)  
   - plus `.atlas-convention-lock.json` recording applied **content pack** version (skills/templates shipped into the vault or `.claude/skills`)  
4. **Machine-readable changelog / migration notes** per release (`migrations/0.2.0.md` or structured JSON: `{ "rewrites": [...], "deprecate": [...] }`).

#### 9.2 Ownership boundaries (non-negotiable)

Declare paths in the convention:

| Ownership | Paths (illustrative) | Updater may |
| --- | --- | --- |
| **Convention-owned** | installed CLI; packaged schema; default skills under package; optional “seeded” templates not yet customized | replace to match release |
| **Merged** | `atlas.config.json`, CLAUDE.md onramp snippets, CI workflow calling `atlas check` | 3-way / schema-aware merge; never drop unknown keys |
| **Repo-owned** | entire vault (`map/`, `specs/`, `plans/`, `tech-debt/`, …), user routines | **no content overwrite**; may open *advisory* issues or codemod PRs that only touch frontmatter enums with explicit migration |
| **User-forked convention files** | skills copied into repo and edited | detect hash ≠ upstream; stop silent overwrite; offer agent-assisted merge |

This is the difference between Renovate (knows package files) and dumb file-sync (knows bytes).

#### 9.3 Control plane (Renovate-shaped)

- **Discovery:** org app / self-hosted runner / scheduled workflow list of adopters (or each repo opts in via workflow, like Renovate App).  
- **Detection:** compare lock version ↔ latest stable (and optionally prerelease channel).  
- **Planning:** build a PR plan: upgrade package; refresh convention-owned files; run declared migrations; leave repo-owned paths untouched.  
- **PR UX:** one PR per repo per convention release (group patches); labels `atlas-convention`, `semver-major`; body includes migration checklist + link to CHANGELOG.  
- **Dashboard:** issue or small site: table of repos × convention version × last `atlas check` × stale zone count (atlas already has freshness signals).  
- **Rate limits:** `prConcurrentLimit`, schedule windows — copy Renovate’s anti-flood lessons.  
- **Approval:** majors require human; patches automerge if `atlas check` + tests green.

#### 9.4 Merge intelligence (Copier-shaped + AI)

Deterministic first, agent second:

1. **Schema-aware JSON merge** for `atlas.config.json` (preserve local `folders`, `modules`, `anchors`; apply new defaults only for missing keys; bump `version` field when shape changes).  
2. **3-way file merge** for any intentionally shared text files (base = previous convention release, ours = repo, theirs = new release).  
3. **Codemods** for mechanical vault migrations (status enum renames already documented in `docs/ADOPTION.md`) — pure functions, tested in memory-atlas CI.  
4. **AI/skill step** only when 3-way conflicts or when a migration is semantic (“split this zone card”): a skill like `atlas-convention-update` that reads SPEC + migration note + conflict hunks and proposes resolution **in the PR branch**, never force-pushing main.  
5. **Hard refuse** to “fix” diverged zone card prose to match a template zone.

This is the skill-driven “update to latest” the owner envisioned: **codemod + copier-style 3-way + agent for residue**, not LLM-rewriting every vault.

#### 9.5 What not to build

- Silent hub force-push of vault trees.  
- Submodule of `memory-atlas` inside every adopter as the primary channel (DX tax).  
- Projen-style “all markdown is managed.”  
- Depending on Backstage or a full IDP for a solo/OSS convention tool.  
- Treating Renovate literally as the engine for markdown packs without a custom manager — possible later, but product design should own the ownership rules.

#### 9.6 Open-source distribution angle (sibling to agentic-sage / token-oracle)

- Adopters install CLI from npm/GitHub releases (Renovate/Dependabot keep the package fresh).  
- Optional GitHub Action `memory-atlas/convention-update@v1` for self-serve PRs.  
- Optional org “fleet” mode for the author’s own many repos (push or matrix-pull).  
- Document **support windows** (which convention majors still get migrations).  
- Dogfood: memory-atlas’s own vault + syndcast-mind + 5 new repos as canaries before automerge defaults.

---

### 10. Failure modes to design against (checklist)

1. **Clobber:** update overwrites a hand-tuned zone or custom folder remap.  
2. **Poisoned lock:** hand-edited answers/lock lies about provenance (Copier’s warning).  
3. **PR flood:** 40 repos × weekly convention experiments.  
4. **Auth blast radius:** one PAT can write all private company repos.  
5. **False green:** PR merges while vault semantics break (`atlas check` not in required checks).  
6. **Partial apply:** package upgraded but skills not refreshed → version skew.  
7. **Major without migration:** verifier suddenly fails 30 brownfield vaults.  
8. **Ignore forever:** overly broad `.templatesyncignore` / ownership marks freeze security fixes.  
9. **Agent hallucination:** unconstrained LLM “cleanup” of decisions ledger.  
10. **Orphan deletes:** hub `deleteOrphaned` removes a local workflow the team still needs.

---

## Recommendations for memory-atlas

Prioritized for maturing now (5 new repos) and OSS later.

### P0 — Define ownership + versioning before any sync bot

1. **Publish an explicit Ownership Manifest** in the repo (e.g. `docs/CONVENTION-OWNERSHIP.md` or SPEC section): convention-owned vs merged vs repo-owned paths.  
2. **Semver policy for convention content**, not just npm package — document what constitutes major for vault-facing changes.  
3. **Adoption lock format** (minimal JSON): `conventionVersion`, `appliedAt`, `contentPackHash`, optional `skippedPaths[]`. Write it from `atlas init` / future `atlas convention apply`.

### P0 — Package-first distribution (Renovate/Dependabot compatible)

4. Keep **CLI + schema + skills + templates** on the npm package surface (already in `package.json` `files`). Adopters depend on the package; Dependabot/Renovate handle *tooling* updates for free.  
5. Prefer **`npx atlas` / local bin** over vendoring large skill trees by hand; if skills must live in `.claude/skills`, record hashes in the lock and refresh via update command.

### P1 — Ship `atlas convention-check` / `atlas convention-update` (Copier-shaped CLI)

6. **`convention-check`:** exit non-zero if lock lags latest stable (CI signal, like `cruft check` / `copier check-update`).  
7. **`convention-update`:**  
   - upgrade content pack within ownership rules  
   - schema-aware merge of `atlas.config.json`  
   - run versioned migrations  
   - print conflict report; never touch vault notes unless a migration explicitly opts in  
8. Implement **deterministic codemods first** (enum renames, new optional frontmatter defaults); reserve AI skill for conflicts.

### P1 — PR automation for the owner’s fleet (5→dozens)

9. For **your** repos: start with **pull-model** (each repo workflow calling `atlas convention-update` + `create-pull-request` action) — safer auth posture than one hub PAT, closer to Renovate.  
10. Optionally add **hub matrix** later for private fleet using GitHub App installation tokens (fine-grained, per-repo).  
11. Borrow Renovate product knobs: schedule, concurrent PR limit, major-vs-patch labels, dashboard issue.

### P2 — Do not use as primary mechanism

12. **Avoid git submodule/subtree** for the vault or full convention.  
13. **Avoid repo-file-sync of vault directories.** If using file-sync at all, restrict to a short allowlist (e.g. `.github/workflows/atlas-check.yml`).  
14. **Avoid Backstage** as a dependency for this problem; steal only the vocabulary (“golden path at create”) and the negative lesson (no propagation).

### P2 — AI/skill-driven merge as product differentiator

15. Author skill **`atlas-convention-update`**: inputs = old lock, new release notes, diff, local config; outputs = resolved branch + human summary of what was preserved.  
16. Constrain the skill with the ownership manifest (tool-readable). This is the OSS story that file-sync actions cannot match: *“updates the paved road without paving over your mind.”*

### P3 — Fleet observability

17. Aggregate (even a simple script + meta-repo): convention version, `atlas check` status, stale zone counts — Renovate dashboard analog.  
18. Canary chain: memory-atlas dogfood → syndcast-mind → new repos → automerge patches.

### Suggested phased rollout

| Phase | When | What |
| --- | --- | --- |
| Now | 5 new repos | Ownership manifest + lock + package pin + `atlas check` in CI |
| Next | convention churn starts | `convention-check` / `convention-update` + migrations for first breaking change |
| Scale | >10 adopters | Scheduled PR workflow + dashboard |
| OSS | public launch | Document consumer pull model; optional Action; support policy |

---

## Open questions

1. **Should convention content packs be the npm package itself, a second artifact, or git subtree of `templates/`+`skills/` only?** Package-only is simplest for Renovate; split packs allow “skills lag CLI.”  
2. **Will adopters vendor skills into `.claude/skills` (mutable copies) or invoke packaged skills by path?** Vendoring forces hash tracking; package paths need agent config support.  
3. **Is the primary customer the author’s private fleet, public OSS adopters, or both?** Push-sync is fine for private fleet; OSS must be pull/opt-in.  
4. **How automatic should majors be?** Copier leaves conflicts for humans; Renovate can require dashboard approval — which default matches “mind” sensitivity?  
5. **Do vault format migrations ever auto-edit notes** (frontmatter only vs body)? Auto body edits are high-risk for trust.  
6. **Single-repo monorepo of many minds vs many repos?** Research assumes many repos (stated goal); monorepo would collapse the problem to Copier/projen inside one tree.  
7. **Should `atlas.config.json` `version` field double as convention lock, or stay “config shape version” only** (schema currently: config shape, not package semver)?  
8. **Legal/trust: will OSS adopters accept a GitHub App that can open PRs to their vaults?** Probably optional; CLI-local update may dominate.  
9. **How to handle forks of memory-atlas that invent incompatible modules?** Need extension points vs hard failures on unknown config keys (`additionalProperties: false` today).  
10. **Can Renovate custom managers later detect `.atlas-convention-lock.json`?** Feasible long-term; short-term custom Action is enough.

---

## Sources (selected)

| Source | Role |
| --- | --- |
| https://github.com/AndreasAugustin/actions-template-sync | Pull-model template sync (~326★) |
| https://github.com/BetaHuhn/repo-file-sync-action | Push-model file sync (~363★) |
| https://github.com/ahmadnassri/action-template-repository-sync | Template→children sync (~19★) |
| https://github.com/renovatebot/renovate | Dependency update platform (~22k★) |
| https://docs.renovatebot.com/key-concepts/how-renovate-works/ | Renovate workflow |
| https://docs.renovatebot.com/configuration-options/ | packageRules / config model |
| https://github.com/dependabot/dependabot-core | Dependabot engine (~5.7k★) |
| https://github.com/copier-org/copier | Template lifecycle + update (~3.5k★) |
| https://copier.readthedocs.io/en/stable/updating/ | 3-way update algorithm |
| https://github.com/cruft/cruft | Cookiecutter update layer (~1.6k★) |
| https://github.com/cookiecutter/cookiecutter | Scaffold-only (~25k★) |
| https://github.com/backstage/backstage | Golden-path scaffolder (~34k★) |
| https://github.com/backstage/backstage/issues/31361 | Template update propagation gap |
| https://github.com/mateodelnorte/meta | Meta-repo orchestration (~2.2k★) |
| https://github.com/projen/projen | Managed-file synth (~2.9k★) |
| https://github.com/ingydotnet/git-subrepo | Subrepo DX (~3.6k★) |
| https://repofilesync.com/ | Drift dashboard product signal |
| https://0xdc.me/blog/github-templates-and-repository-sync/ | Template + actions-template-sync field report |
| Local: `docs/ADOPTION.md`, `schema/atlas.config.schema.json`, `package.json` | memory-atlas constraints |

