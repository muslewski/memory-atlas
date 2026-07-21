# memory-atlas open-source readiness audit (vs house style)

Research date: 2026-07-17  
Role: repo analyst (read-only)  
Repos under review:

| Repo | Local path | Public presence (2026-07-17) | Stars (approx) | Registry |
|---|---|---|---|---|
| **memory-atlas** | `/home/kento/Repositories/memory-atlas` | **No public GitHub repo** (`https://github.com/muslewski/memory-atlas` → HTTP 404); no `origin` remote; 33 local commits | n/a | npm `memory-atlas` → **E404 (name free)** |
| **agentic-sage** | `/home/kento/Repositories/agentic-sage` | Public: https://github.com/muslewski/agentic-sage | **~1★** | **npm** `agentic-sage@1.0.0` (~555 downloads last month via npm downloads API); homepage https://sage.muslewski.com/ |
| **token-oracle** | `/home/kento/Repositories/token-oracle` | Public: https://github.com/muslewski/token-oracle | **~0★** | **PyPI** `token-oracle@0.1.1` (HTTP 200 project page); npm name unused (Python primary; `npm/` is npx shim only) |

House-style baseline: the **distribution & quality** workstreams siblings already executed — agentic-sage `docs/superpowers/specs/2026-06-30-distribution-and-quality-design.md` and token-oracle `docs/superpowers/specs/2026-06-30-distribution-and-quality-design.md` — plus their live `.github/`, release-please, publish, and hygiene files.

Related research (not duplicated here): `.claude/research/2026-07-17/r5-template-update-mechanics.md` (AI/skill-driven multi-repo convention update story). This audit is **packaging / OSS surface only**.

---

## Summary

- **Product core is ahead of the packaging shell.** memory-atlas already has a strong README, SPEC, dual `bin` aliases, zero runtime deps, tests (`node --test`), launch checklist, and adoption docs — closer to “ready to show” than either sibling was at their pre-distribution audits.
- **Publication blockers are structural, not conceptual:** no GitHub remote/repo, no CI, no release automation, LICENSE copyright still says `Kento` (the exact P0 siblings fixed), `package.json` lacks `author`, and CONTRIBUTING claims CI that does not exist.
- **Sibling house style is clear and copyable:** MIT + real legal name, `author` metadata, `.github/workflows/{ci,release-please,publish}.yml`, `release-please-config.json` + manifest, Dependabot, issue/PR templates, `SECURITY.md`, `CODE_OF_CONDUCT.md`, real badges, banner assets, conventional-commit CONTRIBUTING table.
- **agentic-sage is the closer packaging twin** (Node ESM CLI, `files` whitelist, dual bin, Biome, npm publish with provenance). token-oracle is the cross-language twin for *hygiene + release-please + trusted publish*, not for npm shape.
- **Naming is mostly house-aligned** (`memory-atlas` package + `atlas` / `memory-atlas` bins) but carries a known **PATH collision** with MongoDB Atlas CLI — already documented in `docs/LAUNCH-CHECKLIST.md`, not an npm name collision (name free as of re-check).
- **Docs surface is strong for adopters, weak for OSS contributors/agents:** has `docs/{ADOPTION,CONFIG,ONRAMP,LAUNCH-CHECKLIST}.md` + `SPEC.md`; missing sibling-style root `AGENTS.md`, `SETUP.md`, `SECURITY.md`, CoC, issue templates.
- **Visual/branding gap is cosmetic but visible:** siblings ship banner + multi-format assets + live CI/registry badges; memory-atlas uses static badge placeholders and has no `assets/`.
- **Version story is pre-publish 0.1.0** with manual Keep-a-Changelog; siblings wire release-please so conventional commits become version + CHANGELOG + tag + publish.
- **Effort to match house bar is roughly 1–2 focused days of packaging work + owner-only publish secrets/repo create** — not a multi-week product rewrite. Highest leverage: fix legal/metadata → create GitHub → paste CI/release stack from agentic-sage → publish.

---

## Findings

### 1. Publication surface (where “open source” actually is)

