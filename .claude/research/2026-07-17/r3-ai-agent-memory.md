# Memory systems for AI coding agents (2026): landscape, storage models, and what wins for per-repo file-based minds

Research date: 2026-07-17  
Scope: mem0, Letta/MemGPT, Zep/Graphiti, Cognee, Claude Code (CLAUDE.md + auto-memory), Cursor (rules/memories), aider repo-map, GitHub Copilot (Spaces / instructions / AGENTS.md), and notable 2025–2026 entrants. Focus: storage substrate, update lifecycle, aging/invalidation, per-repo scoping, and which **file-based per-repo conventions** are winning for coding agents — with concrete implications for **memory-atlas**.

---

## Summary

- **Two markets, not one.** (A) *Agent memory layers* (Mem0, Zep, Letta, Cognee, Hindsight, Supermemory) solve **cross-session user/agent fact memory** with DBs/graphs and retrieval APIs. (B) *Coding-agent project memory* solves **per-repo operational knowledge** (build, conventions, architecture, decisions) — and is overwhelmingly **git-versioned markdown** plus light machine-local notes.
- **File-based conventions are winning for coding agents** because coding agents are post-trained on filesystem tools (`ls`/`grep`/`read`/`edit`); Letta’s LoCoMo run showed plain filesystem tools (~74% with gpt-4o-mini) beating specialized memory-tool setups on a retrieval benchmark when the agent can search iteratively.
- **De facto open standard for instructions: `AGENTS.md`** — “README for agents,” used by 60k+ open-source projects, stewarded by the Agentic AI Foundation (Linux Foundation); multi-vendor support (Codex, Copilot coding agent, Cursor, Jules, Aider via config, Windsurf, etc.). Claude Code still prefers `CLAUDE.md` but officially documents `@AGENTS.md` import / symlink.
- **Hierarchy + path-scoping beat one mega-file.** Winners: layered always-on files (`AGENTS.md` / `CLAUDE.md` / `.github/copilot-instructions.md`) + modular rules (`.claude/rules/`, `.cursor/rules/*.mdc`, nested `AGENTS.md`) + optional multi-file “memory bank” for active work state. Single bloated root files rot and lose adherence.
- **Auto-memory is real but local and soft.** Claude Code writes machine-local `~/.claude/projects/<repo>/memory/MEMORY.md` (first 200 lines / 25KB auto-loaded; topic files on demand). Cursor “memories” are auto-extracted, project-oriented but UI/cloud-side and less portable than repo markdown. Neither replaces committed architecture truth.
- **DB/graph products excel at temporal invalidation and multi-user agents**, not at shipping a greppable vault in every repo. Zep/Graphiti’s bi-temporal edges (`valid_at` / `invalid_at`) are the clearest “aging” story; Mem0 historically self-edits conflicts (with 2026 ADD-only variants); coding-file systems mostly use **human/agent edit + git history** (memory-atlas’s `verifiedAt` is unusual and valuable here).
- **Repo-map is structural context, not semantic memory.** Aider’s tree-sitter + PageRank map (~1k tokens default) answers “what symbols exist and matter,” not “why we chose X.” Complementary to atlas/zone cards.
- **Copilot Spaces** are curated, cloud-synced context hubs (repos, issues, docs, free text) with auto-refresh of GitHub sources — strong for teams, weak as a portable open convention and not a substitute for in-repo zone cards.
- **For memory-atlas:** stay file-first and Obsidian-compatible; dual-on-ramp (`AGENTS.md` + thin `CLAUDE.md`); keep **verified truth (map)** separate from **agent scratch (auto-memory / progress)**; design update propagation as **3-way AI codemod** (upstream template vs local vault vs config), not as force-overwrite of zone content.
- **Biggest gap the market still has:** honest freshness / invalidation for *repo architecture knowledge*. Vector memory layers forget and re-extract; markdown banks go stale silently. `verifiedAt` + `atlas check` is a differentiator — double down, don’t replace it with embeddings alone.

---

## Findings

### Comparison matrix (coding-relevant view)

