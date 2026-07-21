# r10 — Keeping knowledge bases truthful over time

Research date: 2026-07-17  
Scope: stale-doc detection, last-reviewed/verified frontmatter, link checkers, docs-as-tests, freshness dashboards, docs-decay tooling, Obsidian vault validators/graph health; benchmark memory-atlas `verifiedAt` against the ecosystem.  
Method: web research (GitHub star counts scraped 2026-07-17; docs/blog reads) + read-only analysis of memory-atlas (`SPEC.md`, `lib/validate.mjs`, `lib/resolvers.mjs`, `lib/stamp.mjs`, `lib/status.mjs`).  
Out of scope: syndcast-mind visuals.

## Summary

- **memory-atlas's `verifiedAt` (commit SHA + scoped `git diff` over `owns.globs`) is among the strongest deterministic freshness signals in the open ecosystem** — stronger than calendar `last_reviewed` dates, aligned with Fiberplane `drift` (~121★) and Patina/LLM-wiki source-hash approaches, and stricter about anti-rubber-stamp than most peers (no blanket re-stamp; `seeded`/`unverified` lifecycle).
- **Calendar freshness (`last_reviewed`, `review_after`, `ttl_days`) is the industry default** (Grafana Writers' Toolkit, Giant Swarm docs, Obsidian Dataview, corporate KBs) but measures *age*, not *wrongness*. Date-only gates create false confidence and review theater.
- **Link checking is mature and commoditized.** Leading options: lychee (~3.8k★), muffet (~2.6k★), linkinator (~1.2k★), markdown-link-check (~710★), hyperlink (~225★, offline/internal). A small CLI should treat external HTTP checks as **optional CI**, not core — flaky networks, rate limits, and auth walls dominate failure modes.
- **Prose style linting is orthogonal and mature** (Vale ~5.6k★, markdownlint ~6.2k★). Useful for OSS polish; does not prove truthfulness.
- **Docs-as-tests (Doc Detective ~126★, Manny Silva's strategy)** is the gold standard for *procedural* product docs (UI/API walkthroughs) but is heavy (browsers, AGPL, runtime cache) and poorly matched to architecture zone cards.
- **Closest conceptual peers to atlas:** Fiberplane drift (symbol-level AST anchors + provenance SHA, ~121★, Mar 2026), Patina/`kb-patina` (source_refs + SHA-256 + `review_after`, ~2★ but design-rich), Doorstop (`reviewed` fingerprint on requirements, ~642★), agents-lint (~11★) for AGENTS.md path rot.
- **Obsidian graph health is mostly in-app plugins**, not CI CLIs: Obsidian Linter (~2k★) for format; Dataview for “old notes” dashboards; Vault Operator / orphan-broken-links plugins for graph hygiene; obra/knowledge-graph (~91★) as local graph CLI/MCP. memory-atlas already covers dangling wikilinks + reciprocity in `atlas check` / generated index.
- **What a small zero-dep CLI can realistically enforce:** frontmatter schema; ownership globs exist; git-diff staleness; internal wikilink graph; optional offline path links; status counters + generated index dashboard. **What it should not claim to enforce:** semantic truth of prose, external URL liveness as hard gate, full docs-as-tests, AST-symbol drift without optional deps.
- **Freshness dashboards that work for agents:** one-line status hooks + machine-generated gap sections beat pretty web UIs. atlas already has this (`atlas status`, `map/index.md` Verification gaps).
- **Main maturation bets for memory-atlas:** (1) keep commit-SHA provenance as the differentiator, (2) optional offline internal-link check for non-wikilink paths, (3) document comparison to drift/Patina/calendar models, (4) CI recipe for `--strict`, (5) never add blanket stamp or ISO-date `verifiedAt`.

## Findings

### 1. memory-atlas baseline (repo analysis)

**Core rule** (`SPEC.md` “The verifiedAt rule”, `lib/validate.mjs`, `lib/resolvers.mjs`, `lib/stamp.mjs`):

| Mechanism | Behavior |
|-----------|----------|
| Legal encodings | Only `unverified` (while `status: seeded`) or 7–40 hex **git commit SHA** (while `status: active`) |
| Forbidden | ISO dates, empty strings, blanket re-stamps of every zone |
| Staleness | `git diff --name-only <verifiedAt>..HEAD -- <owns.globs>` non-empty ⇒ `⚠ stale` |
| Scope | Positive globs + `:(exclude)` / `:!` pathspecs included in diff; excludes skipped for existence |
| Advisory vs hard | Default report-only; `--strict` / config makes stale a failure (CI) |
| Anti-rubber-stamp | `atlas stamp` requires **explicit zone slugs**; refuses `--all` and empty args; refuses `unmounted` |
| Unmounted | No staleness/anchor checks; retain last `verifiedAt` for lineage |
| Unknown SHA | Conservative: treat as stale + warning (`changedSince` → `'unknown-sha'`) |
| Graph health | Dangling `[[wikilinks]]` in related/sources/depends/…; advances↔realizedBy reciprocity (warnings) |
| Dashboard | Generated `map/index.md`: Freshness column, Verification gaps, Graph coherence, Attic; `atlas status` one-liner for SessionStart hooks |
| Gardening | `templates/routines/gardening.md` — human/agent ritual over stale/seeded rows |

**Differentiators already present:**

1. **Code-coupled freshness**, not calendar age.  
2. **Explicit verification ceremony** (stamp only what you reviewed).  
3. **Machine-generated honesty surface** (index + status) that agents can read without Obsidian.  
4. **Seeded vs active** honesty about machine-generated claims.

### 2. Freshness signal taxonomy (ecosystem)

Four families appear repeatedly. They answer different questions:

| Family | Question answered | Typical signal | False positive risk | False negative risk |
|--------|-------------------|----------------|---------------------|---------------------|
| **A. Calendar / TTL** | “Has anyone looked recently?” | `last_reviewed`, `review_after`, `ttl_days`, mtime | High if doc still true | High if code changed yesterday but date was stamped |
| **B. Doc-mtime vs code-mtime** | “Did docs move with code?” | git log on doc vs code paths | Medium (docs churn) | Medium (docs never touch code paths) |
| **C. Provenance SHA / content hash** | “Has *bound* code changed since last review?” | commit SHA, blob SHA, AST fingerprint | Low–medium (noise from unrelated edits in same glob) | Low if anchors are right; **high if anchors too broad/narrow** |
| **D. Executable claims** | “Do documented steps still work?” | Doc Detective, doctest, OpenAPI contracts | Flaky env/network | Only covers what is automated |

**Key research insight (Slite “self-maintaining KB”, 2026):** continuous comparison to live sources beats date-based expiry — expiry says *old*, not *wrong*. memory-atlas is firmly in family **C**, which is the right tier for architecture minds.

### 3. Calendar / last-reviewed conventions (Family A)

| Practice | Evidence | Notes |
|----------|----------|-------|
| Grafana Writers' Toolkit `review_date` | [grafana.com/docs/writers-toolkit/write/front-matter/](https://grafana.com/docs/writers-toolkit/write/front-matter/) | ISO date of last correctness review; editorial process, not git-bound |
| Giant Swarm `last_review_date` + frontmatter-validator | [github.com/giantswarm/docs](https://github.com/giantswarm/docs); [giantswarm/frontmatter-validator](https://github.com/giantswarm/frontmatter-validator) (~0★, production-internal) | CI gates public docs when review too long ago; cited by Dosu freshness-scoring post (2026-05) |
| Obsidian Dataview `last-reviewed` | [blacksmithgu Dataview docs](https://blacksmithgu.github.io/obsidian-dataview/annotation/add-metadata/); community “old notes” dashboards | Queryable personal KBs; mtime often used as proxy |
| Corporate/compliance KBs | knowledge-ops skills, FDA/ISO shorter cycles | `last_reviewed` + owner + cadence; ranked cleanup by staleness × inbound links |
| Per-page TTL contracts | [dosu.dev freshness scoring](https://dosu.dev/blog/score-documentation-freshness-in-ci) | `ttl_days` per page + git age + optional symbol drift + LLM gray-area layer |
| Patina `review_after` | [lib.rs/crates/kb-patina](https://lib.rs/crates/kb-patina); [soyrochus/patina](https://github.com/soyrochus/patina) (~2★) | Calendar **plus** source hash staleness |

**Verdict for atlas:** Do **not** replace `verifiedAt` SHA with ISO dates. Optional *secondary* `review_after` (calendar nudge for zones that rarely change code) could complement, but SPEC already forbids date encodings in `verifiedAt` for good reason — dates are uncorrelated with code drift.

### 4. Provenance / code-bound freshness (Family C) — direct peers

#### 4.1 Fiberplane drift (~121★) — closest peer

- Repo: [github.com/fiberplane/drift](https://github.com/fiberplane/drift)  
- Blog (2026-03-25): [fiberplane.com/blog/drift-documentation-linter/](https://fiberplane.com/blog/drift-documentation-linter/)  
- Model: Markdown specs declare **anchors** `path#Symbol@provenanceSha` (frontmatter or inline).  
- Check: content (AST-fingerprint via tree-sitter when language supported) at provenance vs HEAD.  
- Workflow: `drift link` stamps provenance; `drift check` fails CI; agent skill package.  
- Honest limit (their words): re-link without rewriting prose still “passes” — **detection, not review**. Same honesty bar as atlas stamp.

| Dimension | memory-atlas | Fiberplane drift |
|-----------|--------------|------------------|
| Granularity | Zone globs (pathspec sets) | File or **AST symbol** |
| Provenance | One SHA per zone card | SHA per anchor |
| Implementation cost | Zero-dep `git diff` | tree-sitter multi-language |
| Anti-stamp | Explicit zone list; no `--all` | Manual/agent re-link |
| Graph / vault | Full vault lifecycle + index | Spec files only |
| Maturity / stars | Pre-OSS productization | ~121★, young |

**Implication:** atlas is coarser (whole ownership globs) but cheaper and vault-native. Optional future: finer anchors *inside* zones without abandoning the zone card model — only if adopters hit false-stale noise.

#### 4.2 Patina / LLM Wiki pattern (~2★ crate; design-rich)

- [soyrochus/patina](https://github.com/soyrochus/patina) / kb-patina: Karpathy-style wiki + engineering CLI.  
- Frontmatter: `source_refs`, `review_after`, status/types.  
- `patina stale`: source file content changed since last index/review (SHA-256 of sources), missing sources, expired `review_after`, draft age.  
- Medium post pattern: store `git hash-object` of cited files; recompute; report mismatch.  
- Overlap with atlas: **content/hash provenance + agent skills + lint**. Difference: wiki-of-synthesis vs architecture-of-code zones.

#### 4.3 Doorstop (~642★)

- [doorstop-dev/doorstop](https://github.com/doorstop-dev/doorstop)  
- Requirements items store a **`reviewed` fingerprint**; content change without re-review marks item unreviewed.  
- Same “stamp of human review” idea as `verifiedAt`, applied to requirements trees rather than code ownership.

#### 4.4 agents-lint / AGENTS.md rot checkers (~11★ agents-lint; several clones)

- [giacomo/agents-lint](https://github.com/giacomo/agents-lint): stale paths, dead npm scripts, framework rot in AGENTS.md / CLAUDE.md.  
- Broader 2026 wave: AgentLint, ctxlint — context files lie while code moves.  
- **Lesson:** agent instruction files rot *even when the file itself is not edited*. Same threat model as zone cards. atlas's code-anchored check is the architecture equivalent of path validation for AGENTS.md.

### 5. Link checkers (what stars say)

Star counts scraped from GitHub HTML, 2026-07-17:

| Tool | Stars (approx) | Strength | Weakness for atlas |
|------|----------------|----------|--------------------|
| [lycheeverse/lychee](https://github.com/lycheeverse/lychee) | **~3.8k** | Fast Rust async; MD/HTML; CI action (~496★); fragments; offline mode | External HTTP flakiness; separate binary dep |
| [raviqqe/muffet](https://github.com/raviqqe/muffet) | **~2.6k** | Website crawler | Site-oriented, not vault graph |
| [JustinBeckwith/linkinator](https://github.com/JustinBeckwith/linkinator) | **~1.2k** | Node; recursion | Heavier; network |
| [linkchecker/linkchecker](https://github.com/linkchecker/linkchecker) | **~1.1k** | Mature Python site checker | Same |
| [tcort/markdown-link-check](https://github.com/tcort/markdown-link-check) | **~710** | Simple MD; npm | Slower; GH action deprecation churn |
| [untitaker/hyperlink](https://github.com/untitaker/hyperlink) | **~225** | **Offline internal** static-site links; CI-oriented | HTML-oriented; not wikilinks |
| lychee-action | **~496** | Canonical GH Action wrapper | — |

**Enforcement realism:**

- **Internal links (filesystem / wikilink resolution):** small CLI can and should do this deterministically. atlas already does vault-graph wikilinks. Gap: bare markdown relative paths (`](../foo.md)`) and heading fragments if adopters mix MD styles.  
- **External HTTP:** recommend optional scheduled workflow with lychee; **never** default hard-fail in local `atlas check` (rate limits, 403s, transient 5xx).  
- **Do not reimplement lychee** inside atlas.

### 6. Docs-as-tests and prose quality (orthogonal layers)

| Tool / idea | Stars / status | What it proves | Fit for zone cards |
|-------------|----------------|----------------|--------------------|
| [Doc Detective](https://github.com/doc-detective/doc-detective) | ~126★; AGPL-3.0 | UI/API/procedure steps execute | Poor (architecture claims ≠ click paths) |
| Docs as Tests strategy (Manny Silva / docsastests.com) | Thought leadership | Docs *are* assertions | Conceptual ally for `invariants[].enforcedBy` |
| [vale-cli/vale](https://github.com/vale-cli/vale) | **~5.6k** | Style guide compliance | OSS polish; not truth |
| [DavidAnson/markdownlint](https://github.com/DavidAnson/markdownlint) | **~6.2k** | MD structure/style | Same |
| markdownlint-cli | **~1.1k** | CLI for above | Same |
| Rust/Python doctest, OpenAPI contract tests | Varies | Snippets/API truth | Partial (examples only) |

**Enforcement realism for a small CLI:** style linters and browser-based docs tests are **adopter optional modules**, not core atlas. The SPEC already has a soft signal: empty `invariants[].enforcedBy` → warning to file tech-debt — that's the right hook for “this claim needs a real test.”

### 7. Obsidian vault validators & graph health

| Tool | Stars / downloads | Role |
|------|-------------------|------|
| [platers/obsidian-linter](https://github.com/platers/obsidian-linter) | **~2.0k★** | Format/YAML rules; not semantic freshness |
| Dataview (core community) | Very high adoption | Live “stale by mtime / last-reviewed” tables |
| Find orphaned files / broken links (Vinzent et al.) | High downloads | Orphans, no backlinks |
| Vault Operator (community, 2026) | New | Orphans, broken links, weak clusters, over-connected hubs |
| [obra/knowledge-graph](https://github.com/obra/knowledge-graph) | **~91★** | Local graph: FTS, embeddings, path finding, MCP/CLI |
| Obsidian Graph Analysis (classic plugin) | Older community | Graph algorithms for relatedness |

**Atlas position:** Already implements the **CI-relevant subset** of graph health (dangling links, reciprocity, attic) without requiring Obsidian. Full community-detection / hub-score analytics is research candy — low priority for multi-repo adoption.

### 8. Freshness dashboards that ship

Patterns that actually get used:

1. **Generated markdown index with gap sections** (atlas `map/index.md`) — agent-readable, greppable, PR-diffable.  
2. **One-line session status** (`atlas status`: zones / seeded / stale / open debt) — fails open for hooks.  
3. **CI annotations** on PR (drift check, lychee, Vale).  
4. **Dataview dashboards** for human Obsidian users (optional adapter, not core).  
5. **Scored freshness pipelines** (Dosu-style 0–100 composite) — interesting but overfit; atlas’s binary stale/ok/seeded is clearer for merge gates.

**Docs decay research consensus (2025–2026):**

- Stale docs are worse than missing docs for AI agents (fluent wrong answers).  
- Age ≠ wrongness; code-coupled or claim-coupled checks win.  
- Rubber-stamping is the universal failure mode; tooling can only **detect** and **raise cost of ignoring**, not force genuine review.  
- Agent skills that know “when X changes, re-open Y” outperform weekly LLM sweeps for cost.

### 9. What a small CLI can realistically enforce (capability budget)

Assume constraints like memory-atlas today: **Node, zero heavy deps, git available, vault is Markdown + YAML subset.**

| Check | Feasible in core? | Severity default | Notes |
|-------|-------------------|------------------|-------|
| Required frontmatter fields / enums | Yes | Hard | status, verifiedAt encoding |
| `owns.globs` match ≥1 tracked file | Yes | Hard | Already |
| `git diff` staleness vs verifiedAt | Yes | Soft → hard under `--strict` | Already; signature feature |
| Refuse blanket stamp | Yes | Hard | Already |
| Dangling wikilinks + reciprocity | Yes | Soft | Already |
| `invariants` without enforcement | Yes | Soft | Already |
| Internal markdown path links offline | Yes (small) | Soft | Optional pass; regex + resolve |
| Heading-fragment anchors | Partial | Soft | Needs MD heading parse |
| External HTTP links | No (as core) | Optional CI | Delegate to lychee |
| AST symbol drift | Optional module | Soft | Drift-like; tree-sitter dep |
| Prose style (Vale) | No | Optional | Separate |
| UI procedure tests | No | Optional | Doc Detective |
| Semantic “is this prose still true?” | No without LLM | Optional skill | Skill/gardening, not verifier |
| Freshness dashboard | Yes | N/A | Index + status already |

### 10. Benchmark: `verifiedAt` vs ecosystem

| Criterion | Calendar `last_reviewed` | mtime / git age of doc | Content hash of cited files | AST anchors (drift) | **atlas `verifiedAt` SHA + globs** |
|-----------|--------------------------|------------------------|-----------------------------|---------------------|------------------------------------|
| Detects code change under claim | No | Weak | Yes (if cited) | Yes (symbol) | **Yes (pathspec)** |
| Cheap / zero-dep | Yes | Yes | Medium | No | **Yes** |
| Agent-legible | Medium | Medium | High | High | **High** |
| Anti-rubber-stamp culture | Weak | Weak | Medium | Medium | **Strong (no --all)** |
| Lifecycle (seeded honesty) | Rare | Rare | Rare | Rare | **First-class** |
| Multi-repo / config respect | N/A | N/A | Varies | Per-file anchors | **Config folders + anchors** |
| False stale from reformats | N/A | Low | Depends | Low (AST) | **Possible** (whole-file under glob) |
| Ecosystem star gravity | High (process) | High (implicit) | Low | Low (~121) | n/a (emerging) |

**Conclusion:** `verifiedAt` is not a quirky house rule — it is the **correct primary signal** for an architecture atlas. The ecosystem is converging on the same idea under different names (provenance SHA, reviewed fingerprint, source hash). Atlas’s unique combination is: **zone ownership model + lifecycle + generated index + stamp discipline + optional strict CI.**

### 11. Failure modes atlas should keep naming explicitly

1. **Rubber-stamp stamp** — mitigated by explicit slugs; not eliminated.  
2. **Over-broad globs** — one changed test fixture marks whole zone stale (or, conversely, under-broad globs miss drift).  
3. **Shallow clones / history rewrite** — unknown SHA treated stale (good); CI needs enough fetch depth.  
4. **Prose lies while globs unchanged** — structural check only; gardening + human/agent review remain required.  
5. **Calendar-only adopters** — people will ask for dates; document why SHA wins.  
6. **External link noise** — if ever wired into core check, CI becomes red for Twitter/CDN flakiness.

## Recommendations for memory-atlas

Prioritized for “mature now for 5 new repos, later OSS like sage/oracle.”

### P0 — Keep and document the differentiator (docs / adoption)

1. **Publish a short “Why verifiedAt is a commit SHA” page** in `docs/` (or ADOPTION section expansion): compare to calendar review, drift anchors, Patina source hashes; forbid ISO dates with rationale.  
2. **CI recipe as first-class docs:** recommended GitHub Action snippet for `atlas check --strict` with `fetch-depth: 0` (or sufficient history for oldest `verifiedAt`).  
3. **Onramp defaults:** new vaults stay advisory until stale≈0, then flip `strict` (already sketched in ADOPTION — reinforce in templates).

### P0 — Product invariants (do not regress)

4. **Never add blanket stamp or date-valued `verifiedAt`.** These are the two ways the honesty signal dies.  
5. **Keep generated Verification gaps + `atlas status` as the freshness dashboard** — do not replace with a web UI requirement for OSS.

### P1 — Small CLI expansions that are still zero-dep

6. **Optional offline pass for non-wikilink internal links** (`](…md)` / vault-relative paths) in `atlas check`, config-gated, soft by default. Complements existing wikilink graph without lychee.  
7. **`--json` status/check output** (if not already complete) for agent skills and CI annotations — peers (Patina, drift) treat JSON as the agent contract.  
8. **Stale ranking in gardening:** sort stale zones by “churn intensity” (count of changed files under globs, or recent commit count) so multi-repo gardening hits high-traffic drift first (knowledge-ops pattern: staleness × traffic).

### P2 — Interop, not reimplementation

9. **Document optional companion tools:** lychee (external links, scheduled), Vale (style), Doc Detective (product procedures only). Ship example workflow files under `examples/`, not bundled binaries.  
10. **Skill surface for agents:** ensure recollection/gardening skills say: “on code change under zone globs → re-read card → stamp only that slug.” Mirror drift’s skill install pattern without depending on their binary.  
11. **Optional research spike (not core):** symbol-level anchors à la drift as an *opt-in* anchor class — only if dogfood repos show excessive false stale from coarse globs.

### P2 — Multi-repo update mechanism (truthfulness of *tooling*)

12. When designing “update to latest atlas convention” across many repos: treat **verifier rules + templates** as updatable, **local zone cards and stamps** as sacred. A codemod/skill must never mass-rewrite `verifiedAt` to HEAD. Freshness state is per-repo knowledge, not convention debt.

### P3 — Explicit non-goals

13. Do not build a Vale clone, lychee clone, or browser docs-test runner into core.  
14. Do not require Obsidian plugins for CI health.  
15. Do not score “truthfulness” with an LLM in the default verifier path (cost, nondeterminism); keep LLM work in skills/routines.

## Open questions

1. **Glob granularity policy:** should the spec recommend “one module / one package per zone” sizing to keep stale signal meaningful, or add optional sub-anchors later?  
2. **Should flows/decisions/specs get any freshness signal**, or remain human-attested only (zones as sole code hinge)?  
3. **Shallow clone policy for CI:** document minimum fetch depth vs always `fetch-depth: 0` vs fail soft on unknown-sha only?  
4. **Secondary calendar field:** is `review_after` worth a non-`verifiedAt` optional field for “code rarely changes but claim may rot” zones, or does it reintroduce theater?  
5. **Wikilink vs standard MD links:** will multi-repo adopters standardize on `[[wikilinks]]` only, or must core grow full GFM link validation?  
6. **Interoperability with Fiberplane drift:** co-exist (zones + fine anchors) or remaining deliberately simpler for zero-dep story?  
7. **Strict mode defaults for the 5 new repos:** force strict from day one (painful seed burn-down) vs advisory with deadline?  
8. **Open-source packaging:** recommend lychee/Vale in ADOPTION as “docs quality stack” without implying endorsement of AGPL Doc Detective for all users?

---

### Appendix A — Star count snapshot (2026-07-17)

Scraped via GitHub page `aria-label` where available:

| Repo | Approx stars |
|------|--------------|
| DavidAnson/markdownlint | 6,200 |
| vale-cli/vale | 5,566 |
| lycheeverse/lychee | 3,769 |
| raviqqe/muffet | 2,612 |
| platers/obsidian-linter | 2,003 |
| JustinBeckwith/linkinator | 1,236 |
| igorshubovych/markdownlint-cli | 1,082 |
| linkchecker/linkchecker | 1,066 |
| tcort/markdown-link-check | 710 |
| doorstop-dev/doorstop | 642 |
| lycheeverse/lychee-action | ~496 |
| untitaker/hyperlink | 225 |
| doc-detective/doc-detective | 126 |
| fiberplane/drift | 121 |
| obra/knowledge-graph | 91 |
| giacomo/agents-lint | 11 |
| soyrochus/patina | 2 |
| giantswarm/frontmatter-validator | 0 |

### Appendix B — Primary sources

**memory-atlas (local):** `SPEC.md`, `lib/validate.mjs`, `lib/resolvers.mjs`, `lib/stamp.mjs`, `lib/status.mjs`, `docs/ADOPTION.md`, `docs/CONFIG.md`, `templates/routines/gardening.md`, `templates/notes/zone.md`.

**Web (selected):**  
- https://github.com/lycheeverse/lychee  
- https://github.com/fiberplane/drift + https://fiberplane.com/blog/drift-documentation-linter/  
- https://lib.rs/crates/kb-patina + https://github.com/soyrochus/patina  
- https://github.com/doc-detective/doc-detective + https://www.docsastests.com/  
- https://github.com/vale-cli/vale  
- https://github.com/DavidAnson/markdownlint  
- https://github.com/platers/obsidian-linter  
- https://github.com/doorstop-dev/doorstop  
- https://github.com/giacomo/agents-lint  
- https://grafana.com/docs/writers-toolkit/write/front-matter/  
- https://dosu.dev/blog/score-documentation-freshness-in-ci  
- https://slite.com/learn/self-maintaining-knowledge-base-guide  
- https://blacksmithgu.github.io/obsidian-dataview/annotation/add-metadata/  
- Medium: LLM Wiki freshness via `git hash-object` citations (Karpathy pattern tooling, 2026)
