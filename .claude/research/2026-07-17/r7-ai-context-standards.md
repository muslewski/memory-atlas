# Repo context standards for AI agents (2026 landscape)

Research date: 2026-07-17  
Scope: AGENTS.md, CLAUDE.md, `.cursor/rules`, `llms.txt`, ruler-style managers, package managers for agent artifacts, context aggregators, update/versioning patterns — and where a per-repo knowledge atlas (memory-atlas) fits.  
Method: web research (public docs, GitHub READMEs, foundation announcements). Local repo analysis limited to read-only inspection of `memory-atlas`, `agentic-sage`, and `token-oracle` for positioning.

---

## Summary

- **AGENTS.md is the de facto cross-tool instruction standard** (~60k+ GitHub code hits; AAIF / Linux Foundation stewardship since Dec 2025). It is intentionally plain Markdown with no required schema — a “README for agents.”
- **Vendor-native files remain first-class and divergent**: `CLAUDE.md` + `.claude/rules/`, Cursor `.cursor/rules/*.mdc`, GitHub `.github/copilot-instructions.md`, Aider `CONVENTIONS.md` / `--read`, Windsurf `.windsurf/rules/`, Cline `.clinerules`, Goose `.goosehints`, Gemini `GEMINI.md`. Multi-tool shops almost always need either duplication or a generator.
- **Rule managers exist and are maturing**: Ruler (~2.8k★) is the best-known SSOT→distribute tool; Microsoft APM (~3.2–3.3k★) is the strongest “package manager for agent context” signal; PRPM (~118★) and ai-rulez (~130★) cover registry/package and generate-from-one-config niches.
- **Skills (`SKILL.md`) are a second major open standard** (agentskills.io, Anthropic origin, Dec 2025 open release) for *procedural* capabilities, orthogonal to *project instructions* and to *architectural knowledge*.
- **`llms.txt` (~2.5k★ for AnswerDotAI/llms-txt) is site/docs-oriented**, not a per-repo coding-agent control plane. It indexes external documentation for inference; Context7 (~59k★) is the dominant “pull fresh library docs into the agent” product.
- **Runtime agent memory (Mem0, Zep/Graphiti, Letta, etc.) solves personalization and cross-session chat memory** — not code-verified, git-native, human-reviewable architecture truth for a single repo.
- **Obsidian / “LLM wiki” patterns (Karpathy-style three-layer vaults, AGENTS.md as schema) are culturally adjacent** to memory-atlas: plain markdown knowledge agents read/write under conventions. Most are personal or org wikis, not code-anchored zone maps with `verifiedAt` + `atlas check`.
- **memory-atlas is a complement, not a competitor**, to AGENTS.md / Ruler / APM / Context7: instruction files govern *behavior*; managers distribute *behavior rules*; Context7 injects *upstream library docs*; an Atlas holds *this repo’s verified present-tense map + past-tense ledger*.
- **The open product gap for multi-repo adoption is “convention update with local customization respect”** — copier/cruft-style 3-way thinking, APM-style lockfiles for *shared packages*, plus an **AI/skill-driven “update atlas convention”** for *semantic* merges that pure templates cannot do. Sibling agentic-sage already models agent-runbook install (`AGENTS.md` as setup script) + non-clobbering wiring.

---

## Findings

### 1. Landscape map (five layers)

| Layer | What it is | Typical artifacts | Primary job | Update unit |
| --- | --- | --- | --- | --- |
| **L0 — Open standards** | Foundation / cross-vendor contracts | `AGENTS.md`, Agent Skills (`SKILL.md`), MCP, optionally `llms.txt` | Interoperability | Spec version + community adoption |
| **L1 — Vendor instruction surfaces** | What each harness actually loads | `CLAUDE.md`, `.cursor/rules/*.mdc`, `.github/copilot-instructions.md`, … | Always-on / scoped *how to work here* | Per-file edits; often duplicated |
| **L2 — Managers & registries** | SSOT, generate, install, lock | Ruler, APM, PRPM, ai-rulez | Stop N-way drift of L1 | Template/package version + lockfile / regenerate |
| **L3 — External knowledge injectors** | Live docs into context | Context7 MCP, docs `llms.txt` trees | Correct *library* APIs | Hosted index / library version |
| **L4 — Runtime memory** | Cross-session agent belief stores | Mem0, Zep, Letta, vendor “auto memory” | Personalization, chat continuity | API/store lifecycle |
| **L5 — Per-repo institutional knowledge** | Git-native, human-readable architecture truth | memory-atlas vaults, ADRs, Obsidian repo vaults, LLM wikis | *What this system is / why* with durable provenance | Convention version + zone stamps + CI check |