| System | Approx. adoption | Storage | Update | Age / invalidate | Per-repo scope | Coding-agent fit |
| --- | --- | --- | --- | --- | --- | --- |
| **Mem0** | ~48–61k★ (`mem0ai/mem0`) | Vector + KV (+ graph Pro); SaaS or self-host | LLM extract; ADD / UPDATE / DELETE or 2026 single-pass ADD-only | Conflict self-edit historically; prune/archive operational | `user_id` / session / agent IDs — not git-repo-native | Strong for chat personalization; bolt-on for coding via MCP |
| **Letta / MemGPT** | ~22–23k★ (`letta-ai/letta`) | DB-backed memory blocks + archival; filesystem tools | Agent self-edits core blocks; tools move RAM↔disk | Tier eviction (core vs recall vs archival), not temporal fact graph | Agent-centric, not repo-vault | Strong agent OS; “files as interface” thesis |
| **Zep / Graphiti** | Graphiti ~20–27k★; Zep product smaller | Temporal knowledge graph (Neo4j etc.); managed Context Lake | Episode ingest → extract → resolve | **Best-in-class:** `valid_at` / `expired_at` / `invalid_at`; history kept | User/session/graph IDs | Great for evolving product facts; overkill as sole coding vault |
| **Cognee** | ~15–28k★ (`topoteretes/cognee`) | Graph + vector + relational (Kuzu/LanceDB/Postgres path) | Batch “cognify” pipeline (classify→chunk→entities→embed) | Graph evolution / memify; not coding-verifiedAt | Dataset / project namespaces | Strong data→KG memory; ingest-oriented |
| **Claude Code** | Anthropic product | **Files:** `CLAUDE.md`, `.claude/rules/`, machine-local auto-memory | Human edits + Claude auto-write | Soft: index size caps; manual prune; no temporal graph | Project / user / org / path-scoped rules; auto-mem per git repo | **Primary coding pattern today** |
| **Cursor** | Closed IDE | **Files:** `.cursor/rules/*.mdc`; Memories (product store); community Memory Bank md | Rules by hand; memories auto | Rules = VCS; memories opaque | Project rules in repo; memories claimed project-scoped | Dominant IDE; rules win for portability |
| **aider** | Mature OSS CLI | Ephemeral **repo-map** from tree-sitter; optional conventions file | Rebuild map each turn | N/A (derived from code) | Single git repo | Structural context, not LTM knowledge |
| **Copilot** | GitHub platform | `.github/copilot-instructions.md`, `AGENTS.md`, Spaces (cloud index) | Manual + Spaces sync from GitHub sources | Spaces stay “evergreen” for linked GitHub content; free-text can stale | Repo / Space / nested AGENTS | Team-scale; Spaces not open-portable |
| **AGENTS.md (format)** | 60k+ repos with file | Markdown in git | Human/agent edit | None built-in | Nested nearest-wins | **Cross-tool instruction standard** |
| **Cline Memory Bank** | Methodology (Cline ~29k★ ext.) | `memory-bank/*.md` in repo | “update memory bank” ritual | Manual; activeContext churn | Per repo | Multi-file state pattern widely copied |
| **Hindsight** (2026) | Fast-growing OSS (Vectorize) | Embedded Postgres / learning-oriented memory | retain / consolidate | Consolidation levers (importance, merge, decay, eviction) | Agent/user | Hot 2026 entrant; not file-vault |
| **Supermemory** | ~26k★ class (reports vary) | Cloud/pgvector style; MCP-first | API retain/recall | Product-specific | User/workspace | Coding-agent MCP layer |
| **memory-atlas** | This toolkit | **Obsidian vault:** zones, decisions, specs; `verifiedAt` | Human/agent + `stamp` / `build` / `check` | **Git-honest freshness** | Explicitly per-repo | Differentiated on verification |

Star counts are approximate mid-2026 aggregates from vendor blogs and GitHub pages (they move weekly); treat as order-of-magnitude.

---

### 1. Mem0 — universal memory layer (DB/vector-first)

**What it is.** Open-source + managed “memory layer for AI agents” (`https://github.com/mem0ai/mem0`, product `https://mem0.ai/`). Academic framing: arXiv:2504.19413 *Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory* (ECAI 2025 lineage). Industry writeups place it as the most widely adopted plug-in memory SDK (~48k–61k stars, multi-framework integrations).

**Storage.** Hybrid: vector search + key-value (+ graph memory on higher tiers). Not a git vault. Backends are pluggable (many vector stores reported in 2026 state-of-memory materials).