| Signal | memory-atlas | agentic-sage | token-oracle |
|---|---|---|---|
| Git remote | **none** (`git remote -v` empty) | `origin` → `muslewski/agentic-sage` | `origin` → `muslewski/token-oracle` |
| GitHub HTTP | **404** | 200 public | 200 public |
| Stars (HTML scrape) | n/a | ~1 | ~0 |
| Primary registry | planned npm | **npm 1.0.0** | **PyPI 0.1.1** |
| Secondary distribution | — | Claude plugin marketplace (`.claude-plugin/`), product site | `install.sh` / `uvx` / `npx` shim under `npm/` |
| Tags / release automation | none | `agentic-sage-v0.2.0`…`v1.0.0` + release-please | `token-oracle-v0.1.1` + release-please |
| Local maturity (commits) | 33 (from 2026-07-09) | 216 (from 2026-06-28) | 231 (from 2026-06-30) |

**Evidence:** remote/tag inspection; GitHub HEAD requests; `npm view agentic-sage` / `npm view memory-atlas`; PyPI JSON for token-oracle; star aria-labels on public HTML.

**Implication:** memory-atlas is still a **local-only product**. Siblings are already on the public graph (even with low stars). Launch checklist `docs/LAUNCH-CHECKLIST.md` already encodes owner steps 3–7 (create repo, push, CI, badges, publish) as intentionally un-run.

---

### 2. LICENSE & legal attribution (P0 house pattern)

| | memory-atlas | agentic-sage | token-oracle |
|---|---|---|---|
| File | `LICENSE` present (MIT body) | `LICENSE` MIT | `LICENSE` MIT |
| Copyright line | **`Copyright (c) 2026 Kento`** | `Copyright (c) 2026 Mateusz Muślewski` | `Copyright (c) 2026 Mateusz Muślewski` |
| package author | **missing** from `package.json` | `"Mateusz Muślewski <10kento10@gmail.com>"` | pyproject + npm shim author set |

token-oracle’s own distribution design explicitly called `Kento` in LICENSE/metadata a **P0 publish blocker** and fixed it before PyPI (`docs/superpowers/specs/2026-06-30-distribution-and-quality-design.md` WS-1). memory-atlas is in that pre-fix state.

**Effort:** minutes (string edits) — but must ship **before** first public tarball / repo snapshot, or the wrong copyright is frozen in history.

---

### 3. package.json / packaging metadata

**memory-atlas** (`package.json`):

| Field | State | House match? |
|---|---|---|
| `name` | `memory-atlas` | Good (npm free) |
| `version` | `0.1.0` | Pre-1.0 alpha — matches token-oracle’s early public posture |
| `type` | `module` | Matches agentic-sage |
| `description` / `keywords` | Present, family-aware | Good |
| `repository` / `homepage` / `bugs` | Point at `github.com/muslewski/memory-atlas` | **Placeholders for a repo that does not exist yet** (checklist admits this) |
| `bin` | `atlas` + `memory-atlas` → `bin/atlas.mjs` | Matches dual-bin pattern (`sage`/`agentic-sage`; `token-oracle`/`oracle`) |
| `engines.node` | `>=20` | Sibling uses `>=20.0.0` — functionally same |
| `files` | `bin, lib, templates, schema, skills, adapters, examples, docs, SPEC.md` | Sensible whitelist; dogfood `atlas/` vault **not** packed (correct); `adapters/.npmignore` excludes `.navidx.*` |
| `scripts` | `test`, `lint` (via `npx @biomejs/biome`) | Missing `format`; lint uses `npx` vs sage’s local `biome` |
| `author` | **absent** | Fail vs both siblings |
| `postinstall` | absent | sage has hint-only postinstall (optional for atlas — no global wiring needed) |
| Runtime deps | none | House rule match (zero-deps CLI) |
| `devDependencies` | `@biomejs/biome` | Match |

**agentic-sage** additionally ships install/wiring surfaces in `files` (`hooks`, `uninstall`, `install.mjs`, `scripts`, `AGENTS.md`, `SETUP.md`, `ADAPTERS.md`, `CONVENTIONS.md`) — memory-atlas’s equivalent “ship with package” docs are `docs/*` + `SPEC.md`, which are already in `files`.

**npm always includes** `package.json`, `README.md`, `LICENSE` even when omitted from `files` — so README/LICENSE will ship; `CHANGELOG.md` / `CONTRIBUTING.md` will **not** unless added to `files` (siblings also omit CONTRIBUTING from npm `files`; fine).

**Rough pack surface:** ~47 files if packing current tree under `files` + always-included — lean and appropriate.

---

### 4. Bin exposure & naming

