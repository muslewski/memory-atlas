# M2 — memory-atlas adoption-path audit

Research date: 2026-07-17  
Role: repo analyst (read-only)  
Repo under audit: `~/Repositories/memory-atlas` @ `ade440e` (`main`)  
Also reviewed: unmerged branch `feat/reports-convention` (3 commits ahead of `main`)  
Out of scope: syndcast-mind `visuals/`

## Summary

- **Today’s greenfield path is a multi-step kit, not a single install.** `atlas init` only writes the vault skeleton + root `atlas.config.json`. Skills, CLAUDE.md/AGENTS.md blocks, SessionStart hooks, ctx-search adapter copy, CI, and zone seeding are all manual (`docs/ONRAMP.md` §§1–4).
- **Package is not installable as advertised.** README promises `$ npx memory-atlas init`; `npm view memory-atlas` returns E404; GitHub `muslewski/memory-atlas` does not exist yet (`docs/LAUNCH-CHECKLIST.md` steps 2–7 still open). Sibling `agentic-sage` is on npm@1.0.0 + GitHub (~1★); `token-oracle` is on GitHub (~0★) + PyPI.
- **Default vault name is `<repo>-atlas/`, not `atlas/`.** Code + README + SPEC agree; dogfood deliberately overrides with `--vault atlas` (`atlas/map/decisions/0003-vault-named-atlas.md`). `docs/LAUNCH-CHECKLIST.md` incorrectly claims the CLI default is `atlas/`.
- **Config is deep-merge tolerant and never fatal** — excellent for multi-repo local customization — but **re-init never updates an existing `atlas.config.json`** (`ensureFile` skip-if-exists). Enabling modules later requires re-running `atlas init --modules …` *and* hand-editing config if the file already exists.
- **There is no update / upgrade / migrate path.** No `atlas update`, no answers/state file, no versioned migrations, no skill re-vendoring. Convention improvements (e.g. `feat/reports-convention`) cannot be safely pushed to N adopting repos while preserving hand-made vault content and local config.
- **The real onboarding cost is zone seeding + recollection culture**, not directory creation. Init leaves an empty map; every card starts `seeded`/`unverified` by design; stamping needs an explicit slug + a real git HEAD.
- **`feat/reports-convention` is a clean, small optional-module PR** (config defaults + init scaffold + SPEC taxonomy + tests). It is the right shape for module growth — and the perfect stress-test of the missing update mechanism for already-inited repos.
- **Promise vs code gaps that will bite ×5 repos:** vault README points adopters at a non-shipped `SPEC.md`; `$schema` path assumes `node_modules/memory-atlas/…`; hooks use `npx --no-install atlas` (requires local bin); optional modules `reference`/`archive`/`drafts`/`backlog`/`reports` are scaffolded but not fully walked by `loadVault`; agent-onramp invariant untested (`atlas/tech-debt/agent-onramp-invariant-untested.md`).
- **Binary name `atlas` collides with MongoDB Atlas CLI** (~184★, [mongodb/mongodb-atlas-cli](https://github.com/mongodb/mongodb-atlas-cli)); package ships dual bin `atlas` + `memory-atlas` but README does not surface the collision.
- **For fleet maturity before open-source:** ship a real install path, collapse onboarding into one non-clobbering wire step (sibling pattern: sage `install.mjs`), then design an AI-driven “update to latest” with explicit ownership classes (toolkit / mergeable / user-owned) — see also sibling research `r5-template-update-mechanics.md` (Copier ~3.5k★, Cruft, projen, Nx migrate).

## Findings

### 1. Mental walkthrough — greenfield adoption today

Assume a brand-new empty app repo `acme-shop` with `git init` and at least one commit (stamp/check need HEAD / tracked files).

#### 1.1 Install (what the docs promise vs what works)

| Source | Promise | Reality (2026-07-17) |
|---|---|---|
| `README.md` Quickstart | `$ npx memory-atlas init` | Package name free but **unpublished** (`npm view memory-atlas` → E404). |
| `package.json` | `"name": "memory-atlas"`, bins `atlas` + `memory-atlas`, `files` includes bin/lib/templates/schema/skills/adapters/examples/docs/SPEC.md | Tarball would be ~66 kB / 46 files if packed (`npm pack --dry-run`); not on registry. |
| `docs/LAUNCH-CHECKLIST.md` | Create `muslewski/memory-atlas`, push, CI, publish | **Not done.** Local repo has **no `git remote`**, no `.github/workflows/`. `gh repo view muslewski/memory-atlas` → not found. |
| Practical path today | (undocumented for adopters) | Path/file install, e.g. `npm i -D ~/Repositories/memory-atlas` or `node /path/to/bin/atlas.mjs init`, or await publish. |

**Sibling contrast (published install maturity):**

| Project | Registry | GitHub | Install surface | Stars (approx, 2026-07-17) |
|---|---|---|---|---|
| [agentic-sage](https://github.com/muslewski/agentic-sage) | npm `agentic-sage@1.0.0` | public | `npm i -g` + `install.mjs` / `sage init` wires hooks+skills; upgrade note: “Nothing breaks after `npm update`” | ~1★ |
| [token-oracle](https://github.com/muslewski/token-oracle) | PyPI `token-oracle` (local tree 0.1.1) | public | `install.sh`, `uvx`/`npx`/`pipx` | ~0★ |
| **memory-atlas** | **none** | **none** | README `npx` only | n/a |
| [copier-org/copier](https://github.com/copier-org/copier) (prior art for updates) | PyPI | public | template lifecycle + `copier update` | ~3.5k★ (web) / 3471 (`gh repo view`) |
| [mongodb/mongodb-atlas-cli](https://github.com/mongodb/mongodb-atlas-cli) | brew/apt/choco | public | binary literally named `atlas` | ~184★ |

#### 1.2 `atlas init` — what lands

From `lib/init.mjs` + `test/init.test.mjs` (core skeleton matches SPEC.md §2):

**Created under vault** (default name `${basename(repoRoot)}-atlas` → `acme-shop-atlas/`):

| Path | Source |
|---|---|
| `map/zones/` | empty dir |
| `map/decisions/` | empty dir |
| `specs/`, `plans/`, `ideas/`, `tech-debt/` | empty dirs |
| `templates/` | 9 note scaffolds copied from package `templates/notes/*` with `{{DATE}}` substituted |
| `map/index.md` | GENERATED placeholder table (not a full validate render) |
| `README.md` | from `templates/vault/README.md` |

**Created at repo root:**

| Path | Notes |
|---|---|
| `atlas.config.json` | Full default shape from `templates/config/atlas.config.json`; `vaultDir` set to vault relpath; `$schema` → `./node_modules/memory-atlas/schema/atlas.config.schema.json` |

**Optional via `atlas init --modules a,b`:**

| Module | Scaffold action |
|---|---|
| `flows` | `map/flows/` |
| `programs` | `programs/` |
| `vision` | `vision/` |
| `reference` | `reference/` |
| `archive` | `archive/` |
| `backlog` | top-level `BACKLOG.md` (coordination template) |
| `drafts` | `drafts/` + README (excluded from retrieval by default) |
| `reports` | **only on `feat/reports-convention`** — `reports/` + README contract |

**Flags:** `--vault <name>`, `--dry-run`. Additive re-run: detects existing vault by structure (`lib/detect.mjs`), only creates missing paths; **never overwrites existing files**.

**What init does *not* create (all required for a working agent-facing Atlas):**

- CLAUDE.md / AGENTS.md on-ramp blocks (`docs/ONRAMP.md` §§1–2 — paste by hand)
- `.claude/settings.json` SessionStart hooks (`docs/ONRAMP.md` §3)
- Skills under `.claude/skills/` (`skills/atlas-nav`, `atlas-recollection`, `writing-for-retrieval` — copy or skill-path)
- `scripts/nav-refresh-index.mjs` (optional ctx-search adapter)
- Any zone cards
- CI workflow with `atlas check`
- A copy of `SPEC.md` inside the adopting repo (yet vault README says “See the repository's `SPEC.md`…”)

#### 1.3 Post-init human/agent work (the real path)

Order from `docs/ONRAMP.md` §4 + `docs/ADOPTION.md`:

1. **Seed 4–8 zone cards** under `map/zones/<slug>.md` from templates; keep `status: seeded`, `verifiedAt: unverified`.
2. Paste CLAUDE.md and/or AGENTS.md blocks (substitute real vault name).
3. Optionally copy ctx-search adapter + wire hooks.
4. Copy three skills or point agent skill search path at the package.
5. `atlas stamp <slug>` per reviewed card (requires git HEAD SHA).
6. `atlas build` / `atlas check`; later enable `--strict` / `check.strictFreshness`.
7. Add `atlas check` to CI.

#### 1.4 Day-to-day commands once live

| Command | Role | Key constraint |
|---|---|---|
| `atlas build` | regenerate `map/index.md` | needs git resolvers for anchors |
| `atlas check [--strict] [--report] [--ledger-only]` | verify zones + index drift + ledger enums | staleness advisory unless strict |
| `atlas stamp <slug...>` | `verifiedAt` → HEAD short SHA; `seeded`→`active` | **no `--all`**; refuses `unmounted` |
| `atlas status [--hook]` | one-line health | `--hook` honors `hooks.sessionStartStatus` |
| `atlas routine [name]` | print maintenance prompt | does not schedule/run itself |
| `enabled: false` | kill switch | silences all commands **except** `init` |

Discovery: vault by structure first (`map/index.md` or `map/zones/`), suffix fallback `-atlas`/`-mind`/`-brain` (`lib/detect.mjs`). CLI does **not** trust `vaultDir` for discovery (informational for companions only — `docs/CONFIG.md`).

---

### 2. Config customization model (what works well)

`lib/config.mjs` is the maturity highlight for multi-repo use:

- **Single defaults source** (`DEFAULTS` / folders / modules / anchors / hooks / routines).
- **Tolerant deep merge**: missing file, bad JSON, unknown keys, type mismatches → warn + default; never crash.
- **Folder remapping** honored by init (additive), notes, stamp, ledger, status, routine.
- **Per-hook toggles** and master `enabled` kill switch match the SessionStart fail-open contract (SPEC.md Interop).
- **Schema** `schema/atlas.config.schema.json` for editor autocomplete.
- Dogfood proves non-default vault name works: `atlas/` + `vaultDir: "atlas"` (`0003-vault-named-atlas.md`).

**Config seams that still hurt fleet onboarding:**

1. **First write wins forever for `atlas.config.json`.** Re-init with new `--modules` creates dirs (if CLI modules list includes them) but **skips rewriting config**, so `modules.X` can stay `false` while the directory exists — or the inverse if someone hand-sets `modules.reports: true` without creating the dir.
2. **`modules.*` is only half-wired into loaders.** `loadVault` (`lib/notes.mjs`) gates **flows / vision / programs** on module flags; **reference, archive, drafts, backlog, reports** are not first-class loaded modules (reports is Ledger-ish freeform; drafts intentionally excluded). Setting flags can feel like “enabling a feature” when it mostly means “init created a folder.”
3. **`retrieval.engine` defaults to `ctx-search`** while most brand-new repos may only have grep — informational only in v0.1, but misleading for adopters reading config.
4. **`$schema` path** breaks unless the package is installed under `node_modules/memory-atlas` (dogfood uses `./schema/...` instead).
5. **`skills.dir` default `.claude/skills`** — Claude-first; Grok/Codex adopters need manual path remap (CONFIG recipe exists, init does not offer it).

---

### 3. Promise vs code matrix

| Claim | Where claimed | Actual code / state | Severity |
|---|---|---|---|
| `npx memory-atlas init` works | `README.md` | Package unpublished | **Blocker** for any external/new-repo install |
| Default vault dir is `atlas/` | `docs/LAUNCH-CHECKLIST.md` §1 | Default is `${basename}-atlas` (`lib/init.mjs`); dogfood uses `--vault atlas` | High doc drift |
| Convention is `<repo>-atlas/` | SPEC.md, ONRAMP, README | Matches code default | OK (LAUNCH-CHECKLIST is the outlier) |
| Vault README: “See the repository's SPEC.md” | `templates/vault/README.md` | SPEC ships only inside the package / toolkit repo; **not copied into adopter vault** | Medium — adopters follow a dead pointer |
| Init scaffolds core skeleton | ONRAMP, README, CHANGELOG | Matches | OK |
| Skills install via copy or skill path | ONRAMP §4.5 | No CLI help; no symlink installer (unlike sage `install.mjs`) | Medium friction ×N repos |
| Hooks via paste into `.claude/settings.json` | ONRAMP §3 | Manual; `npx --no-install atlas` needs local install of bin | Medium |
| Additive re-init only creates missing | ADOPTION.md | True for files/dirs; **false expectation for “sync modules into config”** | Medium |
| `atlas check` in CI | ONRAMP, ADOPTION, CONTRIBUTING | No adopter CI template generated; toolkit itself has no `.github/` yet | Medium |
| Zero runtime deps | README badge, CONTRIBUTING | True (`package.json` deps empty) | OK / differentiator |
| Tests green | README “131 passing” | `node --test` suite present; counts across `test/*.mjs` consistent with mature unit coverage | OK |
| MongoDB `atlas` collision handled in README | LAUNCH-CHECKLIST only | Dual bin exists; **README install path silent on collision** | Medium for users with MongoDB CLI |
| Optional modules stay off by default | SPEC.md | True for init | OK |
| Full taxonomy verified by ledger | SPEC lifecycle enums | Ledger walks **specs/ + plans/** only (`lib/ledger.mjs`); not debt/idea/zone (zones validated elsewhere). `report` type not in `LIFECYCLES` (reports branch intentionally didn’t add it) | Low if understood |
| Agent-onramp paths stay in sync | zone `agent-onramp` invariant | **Untested** — open tech-debt note | Low now, high later |

---

### 4. Unmerged branch `feat/reports-convention`

```
cce6052 docs(spec): document reports/ optional module and report note type
6877cc7 feat(init): scaffold reports/ module with README stub
2ee09ce feat(config): add optional reports module defaults
```

**Diffstat vs `main`:** 8 files, +79/−2  
`SPEC.md`, `lib/config.mjs`, `lib/init.mjs`, `schema/atlas.config.schema.json`, `templates/config/atlas.config.json`, `test/config.test.mjs`, `test/init.test.mjs`, `test/integration.test.mjs`

**What it does**

- Adds `folders.reports: "reports"` and `modules.reports: false` to defaults / schema / init config template.
- `atlas init --modules reports` creates `reports/` + a frozen-snapshot README documenting:
  - filename `YYYY-MM-DD-<topic>.md`
  - frontmatter: `type: report`, `status: snapshot`, `summary`, `zones`, `covers`, dates
- SPEC optional layout + tenth taxonomy row (`report` | past | rear-view snapshot).
- Explicit commit note: **no frontmatter/validate type whitelist existed for reports, so none was extended** — consistent with ledger only linting specs/plans.
- Origin: syndcast-mind already has real `reports/` usage (e.g. `2026-07-09-advisor-plans-state-of-the-build.md` with the same frontmatter contract).

**What it does not do**

- No `templates/notes/report.md` scaffold for authors.
- No `loadVault` / index / ledger integration (reports remain freeform searchable markdown).
- No migration for existing vaults: an already-inited repo with `atlas.config.json` present will **not** get `modules.reports` or the folder unless someone re-runs `--modules reports` *and* hand-patches config (or deletes config — destructive).
- Does not touch ONRAMP/CONFIG docs (CONFIG’s module list will drift until docs are updated with the merge).

**Verdict:** merge-ready as a *convention + scaffold* slice; **unsafe as a fleet roll-out story** until an update path exists. It is exactly the kind of improvement that will land in the toolkit while five+ consumer repos stay frozen at pre-reports init.

---

### 5. Friction points ordered by pain (×5 new repos)

Pain assumes the owner wants five *usable* minds soon, not five empty directory trees, and later wants convention upgrades to propagate.

| # | Pain | Why it multiplies by 5 | Evidence |
|---|---|---|---|
| **P0** | **Not published / no real install story** | Every repo needs a bespoke path/file/git dependency; `npx memory-atlas` is a lie today; no GitHub for issues/PRs | npm E404; no remote; LAUNCH-CHECKLIST open |
| **P0** | **No update/propagate mechanism** | First week of five vaults freezes five snapshots of templates/skills/ONRAMP/config shape; `feat/reports-convention` and every future SPEC tweak become five manual merges | `ensureFile` skip-only; no migrate command; compare Copier/Cruft/Nx models in `r5-template-update-mechanics.md` |
| **P1** | **Onboarding is 6–7 manual steps** | Skills + instruction blocks + hooks + CI + adapter copy are copy-paste; high drift risk across repos | ONRAMP §4; contrast sage `install.mjs` non-clobbering wire |
| **P1** | **Zone seeding is untoolled heavy work** | Empty `map/zones/` after init; honest `seeded` rule forbids auto-promote; each repo needs real review time | SPEC seeded rule; stamp requires explicit slugs + HEAD |
| **P1** | **Re-init cannot evolve existing config** | Enabling modules later, adding new default keys (reports), or fixing `$schema` paths is hand-edit territory | `lib/init.mjs` `ensureFile` on config; modules flags only set when writing fresh config |
| **P2** | **Doc/code contradictions on vault naming** | Five repos may mix `atlas/` vs `<repo>-atlas/` vs LAUNCH-CHECKLIST “default is atlas/” | LAUNCH vs `lib/init.mjs` vs decision 0003 |
| **P2** | **Vault README / schema / hook paths assume toolkit layout** | Dead SPEC pointer; broken `$schema` without npm install; hooks fail if bin not on PATH | `templates/vault/README.md`, config template, ONRAMP hooks |
| **P2** | **`atlas` binary name collision** | Anyone with MongoDB Atlas CLI gets the wrong tool; silent confusion | mongodb-atlas-cli ~184★; dual bin undocumented in README |
| **P2** | **Claude-centric defaults** | Five repos that are Grok/Codex-first still need skill-dir + AGENTS.md path inventiveness | `skills.dir` default; skills content references Claude plugins |
| **P3** | **Optional modules half-semantics** | `modules.true` ≠ “loaded and verified”; reference/archive/reports not in loadVault gates | `lib/notes.mjs` vs MODULE_ACTIONS |
| **P3** | **Git hard dependency** | Brand-new repo before first commit: stamp fails; globs need tracked files | `lib/stamp.mjs`, `lib/resolvers.mjs` |
| **P3** | **Agent-onramp untested** | Skill/path drift between ONRAMP prose and shipped trees | tech-debt note + zone invariant empty `enforcedBy` |
| **P3** | **No adopter CI scaffold** | Easy to skip the only merge gate that keeps vaults honest | ONRAMP says “add to CI”; init doesn’t |

---

### 6. What is already strong (do not break)

These are assets for the open-source + multi-repo future:

1. **Honest freshness model** (`verifiedAt` + no blanket stamp) — the product differentiator.
2. **Structure-based vault discovery** — vault renames and non-default names work.
3. **Tolerant config merge** — local customization is safe by construction.
4. **Additive init** — won’t clobber hand-made notes/templates once present.
5. **Zero runtime dependencies** — easy to vendor / low supply-chain risk.
6. **Clear separation Map vs Ledger vs optional Vision** — SPEC is coherent.
7. **Dogfood vault + recollection ritual** already practiced in this repo.
8. **Sibling interop examples** (`examples/with-agentic-sage`, `with-token-oracle`, `solo`) prove file-contract-only coupling.
9. **`feat/reports-convention` discipline** (optional off-by-default module, README contract, tests, SPEC row) is a good template for future modules.

---

### 7. Adoption path for the five new repos (as of today, if forced)

Pragmatic sequence *without* mutating anything in this research pass:

1. Finish LAUNCH-CHECKLIST enough to publish `memory-atlas@0.1.0` **or** pin five repos to a git/path dependency on this tree.
2. Per repo: `git init` + first commit → `atlas init --vault atlas` (or `<repo>-atlas`) → choose modules (likely `drafts`, maybe `reports` once merged, maybe `backlog` if multi-session).
3. Manually paste ONRAMP CLAUDE.md/AGENTS.md with correct vault name.
4. Copy three skills into each repo’s agent skill dir (or one shared path if tooling allows).
5. Agent-draft zone cards from real tree; human-stamp after review; `atlas check` green.
6. Wire CI `atlas check` (non-strict first).
7. **Accept that step 6 is a frozen fork of convention** until an update mechanism exists — budget process for manual re-sync or delay multi-repo cutover until update design lands.

## Recommendations for memory-atlas

Prioritized for “mature NOW before five repos + later open-source.”

### R1 — Unblock install (P0, days)

1. Complete `docs/LAUNCH-CHECKLIST.md` steps 2–7: GitHub repo, remote, CI (`node --test`, biome, `node bin/atlas.mjs check`), npm publish `0.1.0`.
2. Fix README Quickstart to document **both** `npx memory-atlas` / `npx --package memory-atlas atlas` **and** the `memory-atlas` bin alias; call out MongoDB Atlas CLI PATH collision explicitly (not only in LAUNCH-CHECKLIST).
3. Until publish, document a temporary path/file install for the five internal repos so onboarding doesn’t invent five different workarounds.

### R2 — One-command onboarding wire (P1, small feature)

Add something in the spirit of sage’s `install.mjs` / token-oracle’s `statusline --install`:

- `atlas init` remains vault+config (pure data plane).
- New `atlas wire` (or `atlas init --wire`) **non-clobbering**:
  - ensure skills present under configured `skills.dir` (copy or symlink from package, skip-if-modified)
  - print or surgically inject ONRAMP blocks into CLAUDE.md/AGENTS.md (skip-if-section-present)
  - optional SessionStart hook lines (skip-if-command-present)
  - optional CI workflow stub
- Never overwrite hand-edited skills/hooks; abort on malformed settings JSON (sage pattern).

### R3 — Design and ship “update to latest” (P0 for fleet, design first)

Do **not** pretend Copier alone can own a hand-authored knowledge vault. Prefer a hybrid (aligns with `r5-template-update-mechanics.md`):

| Class | Examples | Update policy |
|---|---|---|
| **Toolkit-owned** | CLI package, `schema/`, check rules, default note templates *if never edited* | semver package bump; regenerated only if hash matches last toolkit write |
| **Mergeable** | CLAUDE.md atlas section, skill stubs, ONRAMP snippets, new optional module READMEs, new default config keys | 3-way / answers-file / AI merge; conflict markers OK |
| **User-owned** | zone cards, decisions, specs, plans, debt, reports content, local folder remaps, enabled flags | never auto-overwrite; migrations may *propose* |

Concrete v0.2-ish shape:

1. Record `atlas.config.json` → `toolkit.version` (or `.atlas-toolkit.json`) with last applied package version + content hashes for managed files.
2. `atlas update [--dry-run]` prints a plan: new modules available, template diffs, skill diffs, SPEC changelog excerpts.
3. Versioned **migrations** (Nx-style): e.g. “0.1→0.2 add folders.reports default; do not create dir unless modules.reports”.
4. **AI/skill-driven apply** for mergeable markdown: agent runs with the plan + local diffs; human reviews PR. CLI stays deterministic; agent is the soft merger.
5. Explicit **do-not-touch** globs for vault content (`map/zones/**`, etc.).

### R4 — Fix doc/code drift before five copies freeze it (P1, hours)

1. Correct LAUNCH-CHECKLIST vault default claim to match `lib/init.mjs` (`<repo>-atlas`, override via `--vault`).
2. Change vault README template: point to package docs / `npx memory-atlas` docs URL, not “the repository's SPEC.md”.
3. Ship a short `docs/ADOPTER-QUICKSTART.md` that is the single greenfield path (install → init → wire → seed → CI) without reading SPEC first.
4. Align CONFIG.md module list when merging reports.

### R5 — Merge `feat/reports-convention` with eyes open (P2)

- Merge after (or with) a note in CHANGELOG + CONFIG/ONRAMP module lists.
- Add `templates/notes/report.md` for authoring convenience (optional, small).
- Do **not** claim existing adopters auto-get `reports/` until R3 exists; document manual `atlas init --modules reports` + config flag edit as interim.

### R6 — Zone-seeding assistant (P1, later but high leverage)

Not auto-verify (SPEC forbids). Do offer:

- `atlas seed-zones --suggest` that proposes 4–8 zone skeletons from top-level tree / package.json workspaces / git path frequency, all still `seeded`/`unverified`.
- Optional agent skill “first atlas pass” that drafts cards for human stamp.

This is the difference between five empty vaults and five useful minds in week one.

### R7 — Harden agent-onramp (P3)

- Automated test that ONRAMP-named skills and adapter paths exist (closes open tech-debt).
- Consider packaging skills so `atlas wire` can re-sync them on update with hash check.

### R8 — Open-source readiness after R1–R3

- Banner/badges (LAUNCH-CHECKLIST).
- Adopter CI example in `examples/solo/`.
- Explicit VERSIONING / migration policy in SPEC (v0.2 candidates already listed — add “toolkit update protocol”).
- Keep zero-deps constraint; do not pull Copier in-process — reimplement thin update semantics or shell out optionally.

## Open questions

1. **Vault naming standard for the five new repos?** Force `atlas/` everywhere (short, dogfood-like) or `<repo>-atlas/` (SPEC convention, multi-vault monorepo-safe)? Decision freezes ONRAMP paste blocks and human muscle memory.
2. **Package distribution for internal fleet before public OSS?** npm public `memory-atlas`, private registry, or git submodule/subtree of the toolkit? Affects `$schema` paths and skill resolution.
3. **Who owns recollection in the five repos — humans, agents under review, or CI-enforced only?** Strict freshness timing depends on the answer; default advisory staleness may be too soft if agents ignore recollection.
4. **Is Claude the only first-class agent runtime for v0.1 wire?** If Grok/Codex matter equally, `atlas wire` must target multiple skill roots (`.claude/skills`, `.grok/skills`, `.agents/skills`) without assuming Claude settings.json alone.
5. **Should optional modules ever auto-scaffold on `modules.X: true` without CLI `--modules`?** Today flags and filesystem can diverge; pick one source of truth.
6. **Update executor: pure deterministic CLI vs AI skill vs hybrid?** Owner’s stated preference is AI/skill-driven “update to latest”; needs a hard boundary so agents cannot rewrite zone claims or flip `seeded`→`active`.
7. **Reports module semantics post-merge:** searchable freeform only, or eventually ledger-validated? syndcast treats them as frozen snapshots — keep that, or add light lint (`status: snapshot` only)?
8. **Cross-repo parent atlas** is SPEC non-goal for v0.1 — with five sibling product repos, does the owner want a thin “fleet map” later, or strictly isolated minds?
9. **MongoDB binary collision severity** in the owner’s environment — enough to demote primary bin to `memory-atlas` only?
10. **Timeline coupling:** merge reports before or after the five inits? Before freezes a better skeleton; after requires the missing update path immediately.

---

### Method (read-only)

- Read: `README.md`, `SPEC.md`, `CLAUDE.md`, `docs/{ONRAMP,ADOPTION,CONFIG,LAUNCH-CHECKLIST}.md`, `package.json`, `lib/{init,config,detect,notes,ledger,stamp,resolvers}.mjs`, `bin/atlas.mjs`, templates, skills, dogfood `atlas.config.json` + decision `0003`, tech-debt note.
- Git (read-only): `git log`/`diff` `main...feat/reports-convention`; `git remote -v`; no checkout of feature branch into working tree for edits.
- Registry/GitHub: `npm view memory-atlas` (E404); `npm view agentic-sage`; `gh repo view` for star counts; local sibling trees `agentic-sage`, `token-oracle`, `syndcast/syndcast-mind/reports`.
- Did **not** run installers, `atlas init` against real target repos, or any mutating git command.
- Complementary research in same directory: `r5-template-update-mechanics.md` (template update prior art).