**Update.** Classic pipeline: extraction phase from conversation, then update phase that ADD/UPDATE/DELETE against existing memories when facts conflict. 2026 product/research notes also describe **single-pass ADD-only extraction** (accumulate, less overwrite) plus entity linking and multi-signal retrieval (semantic + BM25 + entity fusion). Scopes: user / session / agent.

**Age / invalidate.** Conflict-driven self-edit historically keeps the store lean; operational guidance emphasizes prune/archive cadences and fact-category expiry policies (lifecycle is operational, not only algorithmic). Not bi-temporal in the Graphiti sense.

**Per-repo.** Scoped by application IDs (`user_id`, `agent_id`, `run_id`), not by git root. Coding use is “attach via SDK/MCP,” not “commit a mind into the repo.”

**Evidence.**  
- Repo: `https://github.com/mem0ai/mem0`  
- Paper: `https://arxiv.org/abs/2504.19413`  
- State of AI Agent Memory 2026: `https://mem0.ai/blog/state-of-ai-agent-memory-2026`  
- Comparisons: `https://atlan.com/know/best-ai-agent-memory-frameworks-2026/`, `https://vectorize.io/articles/mem0-vs-letta`

---

### 2. Letta / MemGPT — OS-style tiered memory + “files as interface”

**What it is.** MemGPT (arXiv:2310.08560) → productized as Letta (`https://github.com/letta-ai/letta`, `https://www.letta.com/`). Agent self-manages memory like an OS.

**Storage.**  
- **Core memory blocks** — small, pinned in context, persisted in DB with `block_id`.  
- **Recall** — searchable conversation history outside the window.  
- **Archival** — cold long-term store via tools.  
- **Filesystem** — attach files; tools include `grep`, `search_files`, `open`, `close`; files may be embedded for semantic search.

**Update.** Agent-driven: the model chooses what to write into core blocks and what to archive/retrieve. Not passive fact-extraction-only.

**Age / invalidate.** Hierarchical pressure (what fits in core vs what is external), not first-class temporal invalidation of facts. Filesystem benchmark argument: specialized memory tools often lose to tools agents already know.

**Per-repo.** Agent/instance-centric. Coding agents may map “repo docs” onto filesystem attachments, but Letta does not define a multi-repo vault convention.

**Evidence.**  
- Memory blocks: `https://www.letta.com/blog/memory-blocks/`  
- Filesystem LoCoMo 74.0%: `https://www.letta.com/blog/benchmarking-ai-agent-memory/` (Aug 2025)  
- Architecture comparisons: `https://vectorize.io/articles/mem0-vs-letta`, `https://thenewstack.io/ai-agent-memory-architecture/`

**Implication for memory-atlas.** The industry thesis “filesystem interface wins for coding agents” strongly validates an Obsidian-compatible vault that agents navigate with native tools — provided the vault has structure (map/index) so agents don’t drown in undifferentiated markdown.

---

### 3. Zep / Graphiti — temporal knowledge graphs

**What it is.** Zep: managed agent memory / “Context Lake” (`https://www.getzep.com/`). Graphiti: open-source temporal KG engine (`https://github.com/getzep/graphiti`, often cited ~20k+ stars). Paper: arXiv:2501.13956 *Zep: A Temporal Knowledge Graph Architecture for Agent Memory*.

**Storage.** Graph of entities, relationships, episodes; bi-temporal metadata on edges; raw episodes + derived facts. Production often Neo4j (or equivalent); enterprise retrieval claims sub-200ms p95.

**Update.** Ingest chat/docs/business data → extract entities/facts → entity resolution → edge creation.

**Age / invalidate.** **Category leader for invalidation:** when new info contradicts old, set `invalid_at` / validity intervals; **do not delete history**. Supports “what is true now?” vs “what was true on date D?” Analysis pieces (e.g. Vectorize Hindsight consolidation writeups) rank Zep strongest on decay/invalidation.

**Per-repo.** Graph/user scoped in product APIs. Can model a “project” as a subgraph, but knowledge is not primarily shipped as a checked-in directory.

