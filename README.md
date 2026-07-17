# memory-atlas

*A per-repo knowledge atlas for agent fleets — verified architecture cards with an honest freshness signal.*

![tests](https://img.shields.io/badge/tests-131%20passing-brightgreen)
![node](https://img.shields.io/badge/node-%3E%3D20-blue)
![license](https://img.shields.io/badge/license-MIT-blue)
![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)

Most agent-memory tools persist what the agent *believed*. An Atlas records
what was **verified** — and tells you when.

- **A vault, not a database.** An Atlas is a per-repository,
  Obsidian-compatible directory of plain markdown + YAML frontmatter — no
  proprietary format, greppable by any tool, openable in any editor.
- **Map (present tense) and Ledger (past tense), kept separate.** Zone cards
  describe what the code *is* right now; decisions, specs, and plans record
  what was *decided* and why, frozen once written.
- **Code-verified anchors, not prose claims.** A zone card's `owns.globs`
  are checked against `git ls-files` — a claim that matches zero tracked
  files is a hard error, not a stale sentence nobody notices.
- **Honest freshness.** Every zone carries `verifiedAt`: either the literal
  string `unverified`, or the commit SHA a human last confirmed it against.
  Staleness is computed from git history, not guessed.
- **A generated index, never hand-edited.** `atlas build` regenerates
  `map/index.md` — one command turns zone cards into a single map with a
  verification-gaps section, so drift is visible instead of assumed away.

## Quickstart

```
$ npx memory-atlas init
created: my-repo-atlas/map/zones/
created: my-repo-atlas/map/decisions/
created: my-repo-atlas/specs/
created: my-repo-atlas/plans/
created: my-repo-atlas/ideas/
created: my-repo-atlas/tech-debt/
created: my-repo-atlas/templates/
created: my-repo-atlas/README.md
created: my-repo-atlas/map/index.md
created: my-repo-atlas/templates/zone.md
...  (one file per note type)
created: atlas.config.json

Next steps:
  - Seed 4-8 zone cards, one per coherent subsystem, under map/zones/.
  - Keep status: seeded + verifiedAt: unverified until a human verifies each card.
  - Add a short CLAUDE.md/AGENTS.md on-ramp block pointing agents at map/index.md.
  - Run `atlas stamp <slug>` once a card is reviewed, then `atlas build` / `atlas check`.
```

Write those first zone cards (by hand, or agent-drafted from a fresh reading
of the code — either way they start `status: seeded` / `verifiedAt:
unverified` until reviewed), then run `atlas wire` (see
[`docs/ONRAMP.md`](docs/ONRAMP.md)) so SessionStart hooks and managed
CLAUDE.md/AGENTS.md on-ramp blocks point agents at the vault before they
explore code directly. Once a card or two exist:

```
$ atlas check
atlas check: ok
```

Exit `0` means every zone's claims resolved against the tree, the committed
index matches what `atlas build` would regenerate, and the ledger's
frontmatter is in shape. Wire `atlas check` into CI once there's more than a
card or two (`docs/ONRAMP.md` §4 and `docs/ADOPTION.md` walk through both the
greenfield and brownfield paths).

## How it works

A trimmed real zone card — this project's own dogfood vault describes its
CLI this way (`atlas/map/zones/cli.md`):

```yaml
---
type: zone
summary: "The atlas command-line entry point: bin/atlas.mjs's dispatch table plus the four subcommand implementations it delegates to (init, stamp, status, routine)."
status: active
verifiedAt: 705fbdc8
owns:
  globs:
    - "bin/**"
    - "lib/init.mjs"
    - "lib/stamp.mjs"
    - "lib/status.mjs"
    - "lib/routine.mjs"
depends:
  - [[verifier-core]]
  - [[vault-io]]
  - [[config]]
---
```

That `owns.globs` list, and everything else a zone card can claim, is checked
by one of a small set of anchors:

| Anchor | Checked by | Severity |
|---|---|---|
| `owns.globs` | `git ls-files` — at least one tracked file must match | hard error, required |
| `owns.testids` / `owns.tools` | grep for a configured id under a configured root | hard error, optional & config-declared |
| `owns.routes` | match against configured route-file globs | soft warning, optional & config-declared |
| `verifiedAt` | `git diff <sha>..HEAD` over the zone's `owns.globs` | freshness — warning by default; hard failure only with `check.strictFreshness: true` |
| `invariants[].enforcedBy` | flagged when the list is empty | soft warning ("file tech-debt") |

The freshness model in short: every zone's `verifiedAt` is either the literal
string `unverified` (while `status: seeded`) or a commit SHA (while `status:
active`) naming the last commit a human — or a supervised agent — confirmed
its claims against the code. `atlas check` diffs that SHA against `HEAD`
over the zone's owned globs; any touched file is reported as stale.
Staleness is advisory by default (it shows up in the generated index and as a
warning; it does not fail the build) — including under `atlas check --strict`.
Only `check.strictFreshness: true` in `atlas.config.json` turns staleness into
a hard failure, so a team can adopt gradually and only start blocking merges
once the stale count is near zero. Structural, ownership, lifecycle, and
(when enabled) corpus violations are always hard errors.
Re-stamping (`atlas stamp <slug...>`) always requires explicit zone slugs —
there is no "stamp everything" shortcut — so a card only becomes fresh again
when someone actually reviewed it.

## What it is not

- **Not automatic memory capture.** Nothing mines your session transcripts
  or conversation logs; a zone card is written and verified deliberately.
- **Not a spec generator.** The Ledger accepts specs and plans from any
  producing workflow — it doesn't write them for you.
- **Not an indexer.** Bring your own retrieval; reference adapters ship for
  context-mode's `ctx_search`, Obsidian's official agent skills, and plain
  grep always works with zero setup.
- **No visuals here.** A presentation or dashboard layer over an Atlas is
  explicitly a separate concern — this package is the data plane only.

## Works with

**Spec/plan producers.** The Ledger's file naming, frontmatter, and
lifecycle statuses are a convention, not a tool lock-in — any spec- or
plan-writing workflow can target `specs/`/`plans/` directly, or land there
during recollection. See `SPEC.md`'s Interop section for concrete examples
(obra/superpowers, github/spec-kit, get-shit-done/GSD) — none are required.

**Retrieval.** The vault is plain markdown, so any search tool works. Two
reference adapters ship in this package: [`adapters/ctx-search/`](adapters/ctx-search/README.md)
(FTS5-based, for repos using the context-mode MCP plugin) and
[`adapters/obsidian-skills/`](adapters/obsidian-skills/README.md) (for
Obsidian-native navigation). Plain `grep`/`rg` is the zero-install floor that
always works.

**Sibling family.** memory-atlas is one of four loosely coupled,
independently published tools sharing a temporal frame — none require each
other, and none share code, only file contracts and structure detection:

| Project | Era | Role |
|---|---|---|
| token-oracle | the future | token-cap forecasting |
| agentic-sage | the present | fleet judge |
| status-herald | the voice | status-bar UI |
| **memory-atlas** | **the past** | **the repository's verified memory (this project)** |

See [`examples/`](examples/README.md) for two proof-of-coupling adapters
(`with-agentic-sage/`, `with-token-oracle/`) and a `solo/` baseline showing
everything still works with zero siblings installed.

## Comparison

By category, not by naming names:

| Category | What it persists | What's missing | Unique to an Atlas |
|---|---|---|---|
| Memory-capture tools (mine session/conversation logs) | What the agent said or believed happened | No check against the code itself | `verifiedAt` ties every claim to a commit, not a transcript |
| Spec-process tools (phase folders, plan/task docs) | Process artifacts — specs, plans, tasks | No standing model of the code's current shape | The Map is present-tense and re-checked continuously, not archived once written |
| Doc generators (API docs, dependency graphs) | Structure extracted automatically from the code | No decision history, no verification signal | `status: seeded` vs `active` distinguishes a machine guess from a reviewed claim |

The recollection ritual — updating and re-stamping a zone card as part of
finishing a change, not a separate pass — is what keeps `verifiedAt` honest
across all three rows above.

## Commands

| Command | Purpose |
|---|---|
| `atlas init` | Scaffold a vault + `atlas.config.json` + `.atlas-state.json` |
| `atlas build` | Regenerate `map/index.md` from zone/flow cards |
| `atlas check` | Verify claims, committed index, and ledger (CI-friendly) |
| `atlas stamp <slug…>` | Re-stamp reviewed zones (explicit slugs only) |
| `atlas status [--hook]` | One-line vault health; safe as a SessionStart hook |
| `atlas wire [claude\|grok\|all]` | SessionStart hooks + managed CLAUDE.md/AGENTS.md on-ramp blocks + vendor skills |
| `atlas doctor` | Dry-run inventory of provenance lockfile, wiring, and on-ramp blocks |
| `atlas migrate [--write]` | Apply pending versioned migrations (dry-run by default) |
| `atlas routine [name]` | Print a maintenance-routine prompt |

### Update flow

When a newer memory-atlas is installed, the loop is:

1. **Nudge** — `atlas status` prints when installed version ≠ wired
   `atlasVersion`.
2. **Inventory** — `atlas doctor` shows version drift, pending migrations,
   and any locally edited vendored files.
3. **Deterministic migrate** — `atlas migrate` (dry-run), then
   `atlas migrate --write`.
4. **AI merge** — run the **`atlas-update`** skill for judgment merges of
   `⚠ locally edited` blocks/skills, then re-wire and re-check.

## Docs

- [`SPEC.md`](SPEC.md) — the normative convention: vault layout, note
  taxonomy, lifecycles, anchors, the freshness rule, interop contracts.
- [`docs/CONFIG.md`](docs/CONFIG.md) — the full `atlas.config.json`
  reference.
- [`docs/ONRAMP.md`](docs/ONRAMP.md) — adopt via `atlas wire`: managed
  CLAUDE.md/AGENTS.md blocks, dual-CLI hooks, install flow.
- [`docs/ADOPTION.md`](docs/ADOPTION.md) — migrating an existing,
  non-greenfield repo into the convention.

This repo eats its own cooking: see [`atlas/`](atlas/map/index.md) for this
project's own Atlas, built with the same CLI documented above.

---

<sub>Footnote, not headline copy: ATLAS also unpacks to <strong>Agentic
Terrain &amp; Lore Archive System</strong>, if you like backronyms.</sub>
