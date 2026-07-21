# Open-sourcing playbook for small Node.js CLI tools (with config/upgrade prior art)

Research date: 2026-07-17  
Scope: packaging, semver/release automation, adoption-oriented docs, and **config-schema versioning + automated upgrade paths** as prior art for memory-atlas’s multi-repo “update to latest” problem.  
Method: web research of primary docs, blog posts, and public GitHub/npm sources. Star counts are approximate from public GitHub UI as of research time (API rate-limited).  
Out of scope: syndcast-mind `visuals/`.

---

## Summary

- Mature small Node CLIs share a tight packaging contract: `bin` map, explicit `files`, `engines`, MIT/Apache, zero or minimal runtime deps, dual bin names when collisions exist, and `npm publish --dry-run` before first ship.
- Semver + Conventional Commits are non-negotiable for tools that touch many repos; for a **single-package** CLI like memory-atlas, **Release Please** (PR-gated) or **Changesets** (intent-gated) beat fully automatic semantic-release until trust and commit hygiene are solid.
- Adoption is driven less by star counts than by a 30-second Quickstart, copy-paste on-ramp, honest zero-config defaults, CI-ready `check` command, and a clear “what this is / isn’t” README — memory-atlas already has most of this shape.
- Config shape version (`atlas.config.json` `version`) must stay **orthogonal** to package semver; Biome’s `$schema` URL + `biome migrate`, ESLint’s one-shot migrator package, Tailwind’s major-upgrade CLI, and Next/React jscodeshift codemods are the four dominant upgrade-shipping patterns.
- **Deterministic transforms for structured config; AI/agent for hand-customized vault content.** Copier’s 3-way template update is the closest model for “propagate convention improvements without clobbering local answers.”
- Every serious upgrade tool ships: dry-run default, `--write` opt-in, branch recommendation, manual follow-up checklist, and **fixture-based golden tests** (before/after pairs), not only unit tests of parsers.
- Best-fit for memory-atlas OSS + fleet updates: (1) publish cleanly now; (2) implement `atlas migrate` as versioned, pure transforms on `atlas.config.json` + templates; (3) ship an AI skill that uses those transforms as ground truth while preserving repo-local config and hand-authored zone/decision content.
- Do not invent a new template engine for vault markdown; treat templates as defaults-on-init, and migrations as explicit named steps with tests — never silent rewrites of verified cards.

---

## Findings

### 1. Packaging norms for small Node.js CLI tools

**Primary sources**

| Source | ~Stars | URL |
|---|---:|---|
| lirantal/nodejs-cli-apps-best-practices | ~3k+ (widely cited; “41 best practices”) | https://github.com/lirantal/nodejs-cli-apps-best-practices |
| clig.dev (CLI Guidelines) | community standard | https://clig.dev/ · https://github.com/cli-guidelines/cli-guidelines |
| Node.js publishing guide | — | https://nodejs.org/learn/modules/publishing-a-package |

**Norms that matter for a tool the size of memory-atlas**

1. **`bin` as an object, not a string** — map CLI names explicitly; support an alias when the short name collides (memory-atlas already: `atlas` + `memory-atlas`). Document PATH collisions (MongoDB Atlas CLI also ships `atlas`).
2. **`files` whitelist** — ship only what users need (`bin`, `lib`, `templates`, `schema`, `skills`, `docs`, `examples`). Never ship tests, research notes, or `.claude/` internals.
3. **`engines.node`** — declare and enforce (`>=20` is current mainstream for modern CLIs; Tailwind’s upgrade tool also requires Node 20+).
4. **Prefer zero runtime dependencies** when the problem is filesystem + git (memory-atlas and agentic-sage both lean this way). lirantal’s guide: small dependency footprint + optionally shrinkwrap for CLIs that *do* have deps so consumers get pinned trees.
5. **ESM-only is fine** for Node ≥20 CLIs (`"type": "module"`, `.mjs` entry). Dual CJS/ESM packaging is rarely worth it for pure CLIs.
6. **Shebang + executable bit** on the bin entry; relative imports only (no `__dirname` hacks that break under `npx` install layouts).
7. **Exit codes, STDERR vs STDOUT, `--help` / `--version`, non-interactive CI mode** — clig.dev + lirantal §Errors / Interoperability. A `check` that exits non-zero is a feature for CI adoption.
8. **npm Trusted Publishing / automation tokens** for GitHub Actions (2025–2026 norm) rather than long-lived user tokens when possible.
9. **Sibling pattern (local evidence)** — `agentic-sage` ships `bin` dual names (`sage` / `agentic-sage`), `files` whitelist, `engines.node >=20`, MIT, ESM — same shape memory-atlas already mirrors (`package.json`).

