# R1 — General survey: knowledge bases for coding projects (GitHub, mid-2026)

**Date:** 2026-07-17  
**Scope:** Most-starred / most-adopted open GitHub solutions for *creating knowledge bases around coding projects* — docs-as-code, team wikis, developer portals, second-brain / PKM frameworks, decision ledgers, agent memory, and related generators.  
**Out of scope:** `visuals/` / presentation layers; closed SaaS without a meaningful public repo; pure LLM frameworks with no KB convention.  
**Method:** Public GitHub REST API star counts (where rate limits allowed), GitHub page scrapes for stars/descriptions, and secondary web sources. Stars are **approximate as of mid-2026** (this research window). Graphify star counts are flagged as disputed.

**Primary contrast for this report:** [memory-atlas](https://github.com/) (local path: `/home/kento/Repositories/memory-atlas`) — per-repo, Obsidian-compatible vault; zone cards with code-verified `owns.globs`; Map (present) vs Ledger (past); `verifiedAt` freshness; generated `map/index.md`. Spec: `SPEC.md`, README: `README.md`.

---

## Summary

- The “knowledge base for coding projects” market is **not one product category** — it is at least six overlapping paradigms (docs-as-code SSGs, team wikis, developer portals, PKM/second-brain, architecture decision ledgers, AI agent memory/graphs). Winners rarely win by feature count; they win by **convention + format lock-in avoidance**.
- **Docs-as-code still dominates OSS stars for project documentation** (Docusaurus ~66k, Docsify ~31k, MkDocs Material ~27k, VitePress ~18k, Nextra ~14k, Starlight ~9k). Convention: Markdown (or MDX) in-repo, versioned with code, deploy as static HTML.
- **Team wikis / Notion-alikes** (AppFlowy ~74k, Outline ~40k, Wiki.js ~29k, BookStack ~19k) win on collaboration UX, not on tight code coupling. Weak fit for “agent-readable per-repo mind” unless content is exported as plain files.
- **Developer portals** (Backstage ~34k) win in enterprises by treating docs as a *catalog artifact* (TechDocs) next to ownership and templates — a convention of *service identity*, not free-form notes.
- **PKM / second-brain** stacks (Logseq ~44k, Foam ~17k, Quartz ~13k, Dendron ~7.5k, Karpathy-pattern LLM wikis ~0.6–3k) win on **plain Markdown + wikilinks + local-first ownership**. Closest relatives to memory-atlas’s vault shape; almost none verify claims against `git ls-files`.
- **Decision knowledge** is a separate winner class: ADR catalogs (~16k) and `adr-tools` (~5.6k). Convention: one decision per file, immutable once accepted, supersession links — maps cleanly to memory-atlas Ledger `decisions/`.
- **2025–2026 AI layer:** Mem0 (~61k), Graphiti (~29k), Aider’s repo-map (~47k tool), and LLM-wiki frameworks (Karpathy gist 5k+ stars; Ar9av/obsidian-wiki ~2.9k) treat knowledge as **compiled, queryable state for agents**. Convention shift: “compile once, query many” and multi-agent skill discovery (`AGENTS.md` / skills directories).
- **Propagation/update of *conventions* across many repos** is still immature in the KB space. The best existing model is **Copier** (~3.5k) 3-way template updates (answers file + git merge), not cookiecutter one-shot scaffolding (~25k). That is the closest OSS analog to an “update to latest atlas convention” problem.
- **What made winners win (conventions, not features):** (1) plain text in git, (2) one clear content model / taxonomy, (3) generated views never hand-edited, (4) zero or optional DB, (5) agent/human dual audience, (6) explicit freshness or versioning, (7) small onboarding surface.
- **memory-atlas differentiator that still has white space:** *code-verified* present-tense architecture cards + honest `verifiedAt` + CI-checkable index. Most high-star tools either publish docs (no verification) or store agent beliefs (no tree binding).
- **Risk for open-source maturity:** star charts are polluted by learning lists (hundreds of k stars) and contested AI repos; rank by *adoption convention fit*, not raw stars alone.

---

## Findings

### 1. Map of the space (categories)

| Category | What “knowledge” means | Typical store | Agent fit | Closest memory-atlas analog |
|---|---|---|---|---|
| **A. Docs-as-code SSGs** | Product/API/user docs | `docs/**/*.md` + config | Good if structured | `reference/` / published docs only |
| **B. Hosted docs platforms** | Continuous docs build | Git → HTML host | Medium | CI publish of vault subset |
| **C. Team wikis** | Org knowledge | DB + rich editor | Weak unless export | Not per-repo |
| **D. Developer portals** | Service ownership + TechDocs | Catalog + MD | Strong for multi-service | Multi-repo atlas fleet |
| **E. PKM / digital garden** | Personal or team notes graph | Markdown vault | Strong | Vault layout, wikilinks |
| **F. Decision / architecture ledger** | Why we chose X | `doc/adr/*.md` | Strong | `map/decisions/` |
| **G. AI agent memory / code graphs** | Facts, episodes, code graph | Vectors / graphs / MD | Primary audience | Zone graph + verified claims |
| **H. Template lifecycle** | Scaffold + update conventions | Template repo + answers | N/A (meta) | **Update mechanism for atlas itself** |

### 2. Ranked table (~20 repos)

Rank is **relevance to “knowledge base for coding projects” × adoption**, not pure star count. Stars ≈ mid-2026.

| # | Repo | ~Stars | One-line what | Why adopted (convention angle) | URL |
|---|---|---:|---|---|---|
| 1 | **facebook/docusaurus** | ~65.6k | React SSG for versioned product docs | MD/MDX in-repo; versioning + i18n conventions; “docs live next to the product” | https://github.com/facebook/docusaurus |
| 2 | **mem0ai/mem0** | ~61k | Universal memory layer for AI agents | Scoped memory (user/session/agent); extract-then-retrieve; skills/`AGENTS.md` packaging | https://github.com/mem0ai/mem0 |
| 3 | **AppFlowy-IO/AppFlowy** | ~73.9k | Open Notion-style wiki + projects | Local-first collaboration; block docs; “own your data” narrative | https://github.com/AppFlowy-IO/AppFlowy |
| 4 | **Aider-AI/aider** | ~47.4k | Terminal pair programmer with **repo map** | Convention: map the codebase once so the agent doesn’t re-grep forever | https://github.com/Aider-AI/aider |
| 5 | **logseq/logseq** | ~43.9k | Local-first outliner PKM | Markdown/Org on disk; graph + daily notes; privacy-first | https://github.com/logseq/logseq |
| 6 | **outline/outline** | ~39.7k | Realtime team knowledge base | Collections + permissions; markdown core; fast team adoption | https://github.com/outline/outline |
| 7 | **slatedocs/slate** | ~36.1k | Classic 3-column API docs (archived 2026) | Single-page API reference convention; Markdown source | https://github.com/slatedocs/slate |
| 8 | **backstage/backstage** | ~33.9k | Internal developer portal + TechDocs | Software catalog as source of truth; docs attached to *entities* | https://github.com/backstage/backstage |
| 9 | **continuedev/continue** | ~34.9k | Open coding agent (CLI/IDE) | Project rules / config-as-context for agents | https://github.com/continuedev/continue |
| 10 | **docsifyjs/docsify** | ~31.4k | Zero-build Markdown docs site | “Just put markdown in a repo” — minimal toolchain convention | https://github.com/docsifyjs/docsify |
| 11 | **requarks/wiki** | ~28.6k | Modern Node wiki (Wiki.js) | Self-host + git sync options; multi-storage | https://github.com/requarks/wiki |
| 12 | **getzep/graphiti** | ~28.8k | Temporal context graphs for agents | Episodes + validity windows; hybrid retrieval | https://github.com/getzep/graphiti |
| 13 | **GitbookIO/gitbook** | ~29.0k | GitBook open frontend / docs stack | Git-backed docs product convention | https://github.com/GitbookIO/gitbook |
| 14 | **squidfunk/mkdocs-material** | ~27.1k | Material theme + ecosystem for MkDocs | Opinionated theme as de-facto Python docs convention | https://github.com/squidfunk/mkdocs-material |
| 15 | **Redocly/redoc** | ~25.8k | OpenAPI → API reference | Spec-as-source-of-truth convention | https://github.com/Redocly/redoc |
| 16 | **mkdocs/mkdocs** | ~22.3k | Fast Markdown project docs SSG | Simple `mkdocs.yml` + `docs/` tree convention | https://github.com/mkdocs/mkdocs |
| 17 | **github/docs** | ~20.5k | Source for docs.github.com | Large-scale docs-as-code reference implementation | https://github.com/github/docs |
| 18 | **BookStackApp/BookStack** | ~18.9k | Book → chapter → page wiki | Hierarchical content model convention | https://github.com/BookStackApp/BookStack |
| 19 | **vuejs/vitepress** | ~18.0k | Vite + Vue docs SSG | VitePress theme/docs convention for Vue ecosystem | https://github.com/vuejs/vitepress |
| 20 | **foambubble/foam** | ~17.3k | VS Code PKM with wikilinks + git | Foam workspace = git markdown garden; templates + graph | https://github.com/foambubble/foam |

#### Strong near-misses (include in mental model; not all ranked above)

| Repo | ~Stars | Notes | URL |
|---|---:|---|---|
| **architecture-decision-record / joelparkerhenderson ADR catalog** | ~16.4k | Canonical ADR templates & naming | https://github.com/joelparkerhenderson/architecture-decision-record |
| **shuding/nextra** | ~13.9k | Next.js docs framework (MDX) | https://github.com/shuding/nextra |
| **jackyzha0/quartz** | ~12.8k | Digital garden SSG from Markdown | https://github.com/jackyzha0/quartz |
| **withastro/starlight** | ~8.9k | Astro docs starter — accessible defaults | https://github.com/withastro/starlight |
| **readthedocs/readthedocs.org** | ~8.4k | Continuous documentation hosting | https://github.com/readthedocs/readthedocs.org |
| **sphinx-doc/sphinx** | ~7.9k | Reference-grade docs generator (Python) | https://github.com/sphinx-doc/sphinx |
| **dendronhq/dendron** | ~7.5k | Hierarchical markdown PKM (maintenance mode) | https://github.com/dendronhq/dendron |
| **npryce/adr-tools** | ~5.6k | CLI for ADR log lifecycle | https://github.com/npryce/adr-tools |
| **karpathy/llm-wiki** (gist) | 5k+ | Pattern: compile KB once for agents | https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f |
| **copier-org/copier** | ~3.5k | Template *updates* with 3-way merge | https://github.com/copier-org/copier |
| **Ar9av/obsidian-wiki** | ~2.9k | Agent skills + Obsidian LLM wiki | https://github.com/Ar9av/obsidian-wiki |
| **evildmp/diataxis-documentation-framework** | ~1.2k | Content-type taxonomy (tutorial/how-to/explanation/reference) | https://github.com/evildmp/diataxis-documentation-framework |
| **cookiecutter/cookiecutter** | ~25.0k | One-shot project scaffolding (not update) | https://github.com/cookiecutter/cookiecutter |
| **Graphify-Labs/graphify** (also safishamsi) | ~58–88k claimed | Code→knowledge graph skill; **star authenticity disputed on Reddit** | https://github.com/Graphify-Labs/graphify |

#### Explicitly deprioritized despite huge stars

| Repo | ~Stars | Why not in top-20 for this survey |
|---|---:|---|
| freeCodeCamp, free-programming-books, developer-roadmap, tldr, “secret knowledge” lists | 60k–450k+ | Learning/content lists, not *project-local* KB systems |
| Obsidian app itself | proprietary | Vault *format* matters; app is not the open convention |

### 3. Evidence notes by category

#### A–B. Docs-as-code (still the default for “project knowledge” that ships)

- **Docusaurus** (~65.6k): versioned docs + MDX; Meta backing; becomes the default “OSS project website” convention.  
- **MkDocs** (~22.3k) + **Material** (~27.1k): Python ecosystem standard; `mkdocs.yml` is the entire mental model.  
- **Docsify** (~31.4k): wins on *anti-toolchain* — no build step.  
- **VitePress / Nextra / Starlight**: framework-aligned docs conventions (Vue / Next / Astro).  
- **Read the Docs** (~8.4k platform): “continuous documentation” — PR → build → host.  
- **Diátaxis** (~1.2k stars, outsized influence): not a product; a *content taxonomy* adopted by large doc sets (including Python discussions). Convention: separate tutorial / how-to / explanation / reference so agents and humans know *which kind of page* they are reading.

**Winning conventions:** docs directory layout; config-as-schema; versioned releases of docs with product versions; generated nav; lint in CI.

#### C–D. Wikis and portals

- **Outline / Wiki.js / BookStack / AppFlowy**: high stars for *team knowledge*, weak default for “this git repo’s mind.”  
- **Backstage**: the enterprise answer to multi-repo knowledge — **catalog entities own docs**, templates create new services with docs hooks. Relevant if memory-atlas expands from one-repo to a fleet of 5–dozens of minds with a shared registry.

#### E. PKM / second brain (closest file shape to memory-atlas)

- **Logseq, Foam, Quartz, Dendron**: plain files, wikilinks, graphs, git.  
- **Karpathy LLM Wiki pattern** (gist 5k+): “compile knowledge into interlinked markdown; don’t re-derive per query.” Implementations: Ar9av/obsidian-wiki (~2.9k), NicholasSpisak/second-brain (~0.6k), others.  
- **obsidian-wiki** conventions worth studying for maturity/OSS:  
  - Skills as the product surface (`.skills/*/SKILL.md`)  
  - Multi-agent bootstrap (`AGENTS.md`, `CLAUDE.md`, Cursor rules, etc.)  
  - Manifest / delta ingest  
  - Frontmatter `summary:` for cheap retrieval  
  - Provenance tags on claims  
  - `doctor` / `lint` / trust-check CLI gates  

**Gap vs memory-atlas:** LLM wikis optimize for *personal/agent memory compilation*; memory-atlas optimizes for *code-verified architecture truth*. Different trust model.

#### F. Decision ledgers

- **ADR catalog** (~16.4k) and **adr-tools** (~5.6k): one decision per file; `NNNN-title.md`; status lifecycle; supersession.  
- This is the most successful *pure convention* product class (templates + CLI, almost no platform).

#### G. AI memory / graphs (2025–2026 growth)

- **Mem0** (~61k): extraction memory with scopes; ships agent skills and multi-tool plugin dirs.  
- **Graphiti** (~28.8k): temporal facts + episodes; explicit “context graph” language.  
- **Aider** (~47.4k): not a KB product, but popularized **repo map** as agent orientation — same job as zone cards without permanence/verification.  
- **Graphify**: claimed ultra-high stars for code→graph; treat adoption claims cautiously until star quality is verified.

#### H. Template update (propagation)

- **Cookiecutter** (~25k): create once.  
- **Copier** (~3.5k): create *and update* via recorded answers + git 3-way merge (`copier update`). Documented process: clean git tree, re-answer prompts, review conflicts.  
- This is the best existing OSS metaphor for “propagate atlas-convention improvements to many adopting repos while respecting local config.”

### 4. Conventions that made winners win (extracted)

These are **conventions**, not feature checklists:

1. **Plain text in git is non-negotiable.** Every durable winner stores knowledge as files agents and humans can `grep`. DB-only wikis lag for coding agents.
2. **One obvious place to start.** `docs/`, `map/index.md`, ADR `doc/adr/`, catalog entity page — a single entry ramp beats a clever graph.
3. **Generated artifacts are sacred.** Hand-edited indexes rot. Winners regenerate nav/index (Docusaurus sidebar gen, `atlas build`, wiki status dashboards).
4. **Stable taxonomy beats infinite flexibility.** Diátaxis four types; ADR fixed sections; memory-atlas nine note types; BookStack book/chapter/page. Taxonomy is the product.
5. **Lifecycle fields.** `status`, `verifiedAt`, ADR acceptance, Mem0 scopes, Graphiti validity windows — time is part of the model.
6. **Separation of tenses.** Present (what is) vs past (what was decided) vs evergreen (vision). memory-atlas’s Map/Ledger split matches ADR + docs-as-code practice; winners that mix them get stale “beliefs.”
7. **Zero-config happy path + optional modules.** Docsify/MkDocs/Foam init cheaply; advanced features opt-in. Empty mandated directories erode trust (memory-atlas SPEC already states this).
8. **CI as social contract.** `atlas check`, RTD builds, doc lint, ADR presence checks — knowledge is real when the pipeline fails.
9. **Agent packaging is now table stakes (2026).** `AGENTS.md` open format (60k+ repos claimed adoption), skill directories, multi-bootstrap files. Tools that only document for humans lose half the market.
10. **Update path for the convention itself.** Copier’s answers file + 3-way merge; skill symlinks upgraded via package; Renovate-driven template bumps. One-shot `init` without `update` does not scale to dozens of repos.
11. **Local config is a first-class file, not a fork.** `atlas.config.json`, `.copier-answers.yml`, `mkdocs.yml` — adopters customize without forking the upstream tool.
12. **Honest incompleteness.** `unverified`, orphan panels (Foam), verification-gaps sections (memory-atlas) beat silent staleness.

### 5. Local product context (read-only)

From `/home/kento/Repositories/memory-atlas`:

- **README / SPEC** already encode several winner conventions: vault not DB; Map vs Ledger; generated index; `verifiedAt`; optional modules not empty by default; CLAUDE.md/AGENTS.md on-ramp.
- **Gap vs high-star peers for OSS maturity:** public positioning against Diátaxis/ADR/LLM-wiki; first-class **`atlas update`** story for multi-repo fleets; skill packaging comparable to obsidian-wiki/Mem0; clearer boundary vs docs-as-code (publish) and agent memory (belief).

---

## Recommendations for memory-atlas

Prioritized for: (1) mature conventions/tooling now, (2) OSS readiness like agentic-sage / token-oracle, (3) AI-driven “update to latest” across many minds without clobbering local config/custom notes.

### P0 — Convention maturity (do before the 5 new repos proliferate drift)

1. **Publish a one-page “Atlas Diátaxis”** mapping note types → audience jobs  
   - zone/flow = explanation of *system as built*  
   - decision = past-tense ADR  
   - spec/plan = design + implementation history  
   - reference module = classic reference docs  
   Prevents adopters from using zones as blogs.

2. **Freeze the core skeleton + version the convention**  
   - `SPEC.md` already has `version: 0.1` — treat convention versions as **semver consumers can pin** (`atlas.config.json` → `conventionVersion`).  
   - Generated files (`map/index.md`) stay non-hand-edited; document escape hatches.

3. **Hard on-ramp block for agents**  
   - Ship the ONRAMP snippet as a skill + default `AGENTS.md` fragment (multi-tool like obsidian-wiki, but thinner).  
   - Rule: agents open `map/index.md` before code search.

4. **CI recipe as first-class docs**  
   - `atlas check` in GitHub Actions template; fail on broken `owns.globs` and stale generated index. This is the social proof docs-as-code winners use.

### P1 — Update / propagation mechanism (the strategic differentiator)

5. **Design `atlas update` as Copier-shaped, agent-executed**  
   Layers:
   - **Machine layer (deterministic):**  
     - Pin `conventionVersion` + content hash of upstream templates/skills.  
     - 3-way merge of *scaffold files only* (templates, schema snippets, on-ramp blocks, CI workflows).  
     - Never overwrite zone/decision content automatically.  
     - Respect `atlas.config.json` local keys (vault path, modules, ignores).  
   - **Agent layer (judgmental):**  
     - Skill `atlas-update` reads CHANGELOG of convention versions, lists breaking changes, proposes migrations (rename frontmatter, new required fields).  
     - Operator reviews a PR per repo (“update atlas convention 0.1 → 0.3”).  
   - **Answers file:** record init choices (modules enabled, vault name) analogous to `.copier-answers.yml` so re-runs are non-interactive.

6. **Mark ownership of every file in the vault**  
   - Convention: frontmatter or path policy `managed: core | template | user`.  
   - Updater only touches `managed: core|template`. Hand-made notes are `user` forever.  
   - Mirrors Copier “don’t thrash user edits” without requiring pure 3-way success on prose.

7. **Fleet mode (5→dozens)**  
   - Optional registry (simple YAML in a meta-repo or Backstage-like catalog later): list of repos + conventionVersion + last update PR.  
   - `atlas fleet status` reports drift. Do **not** require a heavy portal on day one.

### P2 — OSS packaging & positioning

8. **Position against three neighbors, not against Notion**  
   - vs **docs-as-code:** we store *verified architecture*, not product docs.  
   - vs **LLM wiki / Mem0:** we store *tree-checked truth*, not agent beliefs.  
   - vs **ADRs alone:** we keep present-tense map *and* past-tense ledger.

9. **Ship skills, not only a CLI**  
   - `atlas-orient`, `atlas-recollect`, `atlas-update`, `atlas-seed-zones` as Agent Skills.  
   - Multi-bootstrap optional; prefer thin `AGENTS.md` include over seven rule files.

10. **Provenance optional module**  
    - Steal LLM-wiki idea lightly: mark claims `extracted | inferred` on zone body, keep `verifiedAt` as the hard gate for “active.”

11. **Open-source hygiene checklist**  
    - ADOPTION.md (exists path in CLAUDE.md), CONTRIBUTING, versioned CHANGELOG of *convention* not only code, example vaults, “brownfield adopt” path, screenshot-free README (sibling OSS style).

### P3 — Deliberate non-goals (protect the product)

12. **Do not become a team wiki or GraphRAG platform.** Collaboration and vectors are adjacent products; file + CI + verification is the wedge.  
13. **Do not auto-“fix” zone cards from LLM without human stamp.** That collapses the differentiator into Mem0/LLM-wiki territory.  
14. **Treat Graphify-class star counts as marketing, not north stars.** Optimize for check-passing vaults, not stargazers.

---

## Open questions

1. **Convention distribution channel:** npm package of CLI+templates vs git submodule vs Copier template repo vs skills-only install — which one matches adopters of agentic-sage/token-oracle?
2. **How much of the vault is “upstream-managed”?** Only `templates/` + on-ramp, or also schema examples and CI workflows?
3. **Multi-repo identity:** one mind per repo forever, or shared modules (common ADR styles, shared zone taxonomy) vendored carefully?
4. **Obsidian as requirement or optional viewer?** Winners often say “works in any editor”; Obsidian compatibility without Obsidian dependency is already the right default — confirm for OSS messaging.
5. **Agent update safety:** should `atlas update` refuse dirty trees and non-main branches (Copier-style), or allow agent worktrees by default?
6. **Star-quality / authenticity checks** for AI-adjacent competitors before citing them in marketing.
7. **Relationship to AGENTS.md standard:** should memory-atlas own a recommended AGENTS section, or only document integration?
8. **Freshness UX for humans:** is `verifiedAt` SHA enough, or do adopters need “days since verify” badges like docs version banners?
9. **Diátaxis vs Map/Ledger:** formal mapping doc — does it confuse or clarify new adopters?
10. **When does a fleet of 5 minds need a portal (Backstage-like) vs a spreadsheet of convention versions?**

---

## Appendix: methodology & limits

- Star counts from GitHub REST API (unauthenticated, rate-limited mid-session) and GitHub HTML “Stars” fields via page fetch (2026-07-16/17).  
- Secondary sources: awesome-docs lists, docs tool roundups (2025–2026), Copier update docs, AGENTS.md adoption writeups, Graphify star-dispute threads.  
- **Not run:** authenticated `gh` API (token invalid in this environment), installers, generators, or any mutating git commands.  
- This report is the sole write in the research contract.