**Evidence.**  
- Product memory: `https://www.getzep.com/product/agent-memory/`  
- Temporal KG explainer: `https://www.getzep.com/ai-agents/temporal-knowledge-graph/`  
- Paper: `https://arxiv.org/abs/2501.13956`  
- Neo4j on Graphiti: `https://neo4j.com/blog/developer/graphiti-knowledge-graph-memory/`

**Implication.** Steal the *idea* of invalidation (superseded decisions, expired assumptions) into ledger semantics; do not assume every adopting repo wants a Neo4j dependency.

---

### 4. Cognee — graph-vector hybrid memory engine

**What it is.** Open-source agent memory platform (`https://github.com/topoteretes/cognee`, `https://www.cognee.ai/`). Emphasizes ECL-style pipelines and unified graph+vector retrieval; 2026 messaging includes “entire memory layer on Postgres” and first-party hooks for Claude Code / Cursor / LangGraph / MCP.

**Storage.** Three layers: **graph** (entities/relations; default Kuzu, also Neo4j, FalkorDB, etc.), **vector** (embeddings; LanceDB and others), **relational/session** metadata. Local-first stacks (SQLite + LanceDB + Kuzu) appear in comparisons.

**Update.** `cognify`-style multi-stage pipeline: classify → permissions → chunk → LLM entity/relation extraction → summaries → embed + commit graph edges. More batch/ingest than chat-turn micro-updates (relative to Mem0’s add/search loop).

**Age / invalidate.** Graph “memify” / continuous enrichment; less publicly associated with bi-temporal invalidation than Graphiti. Good at building structure from corpora; weaker story for “this zone card is verified against commit SHA.”

**Per-repo.** Dataset/project namespaces in the engine; not identical to git-tracked zone cards.

**Evidence.**  
- Architecture: `https://www.cognee.ai/blog/fundamentals/how-cognee-builds-ai-memory`  
- Repo: `https://github.com/topoteretes/cognee`  
- vs Mem0: `https://vectorize.io/articles/mem0-vs-cognee`

---

### 5. Claude Code — CLAUDE.md hierarchy + auto-memory (the coding-agent reference implementation)

Official docs: `https://code.claude.com/docs/en/memory`.

#### CLAUDE.md (human-authored, mostly VCS)

| Scope | Location | Shared? |
| --- | --- | --- |
| Managed policy | OS-level paths (`/etc/claude-code/CLAUDE.md`, etc.) | Org |
| User | `~/.claude/CLAUDE.md` | Personal, all projects |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team via git |
| Local | `./CLAUDE.local.md` | Personal; gitignore |

- Load order: broad → specific; concatenate rather than hard-override. Nested directory CLAUDE.md loads on demand when working in that subtree.
- Modular rules: `.claude/rules/*.md` with optional YAML `paths:` globs (path-scoped load).
- Imports: `@path` expansion (max depth 4).
- **AGENTS.md:** Claude Code does **not** natively treat `AGENTS.md` as CLAUDE.md; recommended pattern is `CLAUDE.md` containing `@AGENTS.md` or `ln -s AGENTS.md CLAUDE.md`.
- Soft enforcement: instructions are context, not hard policy — use hooks for must-block actions.
- Size guidance: prefer &lt;~200 lines; path-scoped rules for the rest. `/init` scaffolds from codebase (+ can absorb AGENTS.md / .cursorrules / etc.).

#### Auto-memory (agent-authored, machine-local)

- Path: `~/.claude/projects/<project>/memory/` where `<project>` is derived from **git root** (shared across worktrees of same repo).
- Entrypoint: `MEMORY.md` index — **first 200 lines or 25KB** loaded every session; overflow not auto-injected.
- Topic files (`debugging.md`, …) read **on demand**.
- Claude Code nudges compaction when index nears limits; human can audit via `/memory`.
- Toggle: `autoMemoryEnabled`, `CLAUDE_CODE_DISABLE_AUTO_MEMORY`, custom `autoMemoryDirectory`.
- **Not shared across machines/cloud** by default — critical for multi-developer “mind” ambitions.

#### Aging

No bi-temporal graph. Aging = index truncation risk + manual prune + human promotion of durable rules into CLAUDE.md. Community pattern: mine auto-memory periodically into CLAUDE.local.md / project CLAUDE.md.