**memory-atlas local state (repo analysis)**

- `package.json`: name `memory-atlas`, version `0.1.0`, `bin.atlas` + `bin.memory-atlas`, `files` whitelist, `engines.node >=20`, MIT, **zero runtime deps**, `node --test`.
- Launch path already drafted: `docs/LAUNCH-CHECKLIST.md` (npm name check, GitHub remote, CI YAML, dry-run publish).
- Schema already has config shape versioning: `schema/atlas.config.schema.json` + `lib/config.mjs` `DEFAULTS.version: 1`, documented in `docs/CONFIG.md` as independent of package semver.
- SPEC pre-1.0 versioning: `SPEC.md` frontmatter `version: 0.1` — breaking convention changes bump minor until 1.0.

---

### 2. Semver discipline

**Rules that OSS consumers actually rely on**

| Bump | Meaning for a CLI + convention tool |
|---|---|
| **patch** | Bugfix; same config schema; same CLI flags; same vault semantics. |
| **minor** | New optional config keys, new subcommands, new modules default **off**; old configs still load. |
| **major** | Config schema break, CLI flag removal, verifier becoming stricter by default, template renames that break existing vaults. |

**Extra rule for convention tools (memory-atlas-specific insight from prior art):**

- **Package semver ≠ config `version`.** Biome versions the *tool* (`@biomejs/biome@2.x`) and also versions the *schema URL* (`$schema: https://biomejs.dev/schemas/2.3.0/schema.json`). ESLint major’d the whole product when flat config became default. Tailwind major’d when config moved from JS to CSS.  
- memory-atlas already encodes this correctly: config `version` is an integer shape version; package is free to ship 0.x → 1.x without rewriting every adopter’s config if the shape is stable.

**Pre-1.0 discipline**

- 0.x is allowed to break; document it (SPEC already does).  
- For multi-repo dogfooding (5+ minds soon), treat **config `version` as the real compatibility contract** even while package stays 0.x. Prefer not to bump config `version` casually.

**Commit hygiene**

- Conventional Commits (`feat:`, `fix:`, `feat!:` / `BREAKING CHANGE:`) unlock Release Please / semantic-release.  
- Pair with commitlint if the team is multi-agent and commit messages otherwise drift.

---

### 3. Release automation: Release Please vs Changesets vs semantic-release

**Sources**

| Tool | ~Stars | URL | Philosophy |
|---|---:|---|---|
| googleapis/release-please | ~7.2k | https://github.com/googleapis/release-please | Conventional commits → maintained **Release PR**; merge = release |
| changesets/changesets | ~9k class (monorepo staple) | https://github.com/changesets/changesets | Explicit per-PR “changeset” intent files |
| semantic-release | large ecosystem | https://semantic-release.gitbook.io/ | Fully automatic on push to main |
| Comparison writeup (2025) | — | https://oleksiipopov.com/blog/npm-release-automation/ | Side-by-side demos + Actions |

**How they ship**

1. **Release Please (recommended default for single-package CLI)**  
   - Commits land on `main` with Conventional Commits.  
   - Bot opens/updates a Release PR with version bump + CHANGELOG.  
   - Human merges when ready; Action runs `npm publish` if `release_created`.  
   - Config: `release-please-config.json` + `.release-please-manifest.json`, `release-type: node`.  
   - **Why it fits memory-atlas:** human gate before publish, great for a 0.x → 1.0 product where accidental majors hurt adopters; matches Google/OSS CLI culture.

2. **Changesets**  
   - Developer runs `changeset` and writes a short markdown intent (patch/minor/major + summary).  
   - Bot opens “Version Packages” PR; merge publishes.  
   - **Strength:** monorepos and intentional changelog quality.  
   - **Cost:** agents forget changesets unless CI enforces them.  
   - Prefer if you later split `memory-atlas` core vs `@memory-atlas/skill-pack` vs upgrade package.

