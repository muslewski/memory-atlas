# Obsidian/Foam/Dendron/Logseq-style vaults for per-project developer knowledge

Research date: 2026-07-17. Read-only web + local repo analysis for memory-atlas maturation (convention tooling, open-source path, multi-repo update mechanism). Star counts from GitHub API (approx., same day) unless noted. Visuals/ of syndcast-mind out of scope.

## Summary

- **De-facto platform for code-adjacent knowledge is plain Markdown + YAML frontmatter + `[[wikilinks]]`**, portable across Obsidian, Foam, and (with caveats) Logseq; tools diverge on plugins, not file format.
- **Obsidian Properties (core) plus Dataview (~9.2k★ / ~4.5M downloads) and Templater (~5.1k★)** are the working metadata stack; Obsidian Bases (core, 2025) is absorbing much of what Dataview dashboards did, still YAML-backed.
- **Native-first frontmatter keys are plural lists: `tags`, `aliases`, `cssclasses`** (singular forms removed in Obsidian 1.9). Everything else is convention; `type` / status enums / dates / links are the usual extensions.
- **Folder taxonomies for *personal* PKM are PARA, Johnny.Decimal, Zettelkasten/LYT (Maps of Content)** — high stars on lifestyle starters, weak fit for *per-repo code knowledge*. Dev/architect vaults instead use **typed notes** (`type: zone|adr|system…`), **MOCs/indexes**, and **owns/globs** binding notes to code.
- **Vault-in-repo is common for developers**: open a subfolder or whole repo as a vault; commit notes; **gitignore volatile `.obsidian/` state** (`workspace.json`, plugin `data.json`); optional **Obsidian Git** (~11.6k★) for commit-and-sync. Foam (~17.3k★) is the VS Code-native twin and treats Obsidian vaults as first-class.
- **Dendron (~7.5k★) is the closest historical analog to schema-enforced hierarchical knowledge for developers** (`id`, `title`, `desc`, `created`/`updated`, hierarchies + schemas) — but maintenance has slowed; lessons remain (strict IDs, doctor commands, gradual structure).
- **Logseq (~43.9k★) is block-first** (`key:: value` page props, outliners, Datalog queries); interop with Obsidian-style vaults is imperfect — not the primary interop target for memory-atlas.
- **Highest-signal *code-project* starter patterns**: ArchitectKB (typed prefixes, ADRs, Dataview MOCs, Claude skills, freshness/confidence — ~48★ but design-rich); Foam template (~1.2k★, git-native workspace); LifeOS (~1.1k★, PARA+periodic); generic starter vaults are mostly personal PKM.
- **memory-atlas already sits *ahead* of community vaults on verification**: `verifiedAt` as commit SHA, zone `owns.globs`, invariants with `enforcedBy`, generated `map/index.md`, structure-based vault detection — rare outside this lineage (syndcast-mind → memory-atlas).
- **Propagation to many repos should not be “rsync the vault”**: adopt **Copier-style three-way thinking** (template version × answers × local edits) for *scaffolding/skills/templates*, and an **AI/skill-driven update** for semantic merges of notes and config — never clobber `atlas.config.json` local knobs or hand-authored zone content.

## Findings

### 1. Ecosystem landscape (tools that matter for per-project / code knowledge)

| Tool | Role for developers | Approx. stars / scale | URL |
|------|---------------------|------------------------|-----|
| **Obsidian** | Dominant GUI vault; Properties, Bases, community plugins | Closed app; huge plugin ecosystem | https://obsidian.md |
| **Logseq** | Privacy-first outliner / graph; local MD/Org | **~43.9k★** | https://github.com/logseq/logseq |
| **Foam** | VS Code + GitHub PKM; wikilinks, graph, templates; **Obsidian-compatible** | **~17.3k★** (extension also ~262k installs historically) | https://github.com/foambubble/foam · https://docs.foam.md |
| **foam-template** | Generate-a-repo starter workspace | **~1.2k★** | https://github.com/foambubble/foam-template |
| **Dendron** | VS Code hierarchical notes + schemas; built “for developers” | **~7.5k★** (product momentum uncertain) | https://github.com/dendronhq/dendron · https://wiki.dendron.so |
| **Obsidian Git** | In-app commit/pull/push, source-control UI | **~11.6k★** | https://github.com/Vinzent03/obsidian-git |
| **Dataview** | Query notes as a DB (frontmatter + inline fields) | **~9.2k★**, **~4.5M downloads** (obsidianstats) | https://github.com/blacksmithgu/obsidian-dataview |
| **Templater** | Dynamic note templates / scripts | **~5.1k★** | https://github.com/SilentVoid13/Templater |
| **Minimal theme** (kepano) | Common polished vault skin | **~5.2k★** | https://github.com/kepano/obsidian-minimal |