**Evidence.** Official memory page (above); deep dives such as `https://institute.sfeir.com/en/claude-code/claude-code-memory-system-claude-md/deep-dive/`, `https://vectorize.io/articles/claude-code-memory`.

---

### 6. Cursor — rules (files) vs memories (product) vs Memory Bank (community)

**Rules (winning portable layer).**  
- Modern: `.cursor/rules/*.mdc` with globs / activation metadata.  
- Legacy: `.cursorrules` still works but is considered legacy.  
- User rules (global) vs project rules (repo). Version-controllable → team-shareable.

**Memories.** Product feature: auto-generated from chat; docs claim project scope; forum reports of confusing global vs project UI (Oct 2025+ threads). Storage is **not** a transparent greppable vault in the repo — weaker for open-source multi-agent fleets.

**Memory Bank (community methodology).** Port of Cline’s pattern into Cursor projects (e.g. `.cursor/memory/` or `memory-bank/` with `projectbrief.md`, `activeContext.md`, `progress.md`, …). Updated by ritual prompts (“update memory bank”). File-based, portable, but **no automatic freshness verification**.

**Evidence.**  
- Community rules/memory bank guides: e.g. `https://www.lullabot.com/articles/supercharge-your-ai-coding-cursor-rules-and-memory-banks`  
- Forum: `https://forum.cursor.com/t/rules-vs-memories-and-global-vs-project/137149`  
- Multi-tool practice: keep `AGENTS.md` as SoT, thin Cursor rules on top (`https://forum.cursor.com/t/how-are-people-handling-context-across-different-ai-coding-tools/159891`)

---

### 7. aider — repository map (structural, derived, ephemeral)

**What it is.** CLI coding agent; killer feature is **repo map**, not long-term markdown memory. Docs: `https://aider.chat/docs/repomap.html`, design post `https://aider.chat/2023/10/22/repomap.html`.

**Storage.** No durable knowledge DB for architecture. Each turn: parse repo with **tree-sitter**, extract definitions, build a **dependency graph**, rank with **PageRank-like** importance, serialize top symbols/signatures into ~**1k tokens** (configurable `--map-tokens`), expanding when chat has few files.

**Update.** Recomputed from current tree; chat mentions of files/symbols bias ranking.

**Age / invalidate.** Irrelevant — map is always “now.” Stale *decisions* are simply absent unless put in conventions files (Aider can always-load `AGENTS.md` via config `read: AGENTS.md` per agents.md FAQ).

**Per-repo.** Strictly the git repository aider is run in.

**Implication.** Repo-map ≠ atlas. Map answers API surface; atlas answers ownership, rationale, and verified subsystem narrative. Complementary: agents may use map for navigation and atlas for judgment.

---

### 8. GitHub Copilot — instructions, AGENTS.md, Spaces, sunset Workspaces

**Repository instructions.**  
- `.github/copilot-instructions.md` — always-on repo guidance.  
- `.github/instructions/*.instructions.md` — path/`applyTo` scoped.  
- Nested **`AGENTS.md`** — coding agent support (changelog Aug 2025); nearest file wins. Copilot coding agent also acknowledges `CLAUDE.md` / `GEMINI.md` in some paths.  
  Docs: `https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot`  
  Changelog: `https://github.blog/changelog/2025-08-28-copilot-coding-agent-now-supports-agents-md-custom-instructions/`

**Copilot Spaces (May 2025 intro → GA later 2025).** Curated context containers: repos, PRs, issues, uploads, free-text, images, custom instructions. GitHub-sourced artifacts **auto-update**; designed for shared team expertise beyond one chat. Not a local Obsidian vault; index/token budgets can fill with many small files (community discussions).  
- Concepts: `https://docs.github.com/en/copilot/concepts/context/spaces`  
- Launch: `https://github.blog/changelog/2025-05-29-introducing-copilot-spaces-a-new-way-to-work-with-code-and-context/`

**Copilot Workspace.** Technical preview sunset **2025-05-30**; workflow split toward Coding Agent (execution) + Spaces (context).  
- `https://githubnext.com/projects/copilot-workspace/`

**Per-repo.** First-class GitHub repository binding; Spaces can also be shared without full repo access in some configurations (product claims).

---

### 9. Cross-tool file conventions that are winning

#### A. `AGENTS.md` — open multi-agent instruction standard