3. **semantic-release**  
   - Zero human gate; commit message is the release.  
   - Best when commitlint is ironclad and you want continuous ship.  
   - Risk for convention tools: a mis-tagged `feat!:` in an agent session publishes a breaking major.

**Practical recommendation for memory-atlas today:** Release Please + `release-type: node` + publish on release PR merge. Keep Changesets in reserve if the package graph splits.

---

### 4. README / docs patterns that drive adoption

**Patterns that convert browsers → installs (from ESLint, Biome, Tailwind, lirantal, clig.dev, and local sibling CLIs)**

| Layer | Purpose | memory-atlas status |
|---|---|---|
| One-line pitch + badges | Trust + “what is this” | Present (`README.md`) |
| 30-second Quickstart (`npx … init`) | Time-to-value | Present |
| “Why not X” / honest non-goals | Positioning | Partial (good differentiation vs agent memory DBs; could sharpen vs plain Obsidian) |
| Copy-paste agent on-ramp | Multi-agent adoption | Strong (`docs/ONRAMP.md`) |
| Greenfield vs brownfield adoption | Real-world repos | Strong (`docs/ADOPTION.md`) |
| Config reference + schema | Power users + editors | Strong (`docs/CONFIG.md` + JSON Schema) |
| Upgrade / migration guide | Retention after breaking changes | **Missing as a product surface** (critical gap for fleet maturity) |
| Examples/ | Show composition | Present (`examples/with-agentic-sage`, `with-token-oracle`) |
| CI snippet | “put this in the pipeline” | Present in ONRAMP / LAUNCH-CHECKLIST |
| CHANGELOG | Trust over time | Present but needs automated generation |

**Docs that sell upgrades (prior art)**

- Tailwind: single **Upgrade guide** with tool-first path + exhaustive breaking-change tables.  
- Biome: **Upgrade to Biome v2** + separate **Migrate ESLint/Prettier** guides; migrate is a first-class CLI verb.  
- ESLint: long **Configuration Migration Guide** + blog announcing migrator + Config Inspector.  
- Next.js: versioned **codemods** index under `/docs/.../upgrading/codemods`, plus umbrella `npx upgrade`.

**Adoption anti-patterns (evidence from ESLint flat-config pain)**

- A major that requires full config rewrite without a 90% automated path destroys trust for 6–18 months (ESLint v9 community feedback).  
- Migrators that “evaluate JS config and lose logic” must say so in bold (ESLint migrator does).  
- Generated configs that over-use compatibility shims need a “simplify later” checklist.

---

### 5. CRITICAL: Config-schema versioning + automated upgrade prior art

This section is the heart of the research: how major tools ship, version, and test “upgrade” paths — and what that means for AI-driven multi-repo propagation.

#### 5.1 Taxonomy of upgrade systems

| Pattern | What it migrates | Shipping vehicle | Local customization stance | Exemplar |
|---|---|---|---|---|
| **A. One-shot format migrator** | Old config format → new format | Separate `npx @scope/migrate-…` package | Creates *new* file; old left alone; may lose JS logic | `@eslint/migrate-config` |
| **B. In-CLI versioned migrate** | Current config → latest schema/semantics | Subcommand of main CLI (`migrate --write`) | Rewrites known keys; prints manual TODOs for the rest | `biome migrate` |
| **C. Major-upgrade suite** | Deps + config + user source files | Dedicated `@scope/upgrade` package, major-aligned | Branch + review; handles class renames in templates | `@tailwindcss/upgrade` |
| **D. Codemod catalog** | Source code APIs across versions | `@next/codemod` / `react-codemod` via jscodeshift; named transforms per release | `--dry`; unsafe transforms labeled; comments left for manual | Next.js, React |
| **E. Template 3-way update** | Scaffolded files from evolving template | `copier update` with stored answers | Diff against “fresh regen” then re-apply user delta | Copier |
| **F. Schema $ref version pin** | Editor validation + discoverability | URL or path to versioned schema | Does not rewrite; signals staleness | Biome `$schema`, JSON Schema `$id` |

memory-atlas needs **B + F for config**, **E-thinking for templates/skills**, and eventually **AI skill orchestration (not pure AST)** for vault content — closest to “B + E + agent,” not pure D.

---

#### 5.2 ESLint Configuration Migrator (`@eslint/migrate-config`)