**Implication:** memory-atlas should remain **Markdown/YAML/wikilink portable** (Obsidian + Foam + git), not depend on Obsidian plugin runtime for verification. Plugins are *optional authoring UX*.

### 2. Most-starred / most-cited starter vaults and “conventions as product”

Personal / life OS (high visibility, weak code-binding):

| Vault / kit | Focus | Approx. stars | URL |
|-------------|--------|---------------|-----|
| quanru/obsidian-example-lifeos | PARA + periodic notes (“LifeOS”) | **~1.1k★** | https://github.com/quanru/obsidian-example-lifeos |
| SoRobby/ObsidianStarterVault | Bridging ideas → actions starter | **~377★** | https://github.com/SoRobby/ObsidianStarterVault |
| kobbled/technical-obsidian-template | Technical/scientific notes base | **~48★** (topic listing) | https://github.com/kobbled/technical-obsidian-template |
| anayatkhan1/Obsidian_vault | Developer productivity + Zettelkasten/PARA | **~39★** | https://github.com/anayatkhan1/Obsidian_vault |
| philoserf/obsidian-starter | Minimalist starter | **~20★** | https://github.com/philoserf/obsidian-starter |
| shuvangkardas/obsidian-starter-kit | Beginner kit, plugins preconfigured | **~21★** | https://github.com/shuvangkardas/obsidian-starter-kit |
| semanticdata/obsidian-starter-vault | Opinionated preconfigured vault | **~10★** | https://github.com/semanticdata/obsidian-starter-vault |

**Code / architecture / AI-agent oriented (lower stars, higher design signal):**

| Vault / project | Focus | Approx. stars | URL / evidence |
|-----------------|--------|---------------|----------------|
| **ArchitectKB** | Solutions-architect ontology; typed prefixes (`System -`, `ADR -`); Dataview MOCs; Templater; **Claude Code skills + hooks**; freshness/confidence/verification fields; FTS index | **~48★** | https://github.com/DavidROliverBA/ArchitectKB |
| **mcpvault** | MCP bridge to Obsidian vaults for agents; filters `.obsidian`, `.git`, `node_modules` | niche | https://github.com/bitbonsai/mcpvault |
| **ralph-vault-skill** | Skill to generate knowledge vaults for project loops | niche | https://github.com/SantanderAI/ralph-vault-skill |
| **syndcast-mind** (private first implementation) | Full mind: `map/zones`, decisions, specs, plans, tech-debt, bases, templates; zone cards with `owns.globs`, `verifiedAt` | n/a (source of memory-atlas) | `/home/kento/Repositories/syndcast/syndcast-mind` |
| **memory-atlas dogfood vault** | Slimmed toolkit + `atlas/` vault | n/a | `/home/kento/Repositories/memory-atlas/atlas` |

**Takeaway:** “Most starred starter vault” ≠ best model for **per-repo code knowledge**. Stars cluster on life OS. The **ArchitectKB / Dendron / Foam / memory-atlas** lineage is the relevant design space.

### 3. De-facto frontmatter and linking conventions

#### 3.1 What Obsidian (and thus most vaults) treat as first-class

From Obsidian Properties / 1.9 changelog and community practice:

| Key | Shape | Status |
|-----|--------|--------|
| `tags` | YAML **list** | Core; singular `tag` **removed** in 1.9 |
| `aliases` | YAML **list** | Core; singular `alias` removed |
| `cssclasses` | YAML **list** | Core; singular `cssclass` removed |
| Arbitrary properties | text, list, number, checkbox, date, date-time | Core Properties + Bases |

**Naming habits that became de-facto standard in the community:**

- Prefer **kebab-case or camelCase without spaces** for custom keys (Dataview sanitizes spaces to `dashed-lowercase`; spaced keys are painful in queries).
- Prefer **plural list properties** for multi-value fields (`tags`, `aliases`, related note lists).
- Prefer **ISO dates** (`YYYY-MM-DD`) for date fields so Dataview/Bases parse them.
- Prefer a **`type` (or note-class) property** for typed vaults: `journal`, `person`, `project`, `recipe`, etc. (forum best-practices threads; ArchitectKB; memory-atlas `type: zone|decision|…`).
- Prefer **`status` enums** for workflows (`active`, `done`, `archived`…) rather than only tags.
- **`summary` / `description` / `desc`** for one-line retrieval blurbs (Dendron uses `desc`; memory-atlas uses `summary`).