- Site: `https://agents.md/`  
- Claimed presence in **60k+** open-source projects (GitHub code search marketed on site).  
- Stewardship: **Agentic AI Foundation** under Linux Foundation (with MCP, Goose donations in the same industry narrative).  
- Content: build/test commands, conventions, PR rules — agent-oriented README, not human marketing README.  
- Monorepo: nested `AGENTS.md`, **nearest wins**; chat overrides all.  
- Tool support spans Codex, Jules, Cursor, Copilot coding agent, Aider (config), Windsurf, Zed, Warp, RooCode, Gemini CLI, etc.

#### B. Tool-native instruction trees (still required for best fidelity)

| Tool | Canonical files |
| --- | --- |
| Claude Code | `CLAUDE.md`, `.claude/rules/`, `CLAUDE.local.md` |
| Cursor | `.cursor/rules/*.mdc` |
| Copilot | `.github/copilot-instructions.md`, `.github/instructions/` |
| Cline | `.clinerules` / `.clinerules/`, Memory Bank |
| Windsurf | `.windsurfrules` (legacy naming class) |

**Winning pattern in multi-agent shops:** one **shared SoT** (`AGENTS.md` and/or atlas on-ramp) + **thin adapters** (`CLAUDE.md` imports AGENTS; Cursor rules for glob triggers; copilot-instructions for always-on Copilot).

#### C. Cline Memory Bank — multi-file session state

Docs: `https://docs.cline.bot/best-practices/memory-bank`

```
memory-bank/
  projectbrief.md
  productContext.md
  activeContext.md      # high churn
  systemPatterns.md
  techContext.md
  progress.md           # high churn
```

Ritualized update (“update memory bank”) before context reset. Portable methodology across tools. Weakness: **no mechanical verification** that architecture files still match code; active files become graveyards without discipline.

#### D. Claude auto-memory vs Memory Bank vs Atlas (roles)

| Layer | Who writes | Durable? | Team-shared? | Good for |
| --- | --- | --- | --- | --- |
| `AGENTS.md` / `CLAUDE.md` | Human | Git | Yes | Always-on ops rules |
| Path rules | Human | Git | Yes | Local conventions |
| Auto-memory / Cursor memories | Agent | Machine/cloud | Weak | Personal learnings |
| Memory Bank progress/active | Agent+human | Git (if committed) | Optional | Session handoff |
| **Atlas zones + verifiedAt** | Human+agent draft | Git + stamp | Yes | **Verified architecture** |
| Atlas decisions ledger | Human | Git (frozen) | Yes | Why / history |

#### E. Why file-based per-repo wins for coding (not for all agent memory)

1. **Training distribution:** coding agents are optimized for filesystem tools (Letta, LangChain, LlamaIndex “files” narratives 2025–2026).  
2. **Reviewability:** PRs on rules/zones &gt; silent vector mutations.  
3. **Multi-tool:** markdown is the only substrate all of Claude/Cursor/Codex/Copilot/aider can share without a shared DB.  
4. **Offline / private:** no SaaS memory leak of proprietary architecture.  
5. **Scope clarity:** git root ≈ project mind (Claude auto-memory already keys on this).

**Where files lose:** multi-user concurrent write, semantic recall over millions of chat turns, bi-temporal personalization — then Mem0/Zep/Hindsight-class systems win as **side cars**, not as the repo’s source of architectural truth.

---

### 10. Newer 2025–2026 entrants (coding-adjacent)

| Entrant | Angle | Storage | Note for atlas |
| --- | --- | --- | --- |
| **Hindsight** (Vectorize) | “Memory that learns”; retain/reflect/consolidate | Embedded Postgres etc. | Fastest star growth narrative mid-2026; consolidation science useful; not a vault convention |
| **Supermemory** | MCP-first memory for coding agents | Cloud / pgvector-class | Competes as bolt-on recall, not zone cards |
| **Graphiti** (standalone) | OSS temporal graph under Zep | Graph DB | Best invalidation reference design |
| **agentmemory / agent-memory.dev** | “Persistent memory coding agents should have had” | Product claims zero external DB | Watch as packaging of local memory |
| **RedPlanet / core** etc. | Claude plugins building temporal KG from sessions | Graph + persona docs | Reaction to CLAUDE.md scale pain |
| **agy** (on Hindsight) | Folder of notes → scoped memory; living summaries | Notes + memory engine | Echoes Obsidian-vault intuition |

