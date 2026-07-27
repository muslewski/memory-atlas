---
name: atlas-skin
description: Use when a human wants to read an Atlas vault note as a rich MDX digest instead of raw markdown — "skin this note", "make a visual view of this tech-debt/idea/program/spec". Renders a frozen, provenance-stamped MDX digest into the mirrored {vaultDir}/visuals/ tree for display in the Atlas Visuals gallery. Source markdown is never modified.
---

# Atlas Skin

Render an Atlas vault markdown note into a frozen MDX **digest** under
`{vaultDir}/visuals/` (or `config.visuals.dir` if set in `atlas.config.json`),
mirroring the source folder. The markdown stays the single source of truth; the
`.mdx` is a human-facing, regenerable render. Never edit the source note.

**Product:** [memory-atlas-visuals](https://www.npmjs.com/package/memory-atlas-visuals)
(Atlas Visuals). CLI: `pnpm exec atlas-visuals …` or `npx atlas-visuals …`.

Resolve paths from the consuming repo:

| Token | Source |
|-------|--------|
| `{vaultDir}` | `atlas.config.json` → vault dir (e.g. `atlas/`, `my-project-atlas/`) |
| `{visualsDir}` | `config.visuals.dir` if set, else `{vaultDir}/visuals` |
| `{appDir}` | `{visualsDir}/app` (Vite gallery app) |

## When to use

The user wants to *read* a dense note (tech-debt, idea, program, spec) with real
UI — status/severity at a glance, scannable sections, ledger/callout structure —
through the Atlas Visuals live gallery (`{appDir}/`).

## Procedure

Given a source path like `{vaultDir}/tech-debt/<slug>.md`:

1. **Compute provenance** (run from the repo root):
   ```bash
   VAULT=$(node -e "const c=require('./atlas.config.json'); console.log(c.vaultDir||c.vault||'atlas')")
   # or read vaultDir from atlas.config.json however the repo documents it
   SRC={vaultDir}/tech-debt/<slug>.md               # the source note
   REL=${SRC#${VAULT}/}                             # e.g. tech-debt/<slug>.md
   SKIN=default                                     # base/fallback tree (or a skin id for an override)
   OUT={visualsDir}/illustrated/$SKIN/${REL%.md}.mdx
   mkdir -p "$(dirname "$OUT")"
   COMMIT=$(git rev-parse --short HEAD)
   HASH=$(sha256sum "$SRC" | head -c 12)
   DATE=$(date +%F)
   echo "REL=$REL OUT=$OUT COMMIT=$COMMIT HASH=$HASH DATE=$DATE"
   ```

2. **Read the source** note + frontmatter. Identify: `type` (debt/idea/program/spec/plan),
   `status`, `title`, `summary`, and the body structure (headings, checkbox lists,
   `> [!…]` callouts, tables, code blocks). Also note any `hero` image hint in frontmatter.

3. **Fetch a hero image — try always; every digest prefers one.**
   `PIXABAY_API_KEY` is **optional** (env or project `.env` when present). Derive a
   2–4 word stock query from the note's topic (e.g. `"code architecture layers"` for
   a tech-debt note about abstraction), then run:
   ```bash
   pnpm exec atlas-visuals stock "<query>"
   # or from the app package:
   # pnpm --dir {appDir} stock "<query>"
   ```
   Parse the printed JSON line:
   - On success (`{"id":…,"file":"files/stocks/<id>.jpg",…}`): set the MDX frontmatter
     `hero: files/stocks/<id>.jpg` AND pass `hero={frontmatter.hero}` to `<Hero>` (both —
     the banner won't render without the prop). Optionally add `heroCredit: "<user>"`.
   - On `{"error":…}` (no API key, no network, no results) ONLY: fall back to an existing
     `files/stocks/*.jpg` and use it, or omit `hero` as a last resort. Do not skip the hero
     just because it's "optional" — a heroless digest is a visible gap. Never *fail the skin*
     over an image, but always *try* and prefer a hero.

4. **Author `$OUT`** — an MDX digest with YAML frontmatter + kit-component body.

   **Frontmatter** (all fields required; `hero` optional):
   ```yaml
   ---
   source: <REL>               # relative path inside {vaultDir}/
   hash: <HASH>                # sha256sum first-12-hex of source at render time
   commit: <COMMIT>            # git rev-parse --short HEAD
   generated: <DATE>           # YYYY-MM-DD
   title: <TITLE>              # from source frontmatter
   type: <TYPE>                # debt | idea | program | spec | plan
   status: <STATUS>            # from source frontmatter
   hero: files/stocks/<id>.jpg # preferred — from step 3 fetch; pass hero={frontmatter.hero} to <Hero>
   ---
   ```

   **Body** — compose kit primitives (imported from `@/kit`). For **which component to
   use per content shape, the per-origin playbooks, and immersion principles**, defer to
   the **`atlas-visuals-kit` skill** — that is the canonical composition guide. This skill
   covers provenance + file-emission only; the craft lives in `atlas-visuals-kit`.

   Minimal shell showing import + structure pattern:
   ```mdx
   import { Hero, Metrics, Section, Ledger, Callout, Prose, Diagram } from '@/kit'

   <Hero title={frontmatter.title} type={frontmatter.type} status={frontmatter.status}
         summary="…" source={frontmatter.source} commit={frontmatter.commit}
         generated={frontmatter.generated} hero={frontmatter.hero} />

   <Metrics items={[
     { label: "Severity", value: "…" },
     { label: "Effort",   value: "…" },
   ]} />

   <Section title="…" icon="database">
     <Diagram src="files/diagrams/<slug>.excalidraw" caption="…" />
     <Ledger items={[
       { done: false, title: "…", sub: "…" },
       { done: true,  title: "…" },
     ]} />
     <Prose>…prose content…</Prose>
   </Section>
   ```

   **Metrics rule:** values MUST come from real frontmatter or countable facts in the
   note body — never fabricate numbers.

   **Icons are default-on:** give every `<Card>` an `icon=`, every `<Section>` an `icon=`,
   and `<Metric>` an `icon=` where it sharpens meaning. Callouts auto-pick one. Pick names
   from the concept→icon map in the `atlas-visuals-kit` skill (any lucide kebab name;
   `pnpm exec atlas-visuals check:icons` catches typos).

4b. **Diagram — REQUIRED skill load (default-on, one per digest).**
   Do **not** invent a bare `.excalidraw` JSON by gut feel. **Load and follow the
   `excalidraw-diagrams` skill** before writing any scene under
   `{visualsDir}/files/diagrams/`. Then embed it:

   ```mdx
   <Diagram src="files/diagrams/<slug>.excalidraw" caption="…" maxHeight={520} />
   ```

   **Why this step exists:** skipping the skill produces empty-looking / thin trees
   (title + 3 boxes + arrow) that pass `check:diagrams` (labels present) but fail the
   human read — the defect that forced rewrites of design digests. Craft bar lives in
   `excalidraw-diagrams` (core claim of the note, not decoration; gate with
   `pnpm exec atlas-visuals check:diagrams` or `pnpm --dir {appDir} check:diagrams`).

   Skip a diagram ONLY when the note has no structure to draw (rare). Prefer one
   clarifying picture over stuffing every seam into the scene.

5. **Rebuild the gallery manifest** so the new digest appears in the gallery:
   ```bash
   pnpm exec atlas-visuals manifest
   # or: pnpm --dir {appDir} manifest
   ```
   `src/gallery/manifest.json` + `src/notes/notes-manifest.json` are **gitignored build
   output** — rebuild them, never stage them. `pnpm dev|build|test` regenerate them first,
   so a fresh clone needs no manifest step. Commit only the `.mdx` digest and its assets.

## Freshness & re-skinning

A digest is a **frozen snapshot**: its frontmatter `hash` is `sha256sum` of the source bytes at
render time. When the source note later changes, the digest is *stale* — the rendering no longer
matches the note. This is detected cheaply (hash compare, never a content diff):

```bash
pnpm exec atlas-visuals check:stale            # human report; exit 1 if anything is stale/missing
pnpm exec atlas-visuals check:stale --json     # machine list (route/source/storedHash/currentHash)
# or: pnpm --dir {appDir} check:stale
```

The gallery card + the Snapshot provenance strip both show the chip (`fresh` / `stale · source
changed` / `source missing`) and the snapshot date, so a reader always knows how current a visual is.

**To re-skin a stale digest:** re-run the Procedure above on the *same* source path. It regenerates
`$OUT` from scratch (not a patch) and **re-stamps `hash` + `commit` + `generated`** to HEAD, which
flips it back to `fresh`. Then rebuild the manifest (step 5). Nothing auto-regenerates; staleness is
surfaced, and a human or the recollection step decides to re-skin.

## Viewing

```bash
cd {appDir}
pnpm install   # first time only
pnpm dev       # live gallery — picks up new digests (manifest + external glob watch)
# production-shaped (rebuilds first — stale vite preview was a deep-link footgun):
pnpm preview   # default port per package docs, host 0.0.0.0
```

**Canonical share URL** (one note, one URL — Atlas / memory-atlas contract):

```text
/note/<vault-rel without .md>
# e.g. /note/specs/2026-07-27-project-multi-timeline-mvp-design
```

Legacy illustrated paths (`/specs/<slug>`) redirect to that when the **built** notes-manifest
knows the note. Prefer printing `/note/…` in agent replies.

When the agent host is remote from the browser machine, print Mac-reachable (or LAN/Tailscale)
preview URLs — never bare `127.0.0.1` alone as the only share link.

The gallery renders every `.mdx` digest live across all skins. Switch skins via the
skin-switcher in the gallery header.

## Single vs many content (config-driven)

**All digest content lives under `{visualsDir}/illustrated/<skin>/<origin>/<slug>.mdx`.** The
`default` tree is the base/fallback content; other skin ids are per-skin overrides.
`{appDir}/visuals.config.ts` decides whether a note has ONE digest or one PER SKIN:

- **single** (`content.mode: 'single'`) — author one digest at
  `illustrated/default/<origin>/<slug>.mdx`; every skin repaints the same content. Derive it
  with the config's `prompts.base` voice. Fewer tokens.
- **many** (`content.mode: 'many'`) — the `default` tree is still the base; you MAY ALSO author
  per-skin overrides at `illustrated/<skin>/<origin>/<slug>.mdx`. The runtime resolves the active
  skin's override and **falls back to `illustrated/default/<origin>/<slug>.mdx`** when none exists,
  so you only write the overrides worth re-voicing. Derive each with that skin's
  `prompts.perSkin[skin]` voice. Keep frontmatter identical to the default (same
  `source`/`hash`/`commit`/`generated`/`hero`) so provenance matches; only the `default` tree is
  the gallery entry (the manifest scans `illustrated/default/` and ignores the override trees).
  New override files need a dev-server restart (eager glob).

**Diagram is shared across skins (don't drop it).** If the `default` digest has a
`<Diagram>`, every per-skin override MUST re-include the **same one-line `<Diagram src>`**
(Excalidraw scenes are skin-agnostic — point at the SAME `files/diagrams/…` file; the
caption may be re-voiced). The build guard `check:illustrated` FAILS an override that drops a
diagram its default has. To give one skin a unique diagram, point its `<Diagram src>` at a
different scene; to allow per-skin/absent diagrams globally, set `content.shareDiagram:false`
in `visuals.config.ts`.

Read the voices from `visuals.config.ts` before authoring — they are the single source of
truth for tone; don't invent one.

## Rules

- **Never write a `.md` file into `{visualsDir}/`** — only `.mdx` digests (plus app source under
  `app/`, and binary/diagram assets under `files/`). The Ouroboros lint gate enforces this;
  breaking it corrupts the corpus.
- **Never modify the source note** — the `.md` is the single source of truth.
- **Don't hand-wire cross-visual nav.** The Connections panel is derived from the source note's
  `[[wikilinks]]` at manifest build. Keep `[[]]` in the source `.md`; do not invent `related`
  hrefs as the nav mechanism. For **inline body links**, use `<NoteLink to="slug">` (see the
  `atlas-visuals-kit` skill) — it resolves only against the source's `[[]]`, so the source must
  `[[]]`-link the target first. Never invent an edge in the digest.
- **Literal `{` is MDX expression syntax.** Any `{…}` in prose/inline-code is parsed as JS; a
  non-expression like `{type:'video'}` crashes the whole digest ("Could not parse expression with
  acorn") and only surfaces when a reader opens that route. Keep brace-containing code in a
  **single-line inline-code span** (`` `addTrack({ type: 'video' })` ``) — never let a code span
  wrap across a newline, and never leave a raw `{` in flowing text (wrap in backticks or escape
  `\{`). `pnpm exec atlas-visuals check:illustrated` compiles every digest and fails on this
  before it ships.
- **Metrics MUST use real frontmatter values** — never fabricate data.
- **`hash` MUST be `sha256sum "$SRC" | head -c 12`** so the gallery's freshness check matches.
- Re-run the skill to refresh a stale digest (see **Freshness & re-skinning**); re-stamp
  `hash`/`commit`/`generated`. Staleness is detected by `pnpm exec atlas-visuals check:stale`,
  not auto-regenerated.
- Composition craft (which kit primitive, per-origin playbooks, immersion rules) → see
  the **`atlas-visuals-kit` skill**.