| Dimension | Detail |
|---|---|
| **Repos / ~stars** | Package lives in [eslint/rewrite](https://github.com/eslint/rewrite) `packages/migrate-config`; parent [eslint/eslint](https://github.com/eslint/eslint) ~**27.5k** stars |
| **Docs** | https://eslint.org/blog/2024/05/eslint-configuration-migrator/ · https://eslint.org/docs/latest/use/configure/migration-guide · package README |
| **How users run** | `npx @eslint/migrate-config .eslintrc.json` (+ yarn dlx / pnpm dlx / bunx) |
| **What it does** | eslintrc JSON/YAML/YML → `eslint.config.mjs` (or CJS via `--commonjs`); folds `.eslintignore`; injects FlatCompat / compat utilities aggressively |
| **What it does *not* do** | Preserve non-trivial JS config *logic* (evaluates then migrates computed object); 100% green first run not guaranteed |
| **Versioning** | Separate npm package; flags like `--target-version 9` for ESLint generation targeting; not tied 1:1 to every ESLint patch |
| **Shipping** | Own package in monorepo rewrite stack; published to npm for `npx` without install |
| **Testing** | Dedicated `packages/migrate-config/tests` tree; community pointed to before/after cases as migration examples ([eslint#20442 discussion context](https://github.com/eslint/eslint/issues/20442)) |
| **UX lessons** | Dry-ish “write new file” (non-destructive to old config); honest limitations in README; post-steps (upgrade plugins, handle `--ext`, multi-directory eslintrc) |

**Takeaway for memory-atlas:** a standalone `npx` migrator is great for *one* epochal format change (eslintrc → flat). For *ongoing* schema bumps across many adopters, an in-CLI `atlas migrate` (Biome style) is better.

---

#### 5.3 Biome `migrate` (best model for config shape evolution)

| Dimension | Detail |
|---|---|
| **Repos / ~stars** | [biomejs/biome](https://biomejs/biome) ~**25.4k** stars |
| **Docs** | https://biomejs.dev/guides/upgrade-to-biome-v2/ · https://biomejs.dev/guides/migrate-eslint-prettier/ |
| **How users run** | After bumping package: `npx @biomejs/biome migrate --write` · also `migrate eslint` / `migrate prettier` |
| **Config identity** | `$schema` URL embeds Biome version (`schemas/2.3.0/schema.json`); `migrate` updates schema pointer + renames/moves keys (e.g. `organizeImports` → `assist.actions…`) |
| **Versioning model** | Tool major (v1→v2) ships breaking semantics; migrate **mitigates** breaks by rewriting config; still documents manual steps |
| **Default safety** | Without `--write`, shows plan; with `--write`, mutates `biome.json` |
| **Cross-tool migration** | Separate subcommands for ESLint/Prettier → Biome (competitor → Biome), not only self-upgrade |
| **Testing / quality bar** | Migrations treated as product features; release notes track migrate bugs (e.g. trailing-comma renames on last rule in group); issues filed when `$schema` not updated — treated as defects |
| **UX lessons** | Pin exact version during major upgrade (`@2.0.6`); run migrate immediately; read stdout for manual TODOs |

**Takeaway:** **versioned schema pointer + migrate after install + mitigate rather than guarantee zero-touch** is the industry’s best ongoing pattern for JSON config tools. memory-atlas’s integer `version` field is the same idea without a URL (local `$schema` path already exists).

---

#### 5.4 Tailwind `@tailwindcss/upgrade`

| Dimension | Detail |
|---|---|
| **Repos / ~stars** | [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) (large; industry-standard CSS framework) |
| **Docs** | https://tailwindcss.com/docs/upgrade-guide · https://tailwindcss.com/blog/tailwindcss-v4 |
| **How users run** | `npx @tailwindcss/upgrade` (Node ≥20) |
| **Scope** | **Broader than config:** updates package.json deps, migrates `tailwind.config.js` → CSS-first `@theme`, rewrites utility classes in templates, adjusts PostCSS/Vite wiring |
| **Safety ritual** | Official: **new git branch**, review diff, browser-test; tool does “vast majority” not 100% |
| **Versioning** | Aligned with major framework jump (v3→v4); later also supports upgrades within v4 lines (CHANGELOG mentions upgrade between v4.* versions) |
| **Shipping** | Separate package in monorepo (`packages/…/upgrade`), published for `npx`; lives beside `@tailwindcss/cli`, `@tailwindcss/postcss`, `@tailwindcss/vite` |
| **Failure modes (community)** | Monorepos, path resolution on Windows, pnpm catalogs, partial migrations leaving `@config` bridges — prove that suite migrators need repo-layout awareness |
| **Testing** | Internal integration/dummy-app style validation (referenced in Rails/tailwindcss-rails discussion); exhaustive human-readable breaking-change tables are part of the “test” for users |

**Takeaway:** use a **dedicated upgrade package** when a major changes *user content* beyond config. For memory-atlas, that would be vault templates/skills/on-ramp blocks — not every patch.

---

#### 5.5 Next.js codemods + React codemods

| Dimension | Detail |
|---|---|
| **Repos / ~stars** | [vercel/next.js](https://github.com/vercel/next.js) (very large); codemods at `packages/next-codemod` → npm `@next/codemod` · [reactjs/react-codemod](https://github.com/reactjs/react-codemod) |
| **Docs** | https://nextjs.org/docs/app/guides/upgrading/codemods |
| **How users run** | Named transforms: `npx @next/codemod@canary <transform> <path>` · flags `--dry` · umbrella `npx upgrade [revision]` runs package bumps + prompts for codemods |
| **What they migrate** | **Source APIs** (middleware→proxy, async cookies, image imports, etc.), not primarily JSON config |
| **Versioning** | Codemods cataloged **by framework version section** (16.0, 15.0, 14.0…) — discoverable history of transforms |
| **Shipping** | Monorepo package versioned with Next; published as `@next/codemod`; React moved UX toward codemod.com while keeping OSS transforms |
| **Testing** | Classic jscodeshift: `transforms/__testfixtures__/<name>/` **input/output pairs**; docs explicitly point to fixtures as the list of covered cases |
| **Safety** | “Dangerous” vs “safe” transforms labeled; when auto-fix impossible, insert `// TODO` / `UnsafeUnwrapped*` typecasts that **fail the build** until human resolves |

**Takeaway:** for anything AST-shaped, **named, version-scoped transforms + golden fixtures + dry-run + leave breadcrumbs** is the gold standard. memory-atlas vault markdown is *not* primarily AST — so pure jscodeshift is a poor fit for zone cards; still excellent for any future JS adapter APIs.

---

#### 5.6 Copier 3-way template updates (closest to “propagate convention to dozens of repos”)

| Dimension | Detail |
|---|---|
| **Project** | [copier-org/copier](https://github.com/copier-org/copier) · docs https://copier.readthedocs.io/en/stable/updating/ |
| **How it works** | Stores `.copier-answers.yml` + template git tag. On `copier update`: regenerate fresh project at *old* template version → diff against current project (user changes) → apply *new* template → re-apply user diff → pre/post migration hooks |
| **Conflict model** | Inline conflict markers (default) or `.rej` files; recommend pre-commit hooks to block committing unresolved conflicts |
| **Check updates** | `copier check-update` with JSON/`--quiet` exit codes for automation |
| **Failure modes** | Manual edits to answers file poison the algorithm; deleted template files stay deleted; complex Jinja/extensions can break replay → `copier recopy` escape hatch |

**Takeaway for memory-atlas “update to latest” across many minds:**

- Store **answers / options** (enabled modules, folder remaps, skill install prefs) separately from **hand-authored content**.  
- Mechanical update = re-apply template/skill defaults where user has not customized.  
- Never treat zone cards, decisions, or verified frontmatter as template output.  
- This is the mental model for an AI skill: **3-way thinking** (upstream template, last applied, current repo) even if the executor is an agent, not Copier itself.

---

#### 5.7 How they test upgrade paths (synthesis)

| Technique | Who | When to use for memory-atlas |
|---|---|---|
| **Golden fixtures** (input config → expected output) | ESLint migrate-config tests; Next `__testfixtures__`; Biome migrate cases | **Required** for every config `version` N→N+1 transform |
| **Dry-run vs write** | Biome `--write`; Next `--dry`; Tailwind branch ritual | Default dry-run / plan; explicit write |
| **Idempotency tests** | Implied by mature migrators | `migrate` on already-migrated config is no-op |
| **Round-trip / load tests** | Schema tools | Migrated config must pass `atlas check` and schema validation |
| **Manual-step assertions** | ESLint/Biome stdout TODOs | When transform cannot be total, assert warning text |
| **Integration on sample apps** | Tailwind dummy apps / real monorepos | Fixture vaults: solo, multi-module, remapped folders, disabled modules |
| **Release-note contract** | All majors | Every breaking config change lists migrate support or explicit “manual only” |

---

#### 5.8 Cross-cutting design principles for upgrade systems

1. **Separate product version from document version.**  
2. **Migrations are code, versioned and tested — not blog posts alone.**  
3. **Prefer additive defaults; migrate only on true breaks.**  
4. **Never silently rewrite user intent** (ESLint losing JS logic; Copier overwriting customized deps).  
5. **Print a report:** what changed, what was skipped, what needs humans/agents.  
6. **Opt-in write; branch recommendation.**  
7. **Idempotent and ordered:** apply steps from `fromVersion` to `toVersion` in sequence.  
8. **Escape hatches:** dry-run, single-step migrate, “recopy templates only,” refuse to touch `verifiedAt` / decision bodies.  
9. **AI is for residual ambiguity**, not for replacing pure data transforms — use agents where fixtures cannot encode taste (zone prose, ADR wording), and pure code where they can (`folders.techDebt` rename, module flag defaults).

---

### 6. Mapping prior art → memory-atlas architecture

| memory-atlas surface | Closest prior art | Upgrade strategy |
|---|---|---|
| `atlas.config.json` + `version` | Biome `$schema` + `migrate` | Ordered pure transforms `1→2→…`; bump `version`; update `$schema` path |
| `schema/atlas.config.schema.json` | JSON Schema + SchemaStore pattern | Ship schema in npm package; document `$schema` pointer in init template |
| `templates/**` | Copier template files | On update: add *missing* template files only (init already additive); never overwrite customized templates without prompt |
| `skills/**` vendored into repos | Copier / “skill pack” version | Copy-if-absent or hash-compare; skill-driven merge for hand-edited skills |
| `docs/ONRAMP` blocks in CLAUDE.md | Codemod “insert import” / Copier skip_if_exists | Agent skill proposes diff; human/agent reviews |
| Zone cards / decisions / verifiedAt | **No good pure-codemod analog** | AI recollection skill; never auto-stamp or rewrite verified content |
| CLI flags / subcommands | Next codemod catalog | Document in CHANGELOG; major only if removal |
| Verifier strictness | ESLint major pain | New strictness behind flags or major + migrate that sets explicit opts preserving old behavior |

---

### 7. Release + docs checklist observed in successful OSS CLIs

1. CI on PR: test + lint + self-dogfood (`atlas check`).  
2. Release PR automation (Release Please).  
3. CHANGELOG human-readable sections: Features / Fixes / **Migrations** / Breaking.  
4. GitHub Release notes = CHANGELOG slice.  
5. npm package with provenance when available.  
6. Upgrade guide page linked from README when first breaking config ships.  
7. `npx memory-atlas@latest migrate --dry-run` works without global install.  
8. Examples stay green on CI.  
9. SECURITY / CODE_OF_CONDUCT optional but expected for public trust; CONTRIBUTING already exists.

---

## Recommendations for memory-atlas

Prioritized for “mature now, OSS soon, fleet of minds soon.”

### P0 — Ship the package cleanly (this week)

1. Execute `docs/LAUNCH-CHECKLIST.md` owner steps: confirm npm name free, push GitHub remote, add CI workflow (already drafted), `npm publish --dry-run` then publish.  
2. Wire **Release Please** (`release-type: node`) + publish job on `release_created`. Adopt Conventional Commits in agent/human workflow.  
3. Keep **zero runtime deps** and dual bin; call out MongoDB `atlas` PATH collision in README install section (checklist already notes this).  
4. Ensure published tarball includes `schema/`, `templates/`, `skills/`, `docs/` (already in `files`) and excludes `.claude/research/`.

### P0 — Lock the config-version contract

5. Treat `atlas.config.json` `version` as the **adopter compatibility API**. Document in README + CONFIG: “package semver can move; config version only bumps on shape breaks.”  
6. Add loader behavior (when migrate lands): if `version < CURRENT`, `atlas check` / `atlas build` print a **non-fatal** (or CI-fatal under flag) hint: `run atlas migrate`.  
7. Never auto-migrate on every command (Biome requires explicit migrate; good). Surprises destroy trust across 5–50 repos.

### P1 — Implement `atlas migrate` (deterministic core)

8. Design as **ordered steps**: `migrations/v1-to-v2.mjs` exporting `{ id, from, to, apply(config) → { config, notes[] } }`.  
9. CLI UX (Biome-shaped):  
   - `atlas migrate` → plan (diff/summary)  
   - `atlas migrate --write` → apply  
   - `atlas migrate --from 1 --to 2` for controlled fleet ops  
   - Exit codes: 0 no-op/success, 2 needs write, 1 hard failure  
10. Always rewrite `version` and `$schema` together.  
11. **Golden tests** under `test/fixtures/migrate/v1-to-v2/{input,output,notes}` — non-negotiable.  
12. Preserve unknown keys only if you plan to allow them; currently schema is `additionalProperties: false` at top level — migrations must not invent open-ended junk.

### P1 — Respect local customization (the fleet problem)

13. Split “update” into layers:  
    | Layer | Mechanism | Touches user content? |  
    |---|---|---|  
    | A. npm package bump | `npm i memory-atlas@latest` | No |  
    | B. Config migrate | `atlas migrate --write` | Config only |  
    | C. Template/skill sync | `atlas init` additive + explicit `atlas sync-templates` | Only missing files by default |  
    | D. Convention/content upgrade | **AI skill** `atlas-update` / recollection | Yes — with diff + human gate |  

14. **Do not** build a full Copier clone. Steal the *algorithmic idea*:  
    - Remember last applied package version / config version in a small marker (e.g. `atlas.config.json` fields or `.atlas-tooling.json` if you must separate).  
    - Compute: missing templates, outdated skills (hash), config behind, SPEC/docs pointers.  
    - Emit a machine-readable report JSON for agents.

15. Hard safety rails for any updater (code or AI):  
    - Never modify `verifiedAt`, decision bodies, or zone `summary` without explicit flag.  
    - Never re-enable `enabled: false`.  
    - Never reset custom `folders.*` remaps.  
    - Prefer additive module defaults (`modules.x: false` stays false).

### P2 — AI/skill-driven “update to latest” (the differentiator)

16. Ship a skill (e.g. `skills/atlas-update/SKILL.md`) that instructs an agent to:  
    1. Read installed package version vs latest npm.  
    2. Run `atlas migrate --write` if config version behind.  
    3. Diff skill/on-ramp templates against package copies.  
    4. Propose PR with only tooling/convention files first.  
    5. Optionally run recollection for vault content as a **second** PR.  
17. Give the skill a **checklist format** modeled on Tailwind upgrade guide + Copier conflict rules — agents follow checklists better than prose.  
18. For multi-repo fleet: a thin orchestrator script (out of package or in `examples/`) that loops repos, opens branches, runs skill — but keep core CLI single-repo.

### P2 — Docs that make OSS and upgrades stick

19. Add `docs/UPGRADE.md` before the first config `version` bump:  
    - How config version works  
    - How to run migrate  
    - What is never auto-touched  
    - How to update skills/on-ramp  
20. README section: “Updating across many repositories.”  
21. CHANGELOG section template: `### Migrations` with step ids.  
22. Keep ADOPTION.md for brownfield *content*; UPGRADE.md for *tooling evolution*.

### P3 — Optional later

23. Split `@memory-atlas/migrate` only if migrate gains heavy deps; until then keep in main CLI (Biome model > ESLint separate package for *ongoing* bumps).  
24. SchemaStore registration for `atlas.config.json` once public.  
25. `atlas migrate eslint`-style bridges only if you absorb foreign vault formats (e.g. raw `docs/adr` → decisions) — that’s ADOPTION, not migrate.  
26. Provenance-attested npm publishes; OpenSSF scorecard when public.

### Explicit non-recommendations

- **Don’t** use semantic-release full-auto on day one with multi-agent commits.  
- **Don’t** use jscodeshift as the primary vault migrator.  
- **Don’t** silent-rewrite configs on `atlas check`.  
- **Don’t** version templates by overwriting dogfooded customized files in adopting repos.  
- **Don’t** couple package major to every SPEC prose edit — use SPEC version + config version + package semver as three clocks.

---

## Open questions

1. **Marker file vs config-only versioning:** Is `atlas.config.json.version` enough to know which *package* skill/template generation last applied, or do you need `toolingRevision` / `lastMigratedPackage` for Copier-like 3-way skill sync?  
2. **Strictness of migrate in CI:** Should outdated config fail `atlas check` (Biome-ish pressure) or only warn until 1.0?  
3. **Multi-vault monorepos:** One `atlas.config.json` per repo is the model today — do any of the five new repos need multi-vault, and does migrate need a `--config` path story (Biome’s pain around non-default names)?  
4. **Skill vendor strategy:** Copy skills into `.claude/skills` (mutable) vs always resolve from `node_modules/memory-atlas/skills` (immutable upstream) — which is the long-term update surface?  
5. **SPEC version vs config version vs package version:** Three clocks is correct but cognitively heavy — is there a single `atlas status --versions` report that should become the agent-facing truth?  
6. **AI migrate boundaries:** Which vault edits is the owner willing to let an agent auto-PR without review after the five-repo pilot? (Recommended: none of `verifiedAt` / decisions.)  
7. **Sibling alignment:** Should agentic-sage / token-oracle share the same Release Please + dual-bin + update-skill playbook for brand consistency?  
8. **Public schema URL:** When open-sourced, serve versioned schemas at a stable URL (Biome-style) or only via npm path? Affects editor UX for adopters who don’t install the package globally.  
9. **First config v2 candidate:** What is the first *real* breaking shape change expected from multi-repo dogfooding (modules, hooks, retrieval, routines)? Design migrate tests for that before it ships.  
10. **Bin name long-term:** If MongoDB Atlas collision becomes a support burden, is `memory-atlas` the primary documented entry while `atlas` remains alias?

---

## Appendix A — Quick command cheatsheet (prior art)

```bash
# ESLint one-shot format migrator
npx @eslint/migrate-config .eslintrc.json

# Biome self-upgrade migrate
npm i -D @biomejs/biome@2.0.6
npx @biomejs/biome migrate --write
npx @biomejs/biome migrate eslint --write

# Tailwind major suite
npx @tailwindcss/upgrade   # on a new git branch

# Next.js codemods
npx @next/codemod@canary <transform> . --dry
npx upgrade minor

# Copier template evolution
copier update
copier check-update --output-format json
```

## Appendix B — Suggested memory-atlas migrate UX (sketch)

```bash
$ atlas migrate
Config version: 1 (current tool supports 2)
Plan:
  [v1→v2] rename modules.backlog → … (example)
  [v1→v2] set hooks.sessionStartIndexRefresh default explicit
  skills/templates: 2 package skills newer than vendored copies (not applied)
Run with --write to apply config transforms.

$ atlas migrate --write
Wrote atlas.config.json (1 → 2)
Notes:
  - Review hooks.* if you rely on session-start side effects
Next: commit config; optionally run skill atlas-update for on-ramp/skills
```

## Appendix C — Source index

| Topic | URL |
|---|---|
| ESLint migrator announce | https://eslint.org/blog/2024/05/eslint-configuration-migrator/ |
| ESLint migration guide | https://eslint.org/docs/latest/use/configure/migration-guide |
| eslint/rewrite migrate-config | https://github.com/eslint/rewrite/tree/main/packages/migrate-config |
| Biome upgrade v2 | https://biomejs.dev/guides/upgrade-to-biome-v2/ |
| Biome migrate ESLint/Prettier | https://biomejs.dev/guides/migrate-eslint-prettier/ |
| Tailwind upgrade guide | https://tailwindcss.com/docs/upgrade-guide |
| Next.js codemods | https://nextjs.org/docs/app/guides/upgrading/codemods |
| React codemod repo | https://github.com/reactjs/react-codemod |
| jscodeshift | https://github.com/facebook/jscodeshift |
| Copier updating | https://copier.readthedocs.io/en/stable/updating/ |
| Release Please | https://github.com/googleapis/release-please |
| Changesets | https://github.com/changesets/changesets |
| Release automation comparison | https://oleksiipopov.com/blog/npm-release-automation/ |
| Node CLI best practices | https://github.com/lirantal/nodejs-cli-apps-best-practices |
| clig.dev | https://clig.dev/ |
| Martin Fowler on codemods | https://martinfowler.com/articles/codemods-api-refactoring.html |
| memory-atlas package / schema / config | `package.json`, `schema/atlas.config.schema.json`, `lib/config.mjs`, `docs/CONFIG.md`, `docs/LAUNCH-CHECKLIST.md` |