Survey/context pieces:  
- `https://thegenios.com/blog/open-source-memory-layers-2026`  
- `https://hindsight.vectorize.io/blog/2026/06/09/fastest-growing-oss-ai-memory`  
- `https://blogs.oracle.com/developers/comparing-file-systems-and-databases-for-effective-ai-agent-memory-management` (files as interface vs DB as substrate)

---

### 11. Update / propagation patterns relevant to “update to latest convention”

Industry mechanisms (ordered by similarity to memory-atlas needs):

1. **Always-on instruction files** — manually edited; drift is human process.  
2. **`/init` generators** — Claude Code, Codex scaffold AGENTS/CLAUDE from repo; merge-friendly if non-destructive.  
3. **Template/copy tools** (copier, cookiecutter) — 3-way merge theory; brittle on heavily customized trees without AI.  
4. **Codemods / lint** — mechanical renames; poor at prose/zone semantics.  
5. **AI agent update skill** — read upstream CHANGELOG + local config + local hand edits; propose PR that updates **tooling/templates/on-ramp**, leaves **verified zone body** unless checks fail.  
6. **Managed org policy files** — Claude managed CLAUDE.md / MDM; forces floor, doesn’t rewrite project knowledge.  
7. **SaaS memory sync** — Spaces/Mem0 cloud; not suitable as open-source multi-repo convention backbone.

**For dozens of adopting repos:** pure package bump of `memory-atlas` CLI is easy; pure overwrite of `atlas/` is hostile. Winning approach = **versioned convention packages + AI 3-way update skill + `atlas check` gate**.

---

## Recommendations for memory-atlas

Prioritized for: mature conventions now → multi-repo adoption → later open-source → AI-driven updates that respect local customization.

### P0 — Align with winning file conventions (this week)

1. **Dual on-ramp by default in `atlas init`:** emit both `AGENTS.md` fragment and `CLAUDE.md` that `@`-imports or points at `atlas/map/index.md`. Document Cursor (`.cursor/rules` one-liner) and Copilot (`.github/copilot-instructions.md` pointer) as optional adapters — do not require four SoTs.  
2. **Document the three-layer model explicitly** in onboarding:  
   - **Map (verified present)** = zones + `verifiedAt`  
   - **Ledger (frozen past)** = decisions/specs/plans  
   - **Scratch (agent-local)** = Claude auto-memory / Cursor memories / optional `progress`-like notes — **never** treat scratch as verified  
3. **Keep vault file-based, greppable, Obsidian-compatible** — this is the market-winning substrate for coding agents; do not require Mem0/Zep to use atlas.

### P1 — Steal the best lifecycle ideas without becoming a vector DB

4. **Supersession, not silent overwrite, for decisions.** When a decision is replaced, keep the old note (or status: superseded + link), Graphiti-style. Zones remain present-tense; ledger holds history.  
5. **Promotion path:** skill or docs: “mine auto-memory → propose CLAUDE/AGENTS bullets → promote architecture claims only via zone PR + `atlas stamp`.”  
6. **Index discipline:** ensure `map/index.md` stays the always-load entry (like MEMORY.md’s role) while zone detail is on-demand — mirrors Claude’s 200-line index lesson.

### P2 — Update mechanism for N repos (design now, implement next)

7. **Ship a versioned “convention pack”** (schema, templates, on-ramp blocks, recommended CLAUDE/AGENTS snippets) separate from **instance content** (zones, decisions).  
8. **`atlas update` / skill contract (3-way):**  
   - *Upstream:* published pack version + changelog  
   - *Local base:* last applied pack version (record in `atlas.config.json`)  
   - *Local head:* current vault + config  
   - Agent actions: update templates, schema, CI snippet, on-ramp; **never clobber** zone `summary`/body or decision text without explicit conflict markers; run `atlas check`; open PR  
9. **Preserve local config:** treat `atlas.config.json` and path layout overrides as merge roots; support “opt-out paths” and “do not touch” globs for hand-curated modules.  
10. **CI as the respect mechanism:** adopters pin CLI version; `atlas check` fails on broken owns.globs / stale stamps policy — mechanical respect for truth without remote DB.