| Concern | memory-atlas | Sibling precedent |
|---|---|---|
| Package name | `memory-atlas` | Descriptive hyphenated (`agentic-sage`, `token-oracle`) |
| Primary CLI | `atlas` | Short primary: `sage`, `oracle`/`token-oracle` |
| Alias CLI | `memory-atlas` | `agentic-sage` second bin; `oracle` kept as alias |
| Collision risk | **MongoDB Atlas CLI also installs `atlas` on PATH** (documented in LAUNCH-CHECKLIST) | token-oracle fixed bare `oracle` vs Oracle DB tooling by making `token-oracle` primary |
| Search collision | “Atlas” vs MongoDB Atlas (accepted tradeoff) | sage/oracle also generic English words |
| Entry file | `bin/atlas.mjs` (`#!/usr/bin/env node`) | sage: extensionless `bin/sage`; both work with npm bin linking |

**Verdict:** naming is **house-aligned** with an explicit dual-bin escape hatch. Pre-publish action is documentation-first (`README` install note if `command -v atlas` hits Mongo), not a rename, unless owner reopens brand (checklist step 1).

---

### 5. Versioning & release automation

| Piece | memory-atlas | agentic-sage | token-oracle |
|---|---|---|---|
| Semver in package metadata | `0.1.0` | `1.0.0` | `0.1.1` |
| CHANGELOG | manual Keep a Changelog (`CHANGELOG.md`) | release-please maintained | release-please maintained |
| `release-please-config.json` | **absent** | present (`release-type: node`) | present (`release-type: python`) |
| `.release-please-manifest.json` | **absent** | `{".":"1.0.0"}` | `{".":"0.1.1"}` |
| Workflow `release-please.yml` | **absent** | present | present |
| Workflow `publish.yml` | **absent** | npm publish `--provenance` + `NPM_TOKEN` | PyPI OIDC trusted publishing |
| Conventional commits in CONTRIBUTING | “preferred” only | full table + release-please effect | full table |

SPEC.md Versioning section correctly states convention doc `version: 0.1` with no stability until 1.0 — good product honesty. **Missing is the machinery that makes package version bumps mechanical.**

---

### 6. CI / quality gates

| | memory-atlas | agentic-sage | token-oracle |
|---|---|---|---|
| `.github/` | **does not exist** | full tree | full tree |
| CI workflow | only a **YAML snippet** in `docs/LAUNCH-CHECKLIST.md` | matrix Node 20/22/24; biome + `node --test` | matrix Python 3.10–3.13; ruff + mypy + pytest |
| CI claims in docs | **CONTRIBUTING.md asserts `atlas check` runs in CI** | true | true |
| Dependabot | absent | npm + github-actions weekly | pip + github-actions weekly |
| Lint tooling | biome present locally | biome | ruff + mypy |
| Test suite size | 12 test files; README badge “131 passing” | 40+ test files | 30+ test modules |

**Doc drift:** `CONTRIBUTING.md` lines 23–24 say CI fails PRs on vault drift; there is no CI. That is a credibility bug for OSS reviewers.

Checklist CI is a good start but **weaker than sage**: single Node 20, no matrix, no concurrency group. Prefer copying sage’s workflow shape and **adding** `node bin/atlas.mjs check` as the dogfood gate (checklist already wants this — sage has no equivalent vault check).

---

### 7. README / docs completeness

| Surface | memory-atlas | agentic-sage | token-oracle |
|---|---|---|---|
| Product README | **Strong** (~9 KB): positioning, quickstart, anchors table, family table, comparison, docs links | Strong + banner + nav + live npm/CI badges | Strong + banner + demo GIF + multi-channel install |
| Banner / assets | **none** (checklist describes intended titan/globe art) | `assets/*` avif/webp + social preview | `assets/*` + `dash-demo.gif` |
| Badges | **static** shields (`tests-131`, node, license, deps) | live npm + GitHub Actions | live PyPI + CI + pyversions |
| Normative SPEC | `SPEC.md` (excellent) | `SCHEMA.md` + CONVENTIONS | contracts in package + SETUP |
| Setup / on-ramp | `docs/ONRAMP.md`, `docs/ADOPTION.md`, `docs/CONFIG.md` | root `SETUP.md`, `AGENTS.md` | root `SETUP.md`, `AGENTS.md` |
| Contributor entry | `CONTRIBUTING.md` (short) | CONTRIBUTING + issue templates + PR template | same pattern |
| Security / CoC | **missing** | `SECURITY.md`, `CODE_OF_CONDUCT.md` | same |
| Launch runbook | `docs/LAUNCH-CHECKLIST.md` (owner-gated, good) | sage has live go-live history in advisor plans | plans include launch runbook |
| Agent setup runbook | dogfood `CLAUDE.md` only; no root `AGENTS.md` for *this package’s* install | root `AGENTS.md` first-class | root `AGENTS.md` first-class |
| Interop examples | `examples/{solo,with-agentic-sage,with-token-oracle}/` | adapters + ADAPTERS.md | ADAPTERS.md |