**memory-atlas lives at L5**, with a thin L1 on-ramp (the CLAUDE.md / AGENTS.md blocks in `docs/ONRAMP.md`) and optional L2-friendly packaging (CLI, skills, hooks).

### 2. AGENTS.md — the universal instruction file

**What it is.** A root (or nested monorepo) Markdown file: “README for agents” — build/test commands, style, PR rules, security caveats, boundaries. No required schema; headings are free-form. Closest file wins; user chat overrides. Nested files are first-class (e.g. large monorepos; OpenAI’s own trees cited with dozens of files).

**Governance / adoption evidence.**
- Official site: [https://agents.md/](https://agents.md/) — claims **60k+ open-source projects** (GitHub code search for path `AGENTS.md`).
- Spec repo: [https://github.com/agentsmd/agents.md](https://github.com/agentsmd/agents.md) — **~23.1k★** (page scrape, Jul 2026).
- Emerged from collaboration across Codex, Amp, Google Jules, Cursor, Factory; **stewarded by Agentic AI Foundation (AAIF) under Linux Foundation** as of Dec 2025, alongside Anthropic’s MCP and Block’s goose ([Linux Foundation press](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation), [aaif.io](https://aaif.io/), [aaif.io/projects/agents-md](https://aaif.io/projects/agents-md/)).
- Tool support is broad: Copilot coding agent explicitly supports `AGENTS.md` (plus still supporting `.github/copilot-instructions.md`, `CLAUDE.md`, `GEMINI.md`) — [GitHub Changelog 2025-08-28](https://github.blog/changelog/2025-08-28-copilot-coding-agent-now-supports-agents-md-custom-instructions/). VS Code documents both copilot-instructions and AGENTS.md ([docs](https://code.visualstudio.com/docs/agent-customization/custom-instructions)).

**What “good” looks like (industry guidance).** GitHub’s analysis of 2,500+ repos recommends six core areas: commands, testing, project structure, code style, git workflow, boundaries — start small, grow when agents err ([GitHub Blog](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)). Nested AGENTS.md is a documented monorepo pattern ([Medium / community](https://mcsee.medium.com/ai-coding-tip-014-use-nested-agents-md-files-23031bb0786a)).

**Implication for memory-atlas.** AGENTS.md is the **right cross-tool place for a short Atlas on-ramp** (already in `docs/ONRAMP.md` §2). It is the wrong place to dump zone architecture — that bloats always-loaded context and lacks `verifiedAt` / glob checks.

### 3. CLAUDE.md and Claude Code memory hierarchy

**What it is.** Claude Code’s primary project memory: Markdown loaded into the system prompt. Hierarchy typically: user `~/.claude/CLAUDE.md` → project `CLAUDE.md` or `.claude/CLAUDE.md` → modular `.claude/rules/*.md` (optionally path-scoped) → nested subdirectory CLAUDE.md on demand → auto-memory ([Claude Code docs: memory](https://code.claude.com/docs/en/memory)).

**Norms (2026 field practice).**
- Keep the root file short (community guidance often ~200–300 lines); push detail into rules or nested files.
- Modular topic files under `.claude/rules/` for testing, API design, security, etc.
- `@include`-style composition is used in advanced setups (including this owner’s global/project layering via includes) — composition is a *local* convention layered on the official loader.

**Implication.** CLAUDE.md is the **highest-leverage on-ramp for Claude-heavy fleets** (memory-atlas’s primary audience today). Atlas-first orientation belongs as a *section*, not the whole file. Vault content must stay **data, not executable instructions** (ONRAMP already states this — critical given CLAUDE.md’s imperative tone elsewhere).

### 4. Cursor rules (`.cursor/rules/*.mdc`)

**What it is.** Project rules as **Markdown + YAML frontmatter** (`.mdc`). Frontmatter controls `description`, `globs`, `alwaysApply`. Plain `.md` in that directory is ignored without frontmatter; AGENTS.md is the plain-markdown alternative Cursor also documents ([Cursor docs: Rules](https://cursor.com/docs/rules)). Legacy single-file `.cursorrules` is deprecated in favor of the directory model.

**Norms.** Focused, composable rules; short files; globs for path activation; descriptions written for agent selection. Community best-practice guides emphasize context budget (2026 writeups e.g. Morph, Vibe Coding Academy).

**Implication.** Cursor’s model is **retrieval-oriented modular rules** — closer to skills + path-scoped CLAUDE rules than to a single AGENTS.md blob. An Atlas does not replace path rules; zone cards answer *subsystem truth*, MDC rules answer *how to edit files of type X*.

### 5. GitHub Copilot instruction surfaces

| File / path | Role |
| --- | --- |
| `.github/copilot-instructions.md` | Workspace-wide custom instructions |
| `.github/instructions/**/*.instructions.md` | Path/task-scoped (`applyTo`) |
| `AGENTS.md` / nested | Cross-agent + coding agent support |
| Custom agents / skills collections | [github/awesome-copilot](https://github.com/github/awesome-copilot) community library |

Copilot’s multi-format support is a **compatibility reality**: teams often keep AGENTS.md as SSOT and still maintain or generate Copilot-specific files.

### 6. Other vendor files (fragmentation inventory)

From Ruler’s supported-agent table and ecosystem practice ([intellectronica/ruler](https://github.com/intellectronica/ruler)):

| Agent / tool | Common instruction artifact |
| --- | --- |
| Aider | `CONVENTIONS.md` via `--read` / `.aider.conf.yml` `read:` |
| Windsurf | `.windsurfrules` (legacy) → `.windsurf/rules/*.md` with frontmatter |
| Cline | `.clinerules` / `.clinerules/` |
| Goose | `.goosehints` |
| Gemini CLI | `GEMINI.md` or AGENTS.md via settings |
| Amazon Q, Junie, Trae, Kiro, Warp, … | Various proprietary paths |

**Takeaway:** Fragmentation is structural. **Winning strategies in 2026 are (a) AGENTS.md as lowest-common-denominator, (b) generate/distribute for the rest, (c) do not invent a 16th proprietary instruction filename for product value.**

### 7. `llms.txt` — docs index, not repo agent config

**Spec:** [https://llmstxt.org/](https://llmstxt.org/) (Jeremy Howard / Answer.AI, Sep 2024). Markdown file at site root: H1 + optional summary + H2-sectioned link lists to LLM-friendly pages; optional `## Optional` section for skippable depth. Companion practice: serve `.md` mirrors of HTML docs.

**Repo:** [AnswerDotAI/llms-txt](https://github.com/AnswerDotAI/llms-txt) — **~2.5k★**.

**Adoption pattern:** Documentation sites (Stripe, Cloudflare, Anthropic, Vercel examples in industry blogs), generators for Docusaurus/VitePress, Context7-style pipelines that *consume* curated docs.

**Relation to coding agents:** Helps when an agent needs **upstream product/library docs**. It does **not** replace AGENTS.md for *this* repository’s build commands, nor zone cards for *this* architecture. A published open-source memory-atlas could *expose* `llms.txt` for its own docs site; adopting apps rarely need an in-repo `llms.txt` for local agent work.

### 8. Tools that *manage* instruction files across formats (most relevant)

#### 8.1 Ruler — SSOT distribute (`intellectronica/ruler`)

- **URL:** [https://github.com/intellectronica/ruler](https://github.com/intellectronica/ruler)  
- **Stars:** ~**2.8k** (topic listing / community cites, mid-2026).  
- **Model:** Author rules in `.ruler/` (Markdown + `ruler.toml`); `ruler apply` concatenates and writes agent-native files (AGENTS.md, CLAUDE.md, Cursor, Copilot, Aider, Windsurf, 30+ targets). Also propagates MCP configs, skills, and some subagent layouts. Nested `.ruler/` supported. Often **gitignores generated agent files** so the SSOT stays clean.
- **Best metaphor:** “Prettier for agent instructions” / one source → many sinks.
- **Gap vs memory-atlas:** Manages *behavioral instructions*, not *verified architecture knowledge*. Does not check claims against `git ls-files`.

#### 8.2 Microsoft APM — Agent Package Manager (`microsoft/apm`)

- **URL:** [https://github.com/microsoft/apm](https://github.com/microsoft/apm) · docs [https://microsoft.github.io/apm/](https://microsoft.github.io/apm/)  
- **Stars:** ~**3.2–3.3k**.  
- **Model:** `apm.yml` declares skills, prompts, instructions, plugins, MCP servers; install + lockfile for reproducible agent context across Copilot, Claude Code, Cursor, Codex, Gemini, Windsurf, Kiro, etc. Built on AGENTS.md + Agent Skills + MCP.
- **Best metaphor:** **npm for agent context packages**.
- **Gap:** Packages *reusable* agent artifacts; does not maintain a per-repo map of subsystems with freshness.

#### 8.3 PRPM — Prompt / rules registry (`pr-pm/prpm`)

- **URL:** [https://github.com/pr-pm/prpm](https://github.com/pr-pm/prpm) · [https://prpm.dev](https://prpm.dev)  
- **Stars:** ~**118**.  
- **Model:** npm-like registry for prompts, rules, skills, agents; convert formats on install (`--as cursor`, etc.). Blog claims large package corpus; positions as complementary to vendor plugin marketplaces (knowledge text vs tool extensions).
- **Gap:** Distribution/discovery of *generic* rules, not repo-specific verified knowledge.

#### 8.4 ai-rulez (`Goldziher/ai-rulez`)

- **URL:** [https://github.com/Goldziher/ai-rulez](https://github.com/Goldziher/ai-rulez)  
- **Stars:** ~**130**.  
- **Model:** Write once in `.ai-rulez/`; `generate` native configs for 19+ tools; ships opinionated builtin domains; MCP tools for self-governance of rules.
- **Gap:** Same L1/L2 layer as Ruler; generator + builtins, not architecture vault.

#### 8.5 Content libraries (not managers, but high-star “rules” assets)

| Repo / product | ~Stars | Role |
| --- | --- | --- |
| [agentsmd/agents.md](https://github.com/agentsmd/agents.md) | ~23.1k | Spec / evangelism for AGENTS.md |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | claimed ~40k+ in secondary sources | Curated engineering skills library |
| [ciembor/agent-rules-books](https://github.com/ciembor/agent-rules-books) | ~2.2k | Book-inspired AGENTS.md rules/skills packs |
| [yzhao062/agent-style](https://github.com/yzhao062/agent-style) | ~567 | Writing-style rules for agent output |
| [github/awesome-copilot](https://github.com/github/awesome-copilot) | large community catalog | Copilot agents, instructions, skills |

These prove demand for **portable guidance packs**. They are inputs *into* L1/L2, not substitutes for L5.

### 9. Agent Skills (`SKILL.md`) — procedural capability standard

- **Home:** [https://agentskills.io/](https://agentskills.io/) · GitHub org agentskills  
- **Origin:** Anthropic; open standard announced ~18 Dec 2025; progressive disclosure (metadata always; body loaded when relevant).  
- **Shape:** Directory with `SKILL.md` (YAML frontmatter `name` + `description` + instructions) + optional scripts/references.  
- **Adoption:** Claimed across 20+ platforms (Claude, Codex, Copilot, Cursor, etc. — industry reporting).

**Orthogonality matrix:**

| Concern | Standard / product |
| --- | --- |
| How should any agent behave in this repo? | AGENTS.md / CLAUDE.md / rules |
| How do I perform a multi-step capability? | Agent Skill |
| What is subsystem X *right now*, verified? | **memory-atlas zone** |
| Why did we choose Y? | **memory-atlas decision ledger** |
| What is library Z’s current API? | Context7 / llms.txt docs |

memory-atlas already ships/skills-on-ramps (`atlas-nav`, recollection discipline). Skills are the **right vehicle for “update atlas convention” and “seed zones from code”** workflows — not for storing zone content itself.

### 10. Context aggregators & external doc grounding

**Context7** ([https://context7.com/](https://context7.com/), [upstash/context7](https://github.com/upstash/context7) — **~59k★**): MCP/API that injects **version-specific library documentation** into agents. Solves training-cutoff / wrong-API problems for *dependencies*. Completely different problem from “what does *our* payment service own in this monorepo?”

Other patterns: Continue.dev rules + context providers; vendor @-docs; docs site `llms.txt` expansion to `llms-ctx.txt`.

### 11. Runtime agent memory vs repo knowledge

2026 comparison pieces (e.g. [fountaincity.tech agent memory systems](https://fountaincity.tech/resources/blog/agent-memory-knowledge-systems-compared/), Mem0 state reports) contrast managed vector/graph memories with **“markdown vault + semantic search” DIY**. Consensus: managed memory is for *agent experience continuity*; **git markdown** is better for *institutional, reviewable, portable* knowledge.

memory-atlas’s differentiator vs both camps remains (from product README/SPEC):

- Map vs ledger separation (present vs past).
- **Code-verified anchors** (`owns.globs` vs `git ls-files`).
- **Honest freshness** (`verifiedAt`: `unverified` | commit SHA).
- Generated index + `atlas check` as merge gate.

That is not what Mem0/Zep productize, and not what AGENTS.md standardizes.

### 12. Obsidian / LLM-wiki adjacency (cultural fit)

2026 practice strongly converges on:

1. **Plain markdown vaults** agents can read/write.
2. **AGENTS.md or CLAUDE.md as schema** (conventions for the vault).
3. Layered designs (Karpathy-style raw sources / wiki / schema; personal Obsidian + Claude Code).

Examples of discourse: Karpathy LLM Wiki gist references in blog posts; Obsidian+GitHub private AI vaults; plugins like Vault Knowledge Base (OKB) for local retrieval into Codex/Claude/OpenCode.

**memory-atlas is already in this cultural stream** but **narrows the product** to *per-repo, code-verified architecture orientation for agent fleets* — not a general second brain. That narrowing is a strength for open-source positioning (clear wedge) if messaging stays sharp.

### 13. Versioning & update handling (cross-cutting patterns)

| Pattern | How updates work | Respects local customization? | Fit for atlas conventions |
| --- | --- | --- | --- |
| **npm/PyPI package bump** | CLI/tooling updates; data stays | Excellent for *code*; doesn’t update vault *templates/content* | Update `memory-atlas` binary this way |
| **Ruler regenerate** | SSOT → overwrite generated sinks | Good if sinks are generated-only / gitignored | Use for L1 instruction *projections*, not zones |
| **Copier `update`** | 3-way merge template vs last generation vs project | Strong for *file-shaped* templates; weak for semantic content | Good for scaffolding skeleton + templates/ |
| **Cruft** | Cookiecutter + update tracking | Similar to copier | Same |
| **APM lockfile** | Pin package versions of skills/instructions | Strong for *shared packages* | Good if atlas ships installable skills/packs |
| **Agent-driven install** (agentic-sage model) | `AGENTS.md` runbook + doctor skill; non-clobbering installer | Explicit design: back up, skip-if-present, reversible uninstall | **Best analogue for convention upgrades that touch CLAUDE.md / hooks / local config** |
| **AI codemod / skill “update to latest”** | Agent diffs upstream convention vs local vault + config | Can understand intent, preserve hand-authored zones | **Primary design target for multi-repo fleet maturity** |

**agentic-sage local evidence** (`~/Repositories/agentic-sage/README.md`):  
- Universal core vs project adapter split.  
- Non-clobbering install; surgical uninstall.  
- “Tell your agent to set it up” via AGENTS.md runbook.  
- Upgrade path: package update doesn’t break existing wiring.  

**memory-atlas local evidence:**  
- `docs/ONRAMP.md` — paste blocks for CLAUDE.md / AGENTS.md + optional hooks.  
- `docs/ADOPTION.md` — brownfield inventory mapping, additive `atlas init`, honest `seeded`/`unverified` seeding.  
- `atlas.config.json` kill switches and per-hook toggles — good bones for “respect local config.”  
- Missing (as product): a documented **`atlas update` / skill-driven convention migrate** with conflict policy for customized on-ramp text, templates, and optional modules.

### 14. Where memory-atlas fits: complement vs competitor

```
┌─────────────────────────────────────────────────────────────┐
│  L3 Context7 / llms.txt     upstream library & product docs │
└────────────────────────────▲────────────────────────────────┘
                             │ on-demand inject
┌────────────────────────────┴────────────────────────────────┐
│  L1/L2  AGENTS.md · CLAUDE.md · .cursor/rules · Ruler/APM   │
│         “how to behave / which skills / which tools”          │
└────────────────────────────▲────────────────────────────────┘
                             │ on-ramp points at map/index.md
┌────────────────────────────┴────────────────────────────────┐
│  L5  memory-atlas vault                                     │
│      zones (verified present) · decisions (frozen why)        │
│      specs/plans · tech-debt · generated index · atlas check  │
└────────────────────────────▲────────────────────────────────┘
                             │ optional retrieval skill / FTS
┌────────────────────────────┴────────────────────────────────┐
│  L4 runtime memories (session/personal) — usually orthogonal │
└─────────────────────────────────────────────────────────────┘
```

| Product class | Competes with atlas? | Why |
| --- | --- | --- |
| AGENTS.md / CLAUDE.md / Cursor rules | **No** — complement | Behavior vs architecture truth; atlas *uses* short on-ramps |
| Ruler / APM / PRPM / ai-rulez | **No** — complement (or distribution channel) | They ship *instructions/skills packages*; atlas is *repo knowledge* |
| Context7 / llms.txt | **No** — complement | External docs vs internal architecture |
| Mem0 / Zep / Letta | **Mostly no** | Different persistence model & purpose; overlap only if mis-sold as “project memory” |
| Generic Obsidian second-brain / LLM wiki | **Partial** | Same medium (md vault); atlas wins on code verification, freshness, CI, agent-fleet on-ramp |
| ADR-only / docs/ARCHITECTURE.md | **Partial** | Atlas generalizes + verifiability; can import via ADOPTION.md |

**Positioning sentence for open-source:**  
*memory-atlas is the verified architecture layer for multi-agent coding fleets — the map your AGENTS.md points at, not another rules file to sync.*

### 15. Risks if memory-atlas confuses layers

1. **Stuffing zone content into AGENTS.md** → context bloat, no verification, fights AAIF simplicity ethos.  
2. **Competing with Ruler/APM** on multi-format emission → wrong moat; partner or document “use Ruler for L1, Atlas for L5.”  
3. **Treating vault notes as executable instructions** → prompt-injection / confused-deputy risk (ONRAMP already forbids this; keep it loud).  
4. **Silent auto-stamp / auto-verify on update** → destroys trust in `verifiedAt` (SPEC discipline must survive any update tool).  
5. **Template overwrite of hand-authored zones** → catastrophic for multi-repo fleets; updates must be **additive/merge** on content, **regenerate** only for true generated files (`map/index.md`, package CLI).

---

## Recommendations for memory-atlas

Prioritized for maturing now (5 new minds) and open-sourcing later.

### P0 — Own the complement story (messaging + on-ramp)

1. **Document the layer diagram** in README / ADOPTION: AGENTS.md & CLAUDE.md = behavior; Atlas = verified understanding; Context7 = library docs; Skills = procedures.  
2. **Keep ONRAMP blocks short** and dual-ship **AGENTS.md (tool-agnostic) + CLAUDE.md (richer)** — already correct; ensure every template mentions both.  
3. **Never invent a new instruction filename** (e.g. `ATLAS.md` as loader). Point standard files *at* `map/index.md`.  
4. **Publish an `llms.txt` only for the product docs site** (optional), not as adopt-repo requirement.

### P0 — Convention versioning for multi-repo fleets

5. **Introduce an explicit convention version** in `atlas.config.json` (e.g. `conventionVersion: "0.x"`) and stamp it on init.  
6. **Design `atlas update` (or `/atlas-update` skill) as a 3-way-aware, agent-executable workflow:**  
   - Inputs: pinned memory-atlas package version, conventionVersion, local `atlas.config.json`, local templates/, on-ramp sections in CLAUDE.md/AGENTS.md, vault content.  
   - **Never auto-modify** zone/decision body text except optional additive migrations (new frontmatter keys with defaults).  
   - **Regenerate** only generated artifacts (`map/index.md` via `atlas build`).  
   - **Merge** templates with copier-like or explicit “upstream vs local” markers.  
   - **Propose** CLAUDE.md/AGENTS.md on-ramp diffs as a patch the human/agent applies (non-clobber; match agentic-sage).  
   - **Refuse** blanket `stamp`; preserve `unverified` honesty.  
7. **Ship a doctor skill** (`/atlas-doctor` parallel to sage-doctor): config present, conventionVersion, check clean, on-ramp section detected, hooks optional status.

### P1 — Interop with L2 managers (don’t rebuild them)

8. **Document Ruler/APM coexistence:** Atlas SSOT for vault; Ruler SSOT for multi-agent instruction projections if a shop needs 10 harnesses. Provide a sample `.ruler/` snippet that only contains the short ONRAMP AGENTS block.  
9. **Package atlas skills for APM/PRPM** when open-sourcing: `atlas-nav`, `atlas-update`, `atlas-recollect` as installable skills — distribution without owning a registry.  
10. **Optional:** emit a minimal `AGENTS.md` fragment from `atlas init` *only if absent* (non-clobber) — never overwrite.

### P1 — Retrieval & machine-readable edges

11. **Keep vault as human Markdown**; add **structured frontmatter** as the machine-readable surface (already true). Avoid requiring JSON-LD/RDF.  
12. **Stabilize a small “agent map API”**: `atlas status --json`, `atlas check --json`, and index sections agents can parse — better than inventing a parallel XML format.  
13. **ctx-search / FTS adapters** stay optional modules (ADOPTION already modular) — default path remains `map/index.md` orientation.

### P2 — Open-source narrative & sibling ecosystem

14. **Position as sibling to agentic-sage and token-oracle**: fleet judge (who’s working) + token forecast (capacity) + atlas (what’s true about the code). One-line portfolio story.  
15. **Reuse sage patterns:** agent-runbook AGENTS.md for install/update; non-clobbering hooks; `enabled: false` master kill switch (already in config); reversible uninstall for any global wiring.  
16. **Brownfield story is a launch feature** (ADOPTION.md) — many OSS adopters will have ADRs; import path beats greenfield-only tools.

### P2 — Explicit non-goals (protect focus)

17. **Do not** become a general agent memory database.  
18. **Do not** become a multi-format rules synchronizer (Ruler/APM territory).  
19. **Do not** absorb visuals/product UI from syndcast-mind (already out of scope).  
20. **Do not** auto-verify agent-written zones — seed ≠ stamp is the trust model.

### Concrete update-mechanism sketch (for later design doc)

```
atlas update [--dry-run] [--convention from-package]
  1. Read local conventionVersion + package version
  2. Load migration scripts M_i for versions (convention, not zone content)
  3. Apply file ops:
       templates/*     → 3-way or “create if missing / show diff if changed”
       atlas.config    → additive keys only; never reset user toggles
       CLAUDE/AGENTS   → detect ONRAMP markers; patch between markers only
       vault zones     → migrations may add optional frontmatter; never rewrite body
  4. atlas build && atlas check
  5. Print report: applied / skipped-local / needs-human
```

For **semantic** hard cases (restructured zone taxonomy, renamed modules), ship an **Agent Skill** that performs the migration with human confirmation — pure codemods are insufficient when local customization is intentional.

---

## Open questions

1. **Should convention migrations be versioned inside the npm package only, or as a separate `memory-atlas-convention` artifact** so vaults can pin convention independently of CLI bugfix releases?  
2. **Marker strategy for on-ramp blocks:** HTML comments (`<!-- atlas-onramp:start -->`), heading anchors, or hash of stock text — which survives human reformatting best?  
3. **Ruler integration depth:** first-class adapter vs docs-only? Worth a maintainer relationship pre-OSS?  
4. **Monorepo multi-atlas:** one vault per package vs one vault with nested zones — how should nested AGENTS.md interact with a single `atlas.config.json`?  
5. **AAIF / agents.md alignment:** any value in registering an “Atlas on-ramp” example with the foundation, or is that noise?  
6. **Freshness vs velocity:** for 5 new repos, is `seeded` + CI `atlas check` (without full human stamp) acceptable for N weeks, or does that train agents to distrust the map?  
7. **Skill vs CLI for update:** pure Node CLI for deterministic file ops + skill for judgment — exact split?  
8. **Private multi-repo fleet before OSS:** should `atlas update` target a private template git remote (copier-style) owned by the user, with memory-atlas only providing the engine?  
9. **Conflict with global CLAUDE.md includes:** how should project Atlas on-ramps compose with user-level agent preferences without double-loading or contradiction?  
10. **Metrics for maturity:** what proves the update mechanism works — dry-run diff size on syndcast + 5 new repos after a deliberate convention break?

---

## Sources (selected)

| Topic | URL | Notes |
| --- | --- | --- |
| AGENTS.md standard | https://agents.md/ | 60k+ projects claim |
| AGENTS.md GitHub | https://github.com/agentsmd/agents.md | ~23.1k★ |
| AAIF | https://aaif.io/ | MCP, goose, AGENTS.md |
| LF AAIF announcement | https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation | Dec 2025 |
| Copilot + AGENTS.md | https://github.blog/changelog/2025-08-28-copilot-coding-agent-now-supports-agents-md-custom-instructions/ | Multi-format support |
| Writing AGENTS.md | https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/ | 2500+ repo study |
| Claude memory | https://code.claude.com/docs/en/memory | CLAUDE.md + rules |
| Cursor rules | https://cursor.com/docs/rules | `.mdc` frontmatter |
| VS Code custom instructions | https://code.visualstudio.com/docs/agent-customization/custom-instructions | AGENTS.md + copilot-instructions |
| llms.txt | https://llmstxt.org/ | Site-level LLM index |
| llms-txt repo | https://github.com/AnswerDotAI/llms-txt | ~2.5k★ |
| Ruler | https://github.com/intellectronica/ruler | ~2.8k★, 30+ agents |
| Microsoft APM | https://github.com/microsoft/apm | ~3.2–3.3k★ |
| PRPM | https://github.com/pr-pm/prpm | ~118★ registry |
| ai-rulez | https://github.com/Goldziher/ai-rulez | ~130★ generate |
| Agent Skills | https://agentskills.io/ | Open skill format |
| Context7 | https://github.com/upstash/context7 | ~59k★ docs injector |
| Aider conventions | https://aider.chat/docs/usage/conventions.html | CONVENTIONS.md |
| Copier updates | community posts / copier docs | 3-way template update pattern |
| Local product | `memory-atlas/README.md`, `SPEC.md`, `docs/ONRAMP.md`, `docs/ADOPTION.md` | Atlas design |
| Sibling patterns | `agentic-sage/README.md`, `token-oracle/README.md` | Install/update analogues |

Star counts are approximate from public GitHub pages / secondary listings as of research day; GitHub API rate limits prevented a simultaneous live recount for every repo.

---

*End of report.*