### P3 — Optional bridges (later, modular)

11. **MCP export/search adapter** — optional semantic search over the vault for huge monorepos; substrate remains files (Cognee/Mem0 as optional indexers, not source of truth).  
12. **Aider/repo-map complementarity note** — docs: use structural maps for navigation; atlas for ownership and why.  
13. **Open-source packaging** — mirror agentic-sage / token-oracle: clear ADOPTION.md, convention versioning, no mandatory cloud memory.

### Explicit non-goals (from this research)

- Replacing git-verified zones with pure embedding stores.  
- Depending on Claude auto-memory for team truth (machine-local).  
- Competing with Zep on consumer-chat temporal graphs.  
- Forcing one proprietary filename only — multi-agent reality is AGENTS.md + thin adapters.

---

## Open questions

1. **Should `verifiedAt` ever auto-advance** on green CI + unchanged owns.globs, or must a human always `stamp`? (Auto-stamp risks laundering stale prose that still “matches files.”)  
2. **Where do high-churn session notes live** in the atlas tree (if at all)? Commit `tech-debt/` / `ideas/` only, or allow an ignored `atlas/.scratch/`?  
3. **Monorepo:** one atlas root vs nested atlases vs nested AGENTS.md only — what does `atlas check` own when packages diverge?  
4. **Cross-repo knowledge** (shared platform decisions across the owner’s 5+ new repos): symlink packs? private parent vault? separate “org atlas”?  
5. **Invalidation UX:** is `status: superseded` + link enough, or do we need validity intervals on zone claims?  
6. **How aggressive should `atlas update` be** when schema adds required frontmatter fields — auto-fill defaults vs fail closed?  
7. **Multi-agent write races** on the same zone card (two Claude sessions) — file locks, SAGE-style claims, or “last writer + check”?  
8. **Will AGENTS.md + CLAUDE.md dual maintenance** remain necessary long-term, or will Claude Code natively load AGENTS.md? (Today: import/symlink required.)  
9. **Optional Graphiti/Mem0 sidecar:** worth a first-class module for “chat-derived preferences,” or always leave to user MCP?  
10. **Open-source positioning:** “verified architecture memory for coding agents” vs generic “agent memory” — which messaging avoids losing to 50k★ vector SDKs in search while attracting the right adopters?

---

## Source index (primary)

| Topic | URL |
| --- | --- |
| Claude Code memory | https://code.claude.com/docs/en/memory |
| AGENTS.md | https://agents.md/ |
| aider repo map | https://aider.chat/docs/repomap.html |
| Letta filesystem benchmark | https://www.letta.com/blog/benchmarking-ai-agent-memory/ |
| Mem0 paper | https://arxiv.org/abs/2504.19413 |
| Mem0 repo | https://github.com/mem0ai/mem0 |
| Zep paper | https://arxiv.org/abs/2501.13956 |
| Zep agent memory | https://www.getzep.com/product/agent-memory/ |
| Graphiti (Neo4j writeup) | https://neo4j.com/blog/developer/graphiti-knowledge-graph-memory/ |
| Cognee architecture | https://www.cognee.ai/blog/fundamentals/how-cognee-builds-ai-memory |
| Cognee repo | https://github.com/topoteretes/cognee |
| Cline Memory Bank | https://docs.cline.bot/best-practices/memory-bank |
| Copilot Spaces | https://docs.github.com/en/copilot/concepts/context/spaces |
| Copilot AGENTS.md support | https://github.blog/changelog/2025-08-28-copilot-coding-agent-now-supports-agents-md-custom-instructions |
| Mem0 state of memory 2026 | https://mem0.ai/blog/state-of-ai-agent-memory-2026 |
| Files vs DB (Oracle) | https://blogs.oracle.com/developers/comparing-file-systems-and-databases-for-effective-ai-agent-memory-management |
| Open-source memory layers 2026 | https://thegenios.com/blog/open-source-memory-layers-2026 |
| Hindsight growth | https://hindsight.vectorize.io/blog/2026/06/09/fastest-growing-oss-ai-memory |

*Method: web research only (search + official docs fetch). No repository code was modified except this report file. Star counts are approximate as of sources retrieved mid-2026.*