**Strength:** memory-atlas README is already “shippable prose” — better than a stub. Gaps are **trust signals** (live badges, legal name consistency, CI green) and **contributor/agent surfaces** siblings standardized.

---

### 8. OSS hygiene checklist (house style)

| Item | memory-atlas | agentic-sage | token-oracle | Effort if adding to atlas |
|---|---|---|---|---|
| MIT LICENSE | yes, wrong copyright name | yes | yes | XS |
| `author` in package metadata | no | yes | yes | XS |
| `CODE_OF_CONDUCT.md` | no | yes (Contributor Covenant) | yes | S (copy/adapt) |
| `SECURITY.md` | no | yes (advisory URL + email) | yes (email) | S |
| `CONTRIBUTING.md` | yes (incomplete / CI drift) | yes + release-please table | yes + release-please table | S |
| Issue templates | no | bug + feature YAML | bug + feature YAML | S |
| PR template | no | yes (incl. secret-pattern check) | yes | S |
| Dependabot | no | yes | yes | XS |
| `.editorconfig` | no | yes | yes | XS |
| release-please | no | yes | yes | M |
| publish workflow | no | npm provenance | PyPI OIDC | M |
| Marketplace / install channels | n/a yet | Claude plugin + npm | PyPI + curl + uvx + npx | optional later |
| Banner assets | no | yes | yes | M (owner art) |

---

### 9. Naming family coherence

Family framing already in README:

| Project | Era | Role | Public? |
|---|---|---|---|
| token-oracle | future | token-cap forecast | yes (GitHub + PyPI) |
| agentic-sage | present | fleet judge | yes (GitHub + npm + site) |
| status-herald | voice | status-bar UI | referenced; not audited here |
| **memory-atlas** | **past** | verified memory | **not public** |

Package/bin naming follows the house pattern (descriptive package + short primary CLI + long alias). Vault directory default `atlas/` is a **local concept noun**, consistent with checklist brand lock.

---

### 10. What is already *better* or ready (do not regress)

- Zero runtime dependencies enforced in CONTRIBUTING.
- Dual bin aliases shipped.
- `files` whitelist excludes dogfood vault and tests.
- `adapters/.npmignore` for runtime nav-index artifacts (launch checklist documents a real pack leak that was closed).
- Normative `SPEC.md` + JSON schema under `schema/`.
- Portable skills + retrieval adapters + sibling interop examples.
- Honest pre-1.0 versioning language.
- Launch checklist exists (siblings had to invent this under distribution specs after the fact).

---

## Gap checklist

Effort scale: **XS** <30m · **S** half-day · **M** 1 day · **L** multi-day · **Owner** account/secret/art only.

