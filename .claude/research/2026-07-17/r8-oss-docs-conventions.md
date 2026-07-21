# OSS docs conventions for project knowledge (and what memory-atlas should adopt)

Research date: 2026-07-17. Role: web researcher. Scope: how mature open-source projects structure *project knowledge* (not product marketing sites), plus docs-quality tooling. `visuals/` from syndcast-mind is out of scope. Local repo inspection was limited to memory-atlas layout (`docs/`, `atlas/`, `CONTRIBUTING.md`, `ADOPTION.md`, decision ledger) for recommendation mapping — no other repo files were modified.

Star counts are approximate, as of mid-2026 page scrapes / search snippets.

## Summary

- **Docs-as-code won.** Serious projects keep versioned knowledge in-repo (`docs/`, `doc/`, dedicated docs repos). GitHub Wiki is widely treated as an anti-pattern for anything that must stay in lockstep with code (no PR review by default, weak discoverability, separate git history).
- **Two knowledge planes exist.** (1) **User-facing docs** (tutorials / how-tos / reference / explanation — Diátaxis). (2) **Project-evolution knowledge** (RFCs/KEPs/PEPs/proposals, ADRs/decision ledgers, GOVERNANCE, design docs). memory-atlas is firmly in plane (2), with optional bridges to plane (1).
- **Root community files are a near-universal OSS surface:** `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, often `GOVERNANCE.md` / `MAINTAINERS.md`, issue/PR templates. These are culture + GitHub “community health” signals more than tooling.
- **Decision processes scale with blast radius:** in-repo ADRs (`docs/adr/`, MADR) for local architecture; separate RFC/proposal repos for language-level / multi-repo change (Rust, React, Ember, Python PEPs, Go proposals, Kubernetes KEPs).
- **Quality tooling stack is mature and layered:** structure (`markdownlint`) + prose/style (`Vale`) + links (`lychee` / markdown-link-check) + spelling (`cspell` / `typos`). GitLab is the gold standard for *enforcing* docs lint in CI with error vs warning severity.
- **Freshness is still mostly cultural** outside specialist systems. Industry CI rarely enforces “docs age”; memory-atlas’s `verifiedAt` (commit SHA) is a genuine differentiator vs date stamps and “last updated” badges.
- **Propagation of conventions to many adopters** is an unsolved OSS problem for *knowledge layout*. Closest analogues: Copier’s 3-way template updates, codemods, monorepo shared configs — all mechanical; AI-mediated “update to latest” fits memory-atlas’s skill-driven model.
- **memory-atlas should interoperate, not replace:** map ADR/RFC/Diátaxis vocabulary into zones/decisions/specs; optional hooks to Vale/markdownlint/lychee; keep zero-runtime-deps for the CLI; ship optional docs-quality modules and an AI update skill that respects local config.
- **Shortlist to adopt or interoperate with (P0–P2):** see Recommendations.

## Findings

### 1. Exemplar layouts: how top projects partition knowledge

#### 1.1 Kubernetes (~124k★ on `kubernetes/kubernetes`)

**URLs:** https://github.com/kubernetes/kubernetes · https://github.com/kubernetes/community · https://github.com/kubernetes/enhancements · https://github.com/kubernetes/website

| Plane | Where it lives | Notes |
|---|---|---|
| User docs | Separate `kubernetes/website` (`content/en/docs/…`) | Hugo site; SIG Docs owns process |
| Contributor / governance | `kubernetes/community` (`governance.md`, SIG charters, repo guidelines) | Multi-repo org model |
| Enhancements / design | `kubernetes/enhancements` KEPs | Cross-SIG design proposals |
| Code-adjacent docs | `kubernetes/kubernetes/docs/` (thinner today) + `CONTRIBUTING.md`, `AGENTS.md` | Core repo points outward |

**Enforced vs culture:** OWNERS files + prow bots enforce review rights; KEP process is cultural + release-gate hybrid (features need KEPs to ship). Docs quality is SIG-owned culture with some link/lint automation on the website repo.

**Takeaway for memory-atlas:** multi-repo minds are normal at scale; a single vault per *product* or per *org slice* is fine, but the *convention toolkit* must not assume one monorepo.

#### 1.2 Rust RFC process (`rust-lang/rfcs` ~6.5k★)

**URL:** https://github.com/rust-lang/rfcs · https://rust-lang.github.io/rfcs/

- Separate repo; accepted RFCs land as numbered Markdown under `text/`.
- Template-driven PRs; discussion *is* the review; merge = accept.
- Governance itself is an RFC history (e.g. RFC 1068).
- Published as mdbook (“RFC Book”).

**Takeaway:** RFCs are design-docs-with-process, not day-to-day architecture notes. memory-atlas `map/decisions/` ≈ ADRs; `atlas/specs/` / plans ≈ lighter local proposals. Do not force every decision through an RFC-shaped template.

#### 1.3 Go proposal process (`golang/proposal`)

**URL:** https://github.com/golang/proposal · https://go.dev/s/proposal-process

- Issue-first triage → optional design doc under `design/` → accept/decline.
- Explicitly avoids requiring a design doc for every idea.
- CONTRIBUTING on go.dev points major API changes through this process.

**Takeaway:** graduated formality (issue → design doc → implementation) maps well to atlas note types: idea → spec/plan → code + decision.

#### 1.4 React RFCs (`reactjs/rfcs`) + React docs site

**URLs:** https://github.com/reactjs/rfcs · https://github.com/facebook/react (~230k★ order of magnitude) · https://react.dev

- React copied Rust/Ember/Yarn: separate RFC repo, `text/0000-template.md` pattern.
- **User docs live off the implementation monorepo** (react.dev / content repos). Core repo focuses on code + CONTRIBUTING.
- Docs organization is Learn vs Reference (Diátaxis-adjacent).

#### 1.5 Next.js / Vercel (`vercel/next.js`, docs in-tree under `/docs`)

**URLs:** https://github.com/vercel/next.js · https://nextjs.org/docs · https://nextjs.org/governance

- In-repo `docs/` with filesystem routing (`00-` prefixes for order).
- Sections: Getting Started / Guides / API Reference — again Diátaxis-shaped.
- Governance page documents Core vs Documentation teams (company-led OSS).
- Contribution guide for docs is first-class (edit on GitHub or local).

#### 1.6 GitLab (product monorepo docs under `doc/`)

**URLs:** https://docs.gitlab.com/development/documentation/ · Vale/markdownlint testing docs

- Single product monorepo with large `doc/` tree.
- **Best-in-class tool enforcement:** Vale + markdownlint + custom `lint-doc.sh` in CI; error-level fails MRs, warning-level surfaces in diffs only.
- Style guide + word list *and* machine-enforced Vale styles under `.linting/vale/`.

#### 1.7 Backstage (~33.9k★)

**URL:** https://github.com/backstage/backstage

- Large monorepo with extensive `docs/` for the portal framework itself.
- Strong techdocs / “docs-like-code” product story (adopters publish Markdown from their own repos into Backstage).
- Relevant as a **consumer integration target**: atlas vaults could be discovered as a Backstage techdocs or catalog entity later — not required for v1.

#### 1.8 Prometheus / CNCF-style projects (pattern)

Typical layout: `docs/` or `documentation/` for user docs; root `CONTRIBUTING.md` / `CODE_OF_CONDUCT.md`; design discussion often via GitHub issues + occasional `docs/proposals/` or Google Docs for large changes. Less formal than Rust RFCs; more formal than solo-maintainer README-only projects.

#### 1.9 Diátaxis as the dominant *user-docs* information architecture

**URL:** https://diataxis.fr/ · Canonical adoption write-up: https://ubuntu.com/blog/diataxis-a-new-foundation-for-canonical-documentation

Four modes: **tutorial / how-to / reference / explanation**. Adopted by Canonical, Gatsby (historically), many SaaS doc rewrites (e.g. Sequin blog case study).

**Mapping to memory-atlas:** Diátaxis is *not* a replacement for zones/decisions. Treat Diátaxis as guidance for `docs/` (human product docs) if/when memory-atlas ships a docs site; keep atlas vault for *project understanding* (zones, decisions, tech-debt, plans).

---

### 2. CONTRIBUTING / GOVERNANCE conventions

| Artifact | Typical content | Tool-enforced? |
|---|---|---|
| `CONTRIBUTING.md` | Dev setup, PR norms, DCO/CLA, where to ask, doc contribution rules | Discovered by GitHub; content is cultural |
| `GOVERNANCE.md` | Roles, how maintainers are added, decision rights, conflict resolution | Cultural; templates at opensource.guide |
| `CODE_OF_CONDUCT.md` | Behavior norms (often Contributor Covenant) | Cultural + moderation process |
| `SECURITY.md` | Vulnerability reporting | GitHub security policy UI |
| `MAINTAINERS.md` / CODEOWNERS | Named humans / path owners | CODEOWNERS *is* tool-enforced for reviews |
| Issue / PR templates | Structured bug/feature/docs requests | Tool-enforced structure |

**Evidence / templates:**

- GitHub Open Source Guides — leadership & governance: https://opensource.guide/leadership-and-governance/
- Good Docs Project contributing-guide template: https://www.thegooddocsproject.dev/template/contributing-guide
- Kubernetes `governance.md`: https://github.com/kubernetes/community/blob/master/governance.md
- Next.js governance: https://nextjs.org/governance

**memory-atlas today:** has `CONTRIBUTING.md`, `LICENSE`, `CHANGELOG.md`, `docs/*` adoption docs — aligned with early OSS hygiene. No `GOVERNANCE.md` / `CODE_OF_CONDUCT.md` / `SECURITY.md` yet (siblings agentic-sage / token-oracle already carry CoC-style files).

---

### 3. RFC folders vs ADRs vs design-docs folders

| Mechanism | Scope | Location pattern | Lifecycle |
|---|---|---|---|
| **ADR / MADR** | Local architectural choice | `docs/adr/`, `doc/adr/`, `architecture/decisions/`; filenames `NNNN-title.md` or `YYYYMMDD-title.md` | Accepted → immutable record; superceded by new ADR |
| **RFC (Rust/React/Ember)** | Cross-cutting product/language change | Separate `rfcs` repo, `text/` | PR discussion → merge = accept |
| **KEP** | Kubernetes enhancement | `kubernetes/enhancements` | Multi-stage, release-coupled |
| **PEP** | Python language/process | `python/peps` | Numbered, editorial process |
| **Go design docs** | After issue triage | `golang/proposal/design/` | Optional depth |
| **In-repo design docs** | Feature design before implementation | `docs/design/`, `design-docs/`, wiki, Google Docs | Often informal; risk of orphaning |

**ADR evidence:**

- Martin Fowler bliki (location advice: keep ADRs in source repo, often `doc/adr`): https://martinfowler.com/bliki/ArchitectureDecisionRecord.html
- MADR (~2.3k★): https://github.com/adr/madr · https://adr.github.io/madr/
- Curated examples hub (~16.4k★): https://github.com/architecture-decision-record/architecture-decision-record
- Tools: `adr-tools`, `log4brains`

**memory-atlas mapping (already partially done in `docs/ADOPTION.md`):**

| Legacy OSS shape | Atlas target |
|---|---|
| `docs/adr/*` | `atlas/map/decisions/` |
| RFCs / design docs for features | `atlas/specs/` + plans |
| Orphan TODO / KNOWN_ISSUES | `atlas/tech-debt/` |
| Wiki braindumps | zones + decisions after distillation |

Atlas decisions already use frontmatter (`status`, `supersededBy`, `zones`, …) — richer than classic Nygard ADRs, compatible in spirit with MADR’s context/decision/consequences.

---

### 4. Wiki vs in-repo docs

**Consensus (strong):**

- **In-repo Markdown (+ SSG)** is the default for anything versioned with code (PR review, blame, CI, release tags).
- **GitHub Wiki** is convenient for collaborative scratch but fails docs-as-code: separate repo history, weak PR culture, poor search/SEO, easy drift. Industry essays call it an anti-pattern for primary docs (e.g. https://michaelheap.com/github-wiki-is-an-antipattern/).
- Hybrid seen in the wild: maintain `docs/` as source of truth; optionally publish a generated wiki (rare, and usually unnecessary).

**GitHub’s own framing** still offers wikis for long-form content (https://docs.github.com/communities/documenting-your-project-with-wikis/about-wikis), but mature projects largely outgrew them for primary material.

**memory-atlas stance (compatible):** vault is in-repo Obsidian-compatible Markdown — correct side of history. Avoid recommending Wiki as an adoption target.

---

### 5. Docs-quality tooling: what is enforced by tools vs culture

#### 5.1 Tooling matrix

| Tool | Purpose | Approx popularity | CI pattern | Enforceable? |
|---|---|---|---|---|
| **markdownlint** / **markdownlint-cli2** | Markdown structure & consistency | ~6.2k★ (`DavidAnson/markdownlint`); used by MDN, Electron, Airflow, etc. | GHA, pre-commit, Super-Linter | Yes — formatting is objective |
| **Vale** | Prose style, terminology, inclusive language; style packs (Microsoft, Google, custom) | ~5.6k★ (`vale-cli/vale`); Datadog, GitLab, Stoplight | `vale-action`, GitLab CI with error/warn levels | Partially — style is subjective; teams tune severity |
| **lychee** | Broken links (MD/HTML/site), async Rust | ~3.8k★ (`lycheeverse/lychee`) | `lychee-action`, scheduled + PR | Yes for hard 404s; flaky for rate-limits/auth |
| **markdown-link-check** | Older JS link checker | Common in older Actions | GHA | Yes |
| **cspell** / **typos** | Spelling in code + docs | Wide IDE + CI use | GHA, pre-commit | Yes with project dictionaries |
| **Super-Linter / MegaLinter** | Bundle many linters | Org-wide CI | Single job | Yes |
| **Docstring coverage** (`docstr_coverage`, etc.) | API comment coverage | Language-specific | CI thresholds | Yes for code comments; **not** for project knowledge |
| **Freshness / staleness checkers** | Age of pages, SLA on updates | **Sparse / ad hoc** | Custom scripts, git blame heuristics, content platforms | Mostly **not** standardized in OSS CI |

**Key sources:**

- Vale: https://vale.sh/ · Datadog engineering blog on Vale in CI
- GitLab docs testing: https://docs.gitlab.com/development/documentation/testing/vale/
- markdownlint: https://github.com/DavidAnson/markdownlint
- lychee: https://github.com/lycheeverse/lychee · https://lychee.cli.rs/
- Earthly comparison of markdown + Vale: https://earthly.dev/blog/markdown-lint/
- Fern 2026 docs linting guide: https://buildwithfern.com/post/docs-linting-guide

#### 5.2 What culture still owns

Even with perfect linters, **these remain human / process**:

- Whether a feature PR updates the right docs (bots can *nudge*, rarely *know*).
- Whether an ADR was written before a breaking change.
- Narrative quality of explanations (Vale catches passive voice, not wrong architecture).
- Cross-repo consistency of conventions across a fleet of adopting repositories.
- Deprecating stale conceptual docs (date badges help; SHA-based verification is stronger).

**Docs coverage** in the code-coverage sense is a poor fit for knowledge atlases. What matters is **zone coverage of the codebase** and **freshness of claims** — already memory-atlas’s product thesis (`verifiedAt`, `atlas check`, stamp).

#### 5.3 Freshness landscape (relevant to `verifiedAt`)

- Most SSGs show “last modified” from git — honest but weak (typo fix resets clock; substantive staleness invisible).
- Content platforms (Sanity, etc.) query `_updatedAt` for audits — CMS-centric.
- dbt-style freshness is about **data**, not docs.
- Write-the-Docs community advice: automate *nudges* when related code changes; don’t rely on dates alone.

**memory-atlas differentiator:** binding notes to **commit SHAs** (`verifiedAt`) and failing check when sources drift is closer to *reproducible knowledge* than industry date stamps. Preserve and market this; optional interoperability with lychee for *link* freshness.

---

### 6. Propagating conventions across many repos (update mechanism analogues)

Problem statement matches memory-atlas goal (3): improve atlas conventions once; update dozens of adopters without clobbering local config and hand customizations.

| Approach | How updates work | Respects local edits? | Fit for knowledge vaults |
|---|---|---|---|
| **Cookiecutter** | Scaffold once | No update path (famous issue #784) | Poor for ongoing |
| **Copier** | `copier update` 3-way merge (old template / new template / project) | Yes, with conflict markers; answers in `.copier-answers.yml` | Strong for *scaffold files* (templates, CI, config defaults) |
| **Projen** | Generated files overwritten from model | Local edits to managed files discouraged | Good for strict monorepo hygiene; hostile to hand-crafted notes |
| **Shared npm/Go module of configs** | Depend on versioned package | Config override patterns | Good for linters; not for vault content |
| **Codemods** | AST/text transforms versioned with release | Explicit, reviewable diffs | Good for frontmatter renames, path moves |
| **AI / skill-driven “update to latest”** | Agent reads release notes + local vault + policy | Can be instructed to preserve local zones/config | **Best fit for semantic knowledge** (reword, re-link, migrate types) |
| **Git subtree / vendored templates** | Manual merge | Manual | Works at small N |

**Implication:** split atlas distribution into layers:

1. **Mechanical layer** (Copier-like or versioned template package): `atlas.config.json` schema, note templates, optional CI workflows, skills stubs.
2. **Semantic layer** (AI skill): migrate vocabulary, re-stamp zones, rewrite ADOPTION guidance in place, never overwrite hand-authored zone cards without review.
3. **Local sovereignty layer:** `atlas.config.json` + `.atlas-ignore` / override files always win; update tool must be 3-way aware.

---

### 7. memory-atlas current state vs OSS norms (local)

Observed paths under `/home/kento/Repositories/memory-atlas`:

| Path | Role vs OSS norms |
|---|---|
| `docs/ADOPTION.md`, `ONRAMP.md`, `CONFIG.md`, `LAUNCH-CHECKLIST.md` | Solid adopter-facing docs (plane 1 lite + ops) |
| `atlas/map/zones/`, `decisions/`, `tech-debt/` | Project knowledge plane — stronger than most mid-size OSS |
| `templates/notes/*.md` | Equivalent to ADR/RFC templates |
| `CONTRIBUTING.md` | Present |
| No `GOVERNANCE.md` / CoC / SECURITY | Gap vs launch-ready OSS (siblings have more) |
| Zero runtime deps decision (`atlas/map/decisions/0001-…`) | Constrains shipping Vale/lychee *inside* CLI — prefer optional external tools + skills |
| `biome.json` only | No markdownlint/Vale/lychee yet |

`docs/ADOPTION.md` already maps ADR/spec/TODO inventories into atlas shapes — aligned with this research.

---

## Recommendations for memory-atlas

Prioritized. **Adopt** = bake into product or dogfood. **Interoperate** = document + optional modules/skills, do not force.

### P0 — Do now (maturation for multi-repo dogfood)

1. **Publish a crisp “knowledge layout map”** in adopter docs: Diátaxis for optional product `docs/` vs atlas vault for project mind; table mapping ADR/RFC/KEP/wiki → atlas types (extend `ADOPTION.md`).
2. **Standardize decision interoperability with MADR/Nygard vocabulary** in templates (`Context` / `Decision` / `Consequences` section aliases or dual headings) so ADR migrants feel at home without abandoning atlas frontmatter.
3. **Ship OSS community root files** before open-source launch: `CODE_OF_CONDUCT.md`, `SECURITY.md`, lightweight `GOVERNANCE.md` (even “BDFL + these maintainers” is enough — opensource.guide).
4. **Document `verifiedAt` as the freshness story** vs industry “last updated” — make it a README selling point and a migration rule (never convert dates to fake SHAs).
5. **Define the update contract early:** version the *convention* (schema + templates + skills) separately from vault *content*; write a skill `atlas-update` that: reads current convention version → diffs template package → proposes PR; never force-merge zone prose.

### P1 — Interoperate with docs-quality tools (optional modules)

6. **Recommend (don’t vendor) the standard docs CI trio for adopters who want it:**
   - `markdownlint-cli2` on `docs/**/*.md` and optionally `atlas/**/*.md` (relaxed rules for freeform vault notes: disable MD013 line-length, allow HTML comments).
   - `lychee` on docs + README (exclude localhost; allowlist flaky URLs).
   - Optional `Vale` with a thin `memory-atlas` style pack (terminology: “zone”, “atlas”, “verifiedAt”) — inspired by GitLab’s error/warn split.
7. **Keep these outside the zero-dep CLI:** provide example GitHub Actions under `examples/ci/` and a skill that installs/configures them; honor local existing configs (3-way merge mindset, Copier-like).
8. **Optional `atlas check` extension points** (hooks already planned in advisor plans): call out to lychee/markdownlint if present; never hard-depend.

### P2 — Structure & process conventions

9. **In-repo RFCs only if memory-atlas itself needs public design debate** (`docs/rfcs/` or GitHub Discussions + accepted write-up into `atlas/map/decisions/`). Do not require RFCs for adopter vaults — ADRs/decisions suffice.
10. **Prefer single-repo vaults for adopters; multi-repo only when org topology demands it** (K8s pattern). Document “one mind per repo” as default product slogan.
11. **CODEOWNERS for `atlas/map/` and `schema/`** once multi-maintainer — tool-enforced review of knowledge structure.
12. **Backstage / techdocs adapter later** (P3): export atlas index as a catalog entity or techdocs plugin for companies already on Backstage (~34k★ ecosystem).

### P3 — Update mechanism design (goal 3)

13. **Layered update (recommended architecture):**
    - **Template package** (versioned git tag / npm-free tarball): note templates, example CI, default `atlas.config.json`, skills.
    - **Machine merge** for non-content files (Copier semantics or custom 3-way using stored `.atlas-answers` / config hash).
    - **AI skill** for content-affecting migrations (frontmatter enum renames, section reorder, wikilink fixes) producing a reviewable PR with a changelog of convention versions.
14. **Explicit non-goals for auto-update:** never rewrite hand-authored zone narratives; never clear `verifiedAt`; never overwrite `atlas.config.json` keys marked local.
15. **Codemod library** for deterministic migrations (e.g. rename field `x` → `y` across frontmatter) invoked by the skill when rules are mechanical.

### Shortlist: adopt vs interoperate

| Convention / tool | Adopt in-core | Interoperate / optional | Skip |
|---|---|---|---|
| In-repo Markdown knowledge vault | ✅ (already) | | |
| MADR/ADR section semantics | ✅ templates | Import existing `docs/adr` | |
| Diátaxis for product docs | ⚪ guide only | | Don’t force on vault |
| CONTRIBUTING + CoC + SECURITY + GOVERNANCE | ✅ for OSS launch | | |
| Separate RFC repo process | | Only if project outgrows in-repo decisions | Default RFC theater |
| GitHub Wiki as SoT | | | ❌ |
| markdownlint | | ✅ examples + skill | |
| Vale | | ✅ optional style pack | Not in zero-dep runtime |
| lychee | | ✅ CI example | |
| cspell/typos | | ✅ | |
| Docstring coverage tools | | | Wrong abstraction |
| Copier-style 3-way template update | ✅ design for scaffold layer | | |
| AI “update to latest” skill | ✅ design for semantic layer | | |
| `verifiedAt` SHA freshness | ✅ differentiator | | Date-only stamps |
| Backstage techdocs | | Later | |

## Open questions

1. **Should `atlas check` ever hard-fail on broken *external* links**, or only on internal wikilinks / schema / verifiedAt? (lychee flakiness vs value.)
2. **Vault lint severity:** are freeform zone cards allowed to violate markdownlint, while `docs/` and templates must pass?
3. **Convention versioning scheme:** semver on the toolkit only, or also a `conventionVersion` field inside each vault’s `atlas.config.json`?
4. **Multi-repo monorepos:** one atlas at monorepo root with zone globs, or one atlas per package? (Affects 5 new repos if any are polyglot monorepos.)
5. **Who runs “update to latest” — human maintainer, scheduled agent, or both?** Safety defaults for unattended runs.
6. **Relationship to sibling products** (agentic-sage fleet, token-oracle budgets): shared CONTRIBUTING/CoC template across the three, or independent?
7. **Whether to publish a Vale package** named `memory-atlas` on the Vale Hub for terminology — useful for OSS brand, or premature?
8. **How much of Diátaxis to teach in ONRAMP** without confusing adopters who only wanted a decision ledger?
9. **Legal/process:** Contributor Covenant vs other CoC; CLA vs DCO for future external contributors?
10. **Metrics for convention health across the fleet:** % of zones with non-`unverified` verifiedAt, broken link rate, time-to-apply convention upgrade — where to store fleet telemetry without violating per-repo privacy?

---

### Research method notes

- Primary methods: web search + page fetches of GitHub READMEs, official docs (GitLab, Diátaxis, Go proposal process, Next.js contribution guide, Vale/lychee/markdownlint).
- Local read-only inspection of memory-atlas tree and `docs/ADOPTION.md` for mapping recommendations.
- GitHub REST API rate-limited during session; star counts from page scrapes/search snippets and may drift.
- No installs, no git mutations, no edits outside this report file.