#### 3.2 Linking

| Convention | Syntax | Notes |
|------------|--------|-------|
| Wikilink | `[[Note Name]]` | De-facto standard across Obsidian + Foam |
| Section | `[[Note#Heading]]` | Widely supported |
| Block | `[[Note#^blockid]]` | Obsidian + Foam |
| Alias display | `[[Note\|label]]` | Both |
| Embed | `![[Note]]` | Obsidian + Foam |
| Markdown link | `[text](path.md)` | Portable; Foam can emit **link reference definitions** for GitHub UI navigation |
| Hierarchical tags | `#area/sub` | Foam Tag Explorer; Obsidian tags |

**De-facto standard for knowledge graphs:** **wikilinks in body + typed relationships in frontmatter** (`depends`, `related`, `sources`, ArchitectKB entity links). Tags alone do not replace structured links.

#### 3.3 Dataview / Templater patterns (what people actually ship)

Dataview metadata model (official docs):

- **YAML frontmatter fields** → page-level fields.
- **Inline fields** `Key:: value` or `[key:: value]` → body/list-item metadata.
- Implicit fields: `file.ctime`, `file.outlinks`, `file.tasks`, etc.
- Queries: `LIST` / `TABLE` / `TASK` with `WHERE type = "project" AND status = "active"`.

Templater patterns:

- Templates under a fixed folder (`Templates/`, `.foam/templates/`, memory-atlas `atlas/templates/`).
- Frontmatter stubs filled on create (`created`, `updated`, `type`, `tags`).
- Combined with Dataview: templates create consistent fields; dashboards query them.

**Bases (Obsidian core, 2025):** `.base` files / embeds define table/card views over properties — same storage model as Dataview (local MD + YAML), less JS. For memory-atlas open-source, **author-time optional**; **verifier must not require Bases**.

#### 3.4 Dendron’s stricter schema (developer-oriented precedent)

Dendron auto-frontmatter (wiki):

```yaml
id: <unique>
title: ...
desc: ...
updated: <unix ms>
created: <unix ms>
```

Plus publish/nav keys (`published`, `nav_order`, `noindex`, …). Hierarchy is **dot-filename** (`blog.reading.journal.2020`), not free folders. Custom keys allowed if they don’t collide with reserved. **Doctor** commands fix broken frontmatter — analogous to `atlas check`.

#### 3.5 Logseq divergence

- Page properties often as first-block `key:: value` (and/or YAML depending on config).
- Block-level properties and queries (Datalog) dominate.
- Interop with pure Obsidian vaults is “good enough for text, bad for plugins/queries.”

### 4. Folder taxonomies

#### 4.1 Personal PKM (default of high-star starters)

| Method | Shape | Use |
|--------|--------|-----|
| **PARA** (Tiago Forte) | Projects / Areas / Resources / Archives | Action-oriented life OS |
| **Johnny.Decimal** | Max 10 areas × 10 categories + IDs (`61.14`) | Constrained hierarchy, human addresses |
| **Zettelkasten / LYT** | Atomic notes + **Maps of Content (MOCs)** | Emergent structure via links |
| **Periodic notes** | Daily/weekly/monthly | Journals, not architecture |

These dominate Obsidian YouTube/starter culture; they **do not encode code ownership**.

#### 4.2 Developer / architecture vault patterns

Recurring shapes across ArchitectKB, Foam recipes, and syndcast/memory-atlas:

| Pattern | Examples |
|---------|----------|
| **Typed note classes** | `type` property and/or filename prefix (`System - X.md`, `ADR - Y.md`, `type: zone`) |
| **MOC / index / dashboard** | `_MOC - *.md`, `_Dashboard.md`, generated `map/index.md` |
| **Decision ledger** | `ADRs/` or `map/decisions/` |
| **Lifecycle ledgers** | specs / plans / tech-debt / ideas |
| **Zone or domain map** | folders or notes that **own code globs** (memory-atlas unique strength) |
| **Templates** | `Templates/` or `atlas/templates/` with one template per type |
| **Attachments / archive** | binary assets and cold storage |

**memory-atlas / syndcast-mind taxonomy (local evidence):**