| # | Item | Current state (memory-atlas) | Sibling precedent | Effort | Priority |
|---|---|---|---|---|---|
| 1 | **GitHub repository + `origin` remote** | No remote; GH URL 404 | Both siblings public under `muslewski/*` | Owner | **P0** |
| 2 | **LICENSE copyright legal name** | `Kento` | `Mateusz Muślewski` (token-oracle treated as P0) | XS | **P0** |
| 3 | **`package.json` `author`** | Missing | Present on both Node packages | XS | **P0** |
| 4 | **Confirm npm name still free** | Last planned 2026-07-09; re-check returned E404 today | sage published; oracle uses PyPI | XS | **P0** |
| 5 | **CI workflow** | Snippet only in LAUNCH-CHECKLIST; no `.github/` | sage: Node matrix + biome + tests; oracle: py matrix | S | **P0** |
| 6 | **Fix CONTRIBUTING CI claim** | Claims CI runs `atlas check` | Claims match reality | XS | **P0** |
| 7 | **release-please + manifest** | Absent | Both siblings | S | **P1** |
| 8 | **publish.yml (npm + provenance)** | Absent | sage `publish.yml` + `NPM_TOKEN` | S–M + Owner secrets | **P1** |
| 9 | **SECURITY.md** | Absent | Both siblings (email / GH advisory) | S | **P1** |
| 10 | **CODE_OF_CONDUCT.md** | Absent | Contributor Covenant on both | S | **P1** |
| 11 | **Issue + PR templates** | Absent | Both under `.github/` | S | **P1** |
| 12 | **Dependabot** | Absent | npm/pip + github-actions weekly | XS | **P1** |
| 13 | **Live README badges** | Static placeholders | Actions + registry badges | XS after CI+publish | **P1** |
| 14 | **CONTRIBUTING conventional-commit ↔ release-please table** | “Preferred” only | Full tables in both siblings | XS | **P1** |
| 15 | **`.editorconfig`** | Absent | Present on both | XS | **P2** |
| 16 | **Root `AGENTS.md` (agent install/verify runbook)** | Only dogfood `CLAUDE.md` | Both siblings root `AGENTS.md` | S | **P2** |
| 17 | **Banner / brand assets** | None; checklist has art brief | avif/webp banners (+ demo gif on oracle) | M + Owner | **P2** |
| 18 | **`format` script + lint without bare `npx`** | lint via `npx @biomejs/biome` | sage: `biome check` / `biome format` | XS | **P2** |
| 19 | **Node engines string normalize** | `>=20` | sage `>=20.0.0`; CI matrix multi-version | XS | **P2** |
| 20 | **CI matrix (Node 20/22/24)** | Checklist single 20 | sage matrix | S | **P2** |
| 21 | **npm publish dry-run / first publish** | Never published | sage on npm | Owner | **P1** (after 1–8) |
| 22 | **Optional: product homepage** | GitHub `#readme` only | sage.muslewski.com | L optional | **P3** |
| 23 | **Optional: Claude plugin marketplace** | N/A | sage `.claude-plugin/*` | M optional | **P3** (atlas is vault convention more than Claude plugin) |
| 24 | **Optional: postinstall hint** | None (no global wire needed) | sage hint-only postinstall | XS optional | **P3** |
| 25 | **Multi-repo “update to latest” mechanism** | Not in product yet; research in `r5-template-update-mechanics.md` | Siblings have install/upgrade paths for *tool* config, not vault convention fleet updates | L (product) | **P2 product** (not pure OSS hygiene; needed for dozens of minds) |

---

## Recommendations for memory-atlas (prioritized)

### Wave A — unblock public truth (do before first push)

1. **Legal/metadata fix (copy token-oracle WS-1):**  
   - `LICENSE`: `Copyright (c) 2026 Mateusz Muślewski`  
   - `package.json`: add `"author": "Mateusz Muślewski <10kento10@gmail.com>"`  
   - Grep for residual `Kento` as copyright/author attribution (not the email local-part).

2. **Align CONTRIBUTING with reality:** either land CI in the same PR as the claim, or soften language to “will run in CI once published.” Prefer landing CI.

3. **Re-run `npm view memory-atlas name`** immediately before `npm publish` (already in checklist).

### Wave B — house-style GitHub + quality shell (copy agentic-sage)

4. **Owner:** create `muslewski/memory-atlas`, add `origin`, push `main` (checklist §3–4).

5. **Add `.github/` from sage as template, adapted:**
   - `workflows/ci.yml`: Node matrix 20/22/24; `npm ci` / install; `biome check`; `node --test`; **`node bin/atlas.mjs check`** (dogfood vault — unique value).
   - `workflows/release-please.yml` + `release-please-config.json` (`release-type: node`) + `.release-please-manifest.json` (`0.1.0`).
   - `workflows/publish.yml`: tag `v*` / `workflow_dispatch`, `npm publish --provenance --access public` (same provenance note as sage about GITHUB_TOKEN vs PAT for tag re-trigger).
   - `dependabot.yml`, `ISSUE_TEMPLATE/*`, `PULL_REQUEST_TEMPLATE.md` (keep sage’s secret-pattern checklist — transferable).

6. **Hygiene files:** `SECURITY.md` (local CLI, git, path risk surface — similar to sage), `CODE_OF_CONDUCT.md` (copy Contributor Covenant), expand CONTRIBUTING release-please table.

7. **README badges:** swap static test count for Actions badge; after first publish add npm version badge.

### Wave C — polish to sibling “launch quality”

8. **Banner assets** per LAUNCH-CHECKLIST art brief (match sage/oracle visual family).

9. **Root `AGENTS.md`:** agent-executable “install CLI → init vault → on-ramp blocks → `atlas check` green” runbook (siblings use this as the primary agent entry). Keep `docs/ONRAMP.md` as the paste kit; AGENTS.md becomes the ordered verify path.

10. **Optional format script** and biome scope review (atlas currently lints `bin/`, `lib/`, `test/`; sage excludes tests — either is fine; pick one house rule).

### Wave D — product (outside pure OSS shell, but required for “dozens of minds”)

11. **Design and ship an `atlas update` / skill-driven update path** that:
    - versions the *convention* (SPEC + schema + templates) separately from *user vault content*;
    - never clobber hand-authored zones/decisions/config;
    - uses ownership classes (toolkit-owned / user-owned / mergeable) from `r5-template-update-mechanics.md`;
    - emits a plan (Nx-migrate style) before applying, with AI resolution only on mergeable markdown.

    This is **not** a sibling copy-paste (sage/oracle upgrade local tool wiring, not multi-repo prose vaults), but it is the maturity item that makes open-sourcing memory-atlas useful beyond a single owner.

### Explicit non-goals for first public v0.1

- Matching sage’s Claude marketplace packaging (atlas value is convention + CLI, not hook marketplace).
- Custom product domain (nice later).
- Renaming package away from `memory-atlas` unless npm is taken.
- Porting syndcast-mind `visuals/` (out of scope per task).

### Suggested “definition of done” for OSS-ready

| Gate | Criterion |
|---|---|
| Legal | LICENSE + author match siblings |
| Hosted | Public `muslewski/memory-atlas` with green CI on `main` |
| Package | `npm publish` of `memory-atlas@0.1.x` with dual bins working via `npx memory-atlas` |
| Hygiene | SECURITY, CoC, CONTRIBUTING, issue/PR templates present |
| Release | release-please opened at least one dry cycle or first real tag published via publish.yml |
| Docs | README badges live; install notes mention `atlas` vs Mongo PATH collision |
| Product honesty | README still does not overclaim flaky-test elimination; SPEC pre-1.0 language retained |

---

## Open questions

1. **Owner identity string:** confirm permanent public form is always `Mateusz Muślewski` (siblings) and never `Kento` on legal surfaces — including any future NOTICE/CITATION files.
2. **First version strategy:** publish as `0.1.0` (honest alpha, like token-oracle) or hold for a slightly higher bar / `0.2.0` after update-mechanism design? House precedent allows early alpha public.
3. **Bin collision policy for README install:** lead with `npx memory-atlas` / `memory-atlas` alias always, or lead with `atlas` and footnote Mongo? Checklist currently favors preflight `command -v atlas`.
4. **Homepage:** remain GitHub-only, or plan `atlas.muslewski.com` / family page later (sage has a dedicated site)?
5. **Claude marketplace:** worth a thin skill-only plugin package, or deliberately omit (token-oracle explicitly omitted marketplace because it is a pure CLI)?
6. **CI strictness:** should `atlas check` be non-strict freshness by default in CI for dogfood (current default), with a second job for `--strict` later?
7. **Release token model:** copy sage’s `NPM_TOKEN` + optional `RELEASE_PLEASE_TOKEN` for tag re-trigger, or invest in npm trusted publishing / OIDC like PyPI path on token-oracle?
8. **Advisor-plans gitignore:** `advisor-plans/` is gitignored locally — intentional for private planning? Siblings also ignore advisor-plans/docs/superpowers in various ways. Confirm nothing required for OSS is only living under gitignored paths (LAUNCH-CHECKLIST is under `docs/`, good).
9. **status-herald:** README family table references it; is it public enough to link, or should the table soft-link until that repo is ready?
10. **Update mechanism ownership:** is “update to latest” a post-0.1.0 feature track, or a gate before encouraging 5+ new repos to adopt (risk: five divergent forks of convention with no upgrade path)?

---

## Method notes

- Read-only inspection of local trees, package manifests, workflows, LICENSE, README/CONTRIBUTING, launch checklist, sibling distribution design specs.
- Public checks: GitHub HTTP status, HTML star labels, `npm view`, npm downloads API (agentic-sage), PyPI JSON (token-oracle). GitHub REST API was rate-limited unauthenticated during this session.
- No `git add`/`commit`/`push`, no installs, no `npm publish`, no pack writes.

---

*End of report.*