```
atlas/   (or <repo>-atlas/, or syndcast-mind root)
  map/
    index.md          # GENERATED
    zones/*.md        # type: zone + owns.globs + verifiedAt + invariants
    decisions/*.md    # type: decision
  templates/*.md
  specs/ plans/ tech-debt/ ideas/ ...
```

Zone frontmatter (example paths: `atlas/map/zones/cli.md`, `syndcast-mind/map/zones/workspace-shell.md`) includes: `type`, `summary`, `tags`, `status`, `created`, `updated`, `verifiedAt`, `owns.{routes,testids,globs,tools}`, `depends`, `invariants`, `skills`, `sources`, `related`. That is **far denser than community starters** and is the product differentiator.

### 5. Vault-in-repo and Obsidian Git workflows

#### 5.1 Placement patterns

| Pattern | Description | Tradeoffs |
|---------|-------------|-----------|
| **Vault = entire git repo** | Notes-only repo (Foam template, personal vaults) | Clean; no code noise |
| **Vault = subdirectory of app repo** | e.g. `docs/`, `atlas/`, `knowledge/` opened as vault | Co-evolves with code; need exclude noise |
| **Vault as submodule / sibling** | Separate history | Cleaner boundaries; worse agent co-location |
| **Repo root as vault with excludes** | Open monorepo root in Obsidian | Needs aggressive exclude lists (devs request `.obsidianignore` / respect `.gitignore` — forum threads) |

memory-atlas chooses **subdirectory vault discovered by structure** (`map/zones/` or `map/index.md`), not by name (`docs/ADOPTION.md`, decision `0003-vault-named-atlas.md`) — correct for multi-repo adoption.

#### 5.2 `.gitignore` conventions (community consensus)

Near-universal:

- Ignore **volatile UI state**: `.obsidian/workspace.json`, `workspace-mobile.json`, often `.trash/`, `.DS_Store`.
- Ignore **plugin secrets**: `.obsidian/plugins/*/data.json` (API keys).
- Two schools for the rest of `.obsidian/`:
  1. **Ignore all `.obsidian/*`** and selectively un-ignore `community-plugins.json`, `core-plugins.json`, hotkeys (developer-oriented guide: https://rob.cogit8.org/posts/2025-03-25-obsidian-git-quick-setup-for-developers/).
  2. **Track plugins/themes for team consistency**, ignore only workspace + data.json.

For **code repos with an atlas subfolder**, recommend: **do not require committing plugin binaries**; ship **recommended plugin list in docs**, keep vault content + optional minimal `.obsidian` config. Agents and CI must run without Obsidian installed.

#### 5.3 Obsidian Git plugin behavior

- Auto commit-and-sync, pull on startup, source-control / history / diff views (desktop).
- Mobile: experimental / unstable (isomorphic-git limits); not a team backbone.
- Useful for humans editing vaults; **not** a substitute for normal git in agent workflows.

Foam path: vault is a git repo from day one; optional **link reference definitions** so GitHub renders navigable links without Obsidian.

### 6. Plugins most relevant to *code-project* vaults

| Plugin | Why it matters | Stars / scale |
|--------|----------------|---------------|
| Dataview | MOCs, dashboards over `type`/`status` | ~9.2k★ / ~4.5M dl |
| Templater | Typed note creation | ~5.1k★ |
| Obsidian Git | Human sync | ~11.6k★ |
| Periodic Notes / Calendar | Optional journals | popular; not core to atlas |
| Tasks | Optional | popular life OS |
| QuickAdd | Capture UX | popular |
| Metadata Menu | Schema-ish property UX | niche but aligned |
| Bases (core) | Native tables over properties | built-in since ~1.9 |

**For open-source memory-atlas:** document optional plugin stack; **enforce schema in CLI (`atlas check`)**, not in plugins.

### 7. Update / propagation mechanisms (adjacent industries)

Relevant to goal (3) — push convention improvements to many adopting repos without stomping local customizations:

| Mechanism | Behavior | Fit for memory-atlas |
|-----------|----------|----------------------|
| **Cookiecutter** | One-shot generate | Good for first `atlas init`; bad for updates |
| **Copier** | Template version + `.copier-answers.yml`; `copier update` 3-way merges template evolution vs local edits | Strong model for **skills, templates, config schema, ONRAMP snippets** |
| **git submodule / subtree** | Shared files | Painful for customized notes; OK for pure tooling package |
| **npm package of CLI only** | Update binary; vault content separate | What memory-atlas partly is today |
| **AI skill “update to latest”** | Agent reads upstream changelog + local vault + config; proposes PR | Best for **semantic** migrations (rename status enums, add frontmatter keys, re-stamp guidance) |
| **Codemods** | Deterministic AST/text transforms | Good for mechanical renames; brittle for prose |

Copier’s documented model: compare **old template → new template**, apply to project, preserve answers and non-conflicting local edits (https://copier.readthedocs.io/). That is the right mental model for `atlas update`, whether implemented as Copier itself or as an agent that simulates it.

### 8. Gap analysis: community vaults vs memory-atlas

| Capability | Typical Obsidian starter | ArchitectKB | Dendron | memory-atlas |
|------------|--------------------------|-------------|---------|--------------|
| Wikilinks + MD | yes | yes | yes | yes |
| Typed frontmatter | soft | strong (ontology) | strong (schemas) | strong (`type` + templates) |
| Query dashboards | Dataview | Dataview + skills | limited | generated index + check |
| **Code ownership globs** | rare | rare | rare | **first-class `owns.globs`** |
| **Freshness vs git** | date “last reviewed” | confidence/freshness fields | timestamps | **`verifiedAt` commit SHA** |
| **Invariants + tests** | no | hooks/skills | doctor | **`invariants.enforcedBy`** |
| Multi-repo update story | clone again | clone again | workspace multi-vault | **must invent (goal 3)** |
| Agent-first design | emerging | strong (Claude skills) | weak | strong (onramp skills) |

## Recommendations for memory-atlas

Prioritized for: (1) mature conventions now for 5 new minds, (2) later open-source, (3) respectful multi-repo updates.

### P0 — Lock the de-facto interop surface (this week)

1. **Publish a one-page “Atlas note format”** that aligns with Obsidian Properties:
   - Required plural: `tags` as list; optional `aliases`.
   - Required product keys: `type`, `summary`, `status`, `created`, `updated`.
   - Product-specific: `verifiedAt` (`unverified` | commit SHA), `owns`, `depends` as wikilink lists, `invariants`.
   - Explicit: **no dependency on Dataview/Bases for correctness**; optional authoring section.
2. **Keep structure-based vault discovery** (already correct); document “open `atlas/` as Obsidian vault” + recommended `.gitignore` snippet for `.obsidian/workspace*.json` and plugin `data.json`.
3. **Ship a minimal optional `.obsidian` recommendation** (community-plugins list only: Dataview, Templater) without vendoring plugin binaries — Foam-compatible.

### P1 — Authoring UX that matches community muscle memory

4. **Templater-compatible templates** (already in `atlas/templates/`) — ensure they use list-shaped `tags` and ISO dates so Bases/Dataview work if users install them.
5. **Optional Dataview/Bases recipes** in docs: e.g. table of zones by `status` and `verifiedAt` staleness — pure sugar over the same frontmatter.
6. **MOC pattern**: treat generated `map/index.md` as the system MOC; allow hand-written MOCs under `map/` that `atlas check` does not overwrite (ArchitectKB `_MOC` pattern).

### P2 — Differentiate on verification (product moat)

7. Market and document **code-bound zones** (`owns.globs` + stamp) as the feature personal vaults lack.
8. Keep **YAML subset parser** stable and document unsupported YAML so users don’t paste full YAML 1.1 from random starters and break CI (existing decision: yaml-subset).
9. Add a **doctor/migrate** command family (Dendron analogy): fix singular `tag`→`tags`, status enum renames, empty `verifiedAt` → `unverified`.

### P3 — Multi-repo “update to latest” design (before dozens of adopters)

10. **Split update surface into layers** (never one blunt sync):
    | Layer | Examples | Update strategy |
    |-------|----------|-----------------|
    | A. Tooling package | `atlas` CLI, schemas | semver / npm (or equivalent) |
    | B. Scaffolding | templates, skills, ONRAMP blocks, recommended gitignore | Copier-like or content-addressed versions + answers file |
    | C. Local product config | `vaultDir`, hooks toggles, enabled modules | **never auto-overwrite**; merge keys only |
    | D. Hand-authored knowledge | zone bodies, decisions, specs | **AI skill proposes PR**; human/agent review; never force |
11. **Introduce `atlas.version` / convention version** in config or a small `atlas.lock` (template version + answered prompts), analogous to `.copier-answers.yml`.
12. **Ship skill `atlas-update` (or extend recollection)**:
    - Input: upstream CHANGELOG / migration notes for convention N→N+1.
    - Steps: detect vault; read local config; list migrations; apply mechanical codemods; open draft PR for semantic conflicts; run `atlas check`.
    - Respect: custom zones, extra folders, renamed vault dir, disabled hooks.
13. **Do not use git submodules for vault content.** Package the CLI; version the convention; migrate content.

### P4 — Open-source readiness (align with sibling tools)

14. Position against **Foam** (interop story) and **ArchitectKB** (AI skills story), not against LifeOS starters.
15. Provide **greenfield** (`atlas init`) and **brownfield** (`docs/ADOPTION.md` path) — already started; add “from PARA vault” and “from ADR-only docs” recipes.
16. **README comparison table**: plain docs vs Obsidian vault vs Dendron vs memory-atlas (verification + globs).
17. Optional **Foam/VS Code** path for users who refuse Obsidian GUI — same files.

### P5 — Explicit non-goals (avoid scope creep)

18. Do not reimplement Dataview in the CLI.
19. Do not require Obsidian Git for teams (use normal git).
20. Do not adopt PARA as the default atlas taxonomy for code repos.
21. Do not sync or own `visuals/`-class asset pipelines (out of scope as stated).

## Open questions

1. **Convention versioning granularity:** Is a single integer `conventionVersion` enough, or do modules (zones, specs, skills) need independent versions?
2. **How much of `.obsidian/` should `atlas init` create?** Zero (docs only) vs minimal `community-plugins.json` — team preference for open-source first impression?
3. **Wikilink identity:** Filename slug vs Dendron-style stable `id` field? memory-atlas currently resolves like Obsidian (name/path); stable IDs help renames but cost complexity.
4. **Bases vs generated index:** When Bases is everywhere, should `map/index.md` stay generated Markdown tables or also emit a `.base` for GUI users?
5. **Multi-vault monorepos:** One atlas at root vs per-package atlases — does `atlas` need workspace-aware discovery?
6. **Update trust model:** Fully automatic codemods on CI vs human-approved PRs only? (Affects “dozens of repos” ops.)
7. **Foam link reference definitions:** Worth a `atlas foam-export` for GitHub-navigable wikilinks in PRs?
8. **Logseq users:** Any adoption target, or hard non-goal for property model?
9. **ArchitectKB-style skills pack:** Should memory-atlas ship a large skill surface in-repo or keep thin onramp + external skills?
10. **Legal/branding for open-source:** Obsidian is proprietary GUI; ensure docs never imply endorsement and keep AGPL/MIT choices clear for CLI vs vault content.

---

### Sources (web, primary)

- Foam: https://github.com/foambubble/foam · https://docs.foam.md · foam-template · Coming from Obsidian recipe  
- Obsidian Git: https://github.com/Vinzent03/obsidian-git · https://publish.obsidian.md/git-doc  
- Dataview metadata: https://blacksmithgu.github.io/obsidian-dataview/annotation/add-metadata/  
- Templater: https://github.com/SilentVoid13/Templater  
- Dendron frontmatter: https://wiki.dendron.so/notes/ffec2853-c0e0-4165-a368-339db12c8e4b/  
- Logseq: https://github.com/logseq/logseq  
- Obsidian Bases / 1.9: https://obsidian.md/changelog/2025-05-21-desktop-v1.9.0/ · https://obsidian.md/help/bases  
- Properties practice: https://forum.obsidian.md/t/obsidian-properties-best-practices-and-why/63891 · https://practicalpkm.com/complete-guide-to-obsidian-properties/  
- Dev git setup: https://rob.cogit8.org/posts/2025-03-25-obsidian-git-quick-setup-for-developers/  
- ArchitectKB: https://github.com/DavidROliverBA/ArchitectKB  
- Copier updates: https://copier.readthedocs.io/ · https://aiechoes.substack.com/p/template-once-update-everywhere-build-ab3  
- Plugin stats pointer: https://obsidian-plugin-stats.vercel.app · https://www.obsidianstats.com/plugins/dataview  

### Sources (local, read-only)

- `/home/kento/Repositories/memory-atlas/atlas/map/index.md`  
- `/home/kento/Repositories/memory-atlas/atlas/map/zones/cli.md`  
- `/home/kento/Repositories/memory-atlas/atlas/map/decisions/0003-vault-named-atlas.md`  
- `/home/kento/Repositories/memory-atlas/docs/ADOPTION.md`  
- `/home/kento/Repositories/memory-atlas/atlas/templates/*`  
- `/home/kento/Repositories/syndcast/syndcast-mind/map/zones/*` (structure + zone frontmatter samples)
