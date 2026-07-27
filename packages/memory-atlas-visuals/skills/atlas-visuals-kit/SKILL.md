---
name: atlas-visuals-kit
description: >
  Use when authoring or reviewing an Atlas Visuals MDX digest — "skin a note", "author an MDX digest",
  "which primitive should I use", "immersive visual for this spec/idea/tech-debt/program", or when
  extending the React/MDX primitive kit with a novel content shape. Covers the kit catalog,
  per-origin composition playbooks, immersion principles, kit extension convention, and the
  MDX file contract.
---

# atlas-visuals-kit

Authoring/discovery layer for the Atlas Visuals React/MDX kit (package
**memory-atlas-visuals**). An agent composing an MDX digest picks primitives from the kit
catalog below, follows the per-origin playbook for the note type, applies the immersion
principles, and places the `.mdx` file at the correct path. Never designs from scratch —
compose from the catalog; extend only when a genuinely novel content shape appears.

Resolve paths from the consuming repo:

| Token | Source |
|-------|--------|
| `{vaultDir}` | `atlas.config.json` → vault dir |
| `{visualsDir}` | `config.visuals.dir` if set, else `{vaultDir}/visuals` |
| `{appDir}` | `{visualsDir}/app` |

The living source of truth is `{appDir}/kit-catalog.json` + the components in
`{appDir}/src/kit/`. The `KIT.md` file in this skill dir is a human-readable table derived
from that JSON. CLI: `pnpm exec atlas-visuals …` or `npx atlas-visuals …`.

---

## Config awareness (`visuals.config.ts`)

The whole gallery is driven by `{appDir}/visuals.config.ts` (typed via `defineVisuals()`).
Two things matter when authoring:

- **single vs many** — `content.mode`. In **many** a note can have per-skin overrides at
  `illustrated/<skin>/<origin>/<slug>.mdx` that the runtime resolves (active skin → override,
  else `illustrated/default/`). Re-voice each with `prompts.perSkin[skin]`; keep frontmatter
  identical to default. A skin reuses default content (restyle-only) by omitting its override.
  The `atlas-skin` skill owns this authoring flow.
- **shared diagram** — `content.shareDiagram` (default true). The note's `<Diagram>` shows in
  EVERY skin: a per-skin override must re-include the same one-line `<Diagram src>` (same scene
  file — skin-agnostic), enforced by `check:illustrated`. Never drop the diagram when re-voicing.
- **toggles** — `motion.{gsap,framer}` and `features.{hero,diagram}` may be OFF in a consuming
  project. Author so a digest still reads well statically: don't rely on a Diagram or a Hero
  banner to carry meaning that isn't also in the prose; motion is enhancement, never the only
  signal. (Disabling motion reuses the reduced-motion floor, so primitives stay visible.)

---

## The kit catalog

Primitives across 5 categories. Full reference: `KIT.md` beside this skill.
The generated `{appDir}/kit-catalog.json` is the source of truth — regenerate with
`pnpm exec atlas-visuals catalog` (or `pnpm --dir {appDir} catalog`).

> **shadcn Typeset owns all bare-element prose.** The kit no longer has element overrides:
> headings, paragraphs, lists, tables, code, blockquotes, `details`/`summary`, `kbd`, `dl` and
> GFM task lists are all styled by `.typeset`. **Never style a heading, list or table in a
> digest** — write plain markdown inside the primitives and Typeset handles it.

### Typography (6)

| Primitive | Use when |
|-----------|----------|
| **Hero** | Every digest opens here — clamp H1 + hook sentence + optional eyebrow |
| **Section** | Named block with optional fractional marker ("02 / 07") for StickyTOC anchoring; takes an `icon=` to anchor the header |
| **Prose** | Wraps free-form body; applies `--skin-measure` (~70ch) + vertical rhythm |
| **PullQuote** | Surfaces a memorable phrase with display-font typographic weight |
| **DropCap** | Editorial drop-capital on the first paragraph of long-form openers |
| **Divider** | Full-width rule between blocks; optional centred label |

### Data (11)

| Primitive | Use when |
|-----------|----------|
| **Callout** | Inline aside — variants: `key-insight` / `pitfall` / `in-practice` / `warn` / `info`. Each carries a **default gutter icon** (overridable via `icon=`) |
| **Card** / **Cards** | Scannable grid of related facets, options, or concepts. **Give every Card an `icon=`** (accent tile) — a grid of iconed cards is the highest-immersion shape in the kit |
| **Chip** | Inline status/classification badge (`done` / `risk` / …) |
| **CodeBlock** | Multi-line snippet with language label + one-click clipboard copy |
| **Gist** | Distilled key-points list under a bulb icon; 3–5 bullets |
| **Ledger** / **Row** | Tracked items with `done`/`risk` icons; Row carries `title` + optional `sub` |
| **Metric** / **Metrics** | Large-numeral stat row (counts, percentages, durations); each `Metric` takes an `icon=` |
| **Timeline** | Vertical dotted-spine sequence of events or milestones |

### Orientation (4)

| Primitive | Use when |
|-----------|----------|
| **ReadingProgress** | Mount once at the top of any long-form digest |
| **StickyTOC** | Persistent sidebar with active-highlighted section links; auto-derives from Section ids |
| **Concept** | Marks a defined term inline; `id` prop enables deep-linking |
| **Diagram** | Note explains a flow/sequence/architecture — embed an Excalidraw scene (`<Diagram src="files/diagrams/x.excalidraw" />`). Default-on (one per digest); fixed hand-drawn palette on a light plate. Has an expand → **fullscreen modal with native zoom/pan**, so draw freely; the reader zooms. **Author via the `excalidraw-diagrams` skill** (Excalidraw MCP → `files/diagrams/`). |

### Motion (6)

| Primitive | Use when | Engine |
|-----------|----------|--------|
| **Reveal** | Fade a heading, image, or section block into view on scroll | framer |
| **Stagger** | Cascade a list of sibling cards or bullets into view one after another | framer |
| **Parallax** | Subtle scroll-driven depth on a hero image or decorative panel | framer |
| **SplitReveal** | Reveal a short headline/emphasis line word-by-word on enter (or `Section animateTitle`) | GSAP |
| **ScrollScene** | Wrap a section to reveal it on enter (`effect`: fade-through/scale-in/pan). Plays once by default; `scrub`/`pin` opt into a scroll-linked scene | GSAP |
| **Counter** | Count a number up from 0 on enter (or `Metric count`); keeps prefix/suffix | GSAP |

### Structure (5)

| Primitive | Use when |
|-----------|----------|
| **Icon** | Inline glyph — **any lucide icon, kebab-case** (`<Icon name="git-branch" />`); recolours per skin via `currentColor`, never hardcode a colour. Legacy names still resolve; `pnpm exec atlas-visuals check:icons` catches typos. |
| **More** | Collapsible supplementary detail most readers can skip (Radix Collapsible) |
| **NoteLink** | A body mention references another note — make it navigable inline (text link or `variant="button"` CTA). **Resolves ONLY against the source `.md`'s own `[[]]` connections** — see "Inline note-links" below. |
| **ReadingMode** | Mount once in the shell for Skim/Deep toggle; mark detail with `data-reading-detail` |
| **Takeaways** | Completion ritual at the end of every digest; `related` prop links sibling notes |

---

## Inline note-links (`<NoteLink>`) — body-level nav, vault owns the edges

The footer Connections panel auto-lists every note this one links to. To make a **prose mention**
inside the body navigable, use `<NoteLink to="slug">…</NoteLink>` (or `variant="button"` for a
"View more →" CTA).

**The law (do not break it): visuals never compute connections.** `<NoteLink>` resolves **only**
against the note's own `outbound[]`, i.e. links the **source `.md` already declared with `[[]]`**.
So the rule is:

1. To inline-link note X, the **source `.md` must `[[X]]`-link it first** (the same `[[]]` that
   feeds the vault build / outbound nav). If you want a body link but the source doesn't connect
   there, add the `[[]]` to the source note — never invent the edge in the digest.
2. `to=` is the target's **bare slug** as it appears in the `[[]]` (drop `|alias`, `#heading`,
   `^block` — the component strips them; a date prefix is matched insensitively).
3. If `to=` is not a declared connection, `<NoteLink>` renders the children as **plain text** (no
   link) and warns in dev — the ownership guard is structural, not advisory.

```mdx
<Card h="✅ Feature v1" icon="sparkles">
  …summary… <NoteLink to="2026-06-23-feature-v1-design" variant="button">View →</NoteLink>
</Card>
```

Keep `variant="button"` labels **short** ("View →", "Open spec →") — the pill is
ellipsis-capped (~18ch). For a long, descriptive link use the default inline variant.

---

## Data primitives — children (canonical) or `items=` (NEVER leave empty)

`Metrics` · `Gist` · `Ledger` · `Timeline` · `Takeaways` take **children**. Each
ALSO accepts a forgiving `items=` prop that renders identically — so both shapes
below work. **Never emit a self-closing data primitive with no `items=`, and
never an empty `<Comp></Comp>`** — both render blank. `pnpm exec atlas-visuals
check:illustrated` fails the build if you do. Exact JSX (copied from working digests):

```mdx
<!-- Metrics -->
<Metrics>
  <Metric label="Threads" value="5" />
  <Metric label="Shipped" value="2" />
</Metrics>
<Metrics items={[{ label: 'Threads', value: '5' }, { label: 'Shipped', value: '2' }]} />

<!-- Gist: children = a <ul> of points; items = the points -->
<Gist>
  <ul>
    <li>First key point.</li>
    <li>Second key point.</li>
  </ul>
</Gist>
<Gist items={['First key point.', 'Second key point.']} />

<!-- Ledger: <Row done|risk title sub /> -->
<Ledger>
  <Row done title="Shipped" sub="Merged 2026-06-20" />
  <Row title="Next up" />
</Ledger>
<Ledger items={[{ done: true, title: 'Shipped', sub: 'Merged 2026-06-20' }, { title: 'Next up' }]} />

<!-- Timeline: bare <li> nodes -->
<Timeline>
  <li>Spec written</li>
  <li>Plan approved</li>
</Timeline>
<Timeline items={['Spec written', 'Plan approved']} />

<!-- Takeaways: <li> points + related links ({href,title} or bare string) -->
<Takeaways related={[{ href: '/programs', title: 'More programs' }]}>
  <li>Manual path is production-proven.</li>
  <li>Thread 4 is the governance gap.</li>
</Takeaways>
```

**CodeBlock** is syntax-highlighted (highlight.js, fixed dark panel across all
skins) — pass `lang` (`tsx`/`ts`/`js`/`bash`/`json`/`css`) for correct colours.
It needs the **full content width: NEVER put a `<CodeBlock>` inside `<Cards>`**
(narrow multi-column cells clip the code). Stack code blocks at the top level of
a Section with a `<Prose><strong>label</strong></Prose>` above each.
`pnpm exec atlas-visuals check:illustrated` fails the build on a CodeBlock nested
in Cards.

---

## Icons — pick fast, pick valid

`<Icon>`, `Card.icon`, `Section.icon`, `Metric.icon`, and the `Callout` defaults all take
**any lucide name in kebab-case** (the full ~1600-icon set, lazy-loaded). The icon inherits the
skin colour via `currentColor` — never set a colour. `pnpm exec atlas-visuals check:icons`
fails the build on an unknown name, so the only rule is: **use a real lucide name.** When unsure,
pick the closest match from this concept→icon map (all verified valid) rather than inventing one:

| Concept | Icon |
|---|---|
| auth / security / permissions | `shield` `shield-check` `lock` `key` |
| billing / credits / money | `credit-card` `coins` `dollar-sign` |
| data / DB / schema / rows | `database` `table` `layers` |
| pipeline / flow / orchestration | `workflow` `route` `git-branch` `split` `merge` |
| agents / AI / automation | `bot` `brain` `sparkles` `wand-2` |
| code / build / compile | `code` `code-xml` `file-code` `terminal` `package` |
| blocks / components / modules | `blocks` `box` `boxes` `component` `puzzle` |
| media (video/image/audio/voice) | `video` `image` `music` `mic` `volume-2` |
| render / playback | `film` `play` `monitor-play` |
| storage / upload / files | `hard-drive` `cloud` `upload` `download` `folder` `files` |
| status: done / open / risk / time | `circle-check` `circle` `triangle-alert` `clock` `timer` |
| governance / rules / decisions | `gavel` `scale` `shield-check` `list-checks` |
| tests / verify / inspect | `microscope` `flask-conical` `bug` `list-checks` |
| metrics / growth / activity | `trending-up` `chart-bar` `gauge` `activity` |
| ideas / insight / problems | `lightbulb` `sparkles` `triangle-alert` |
| users / teams / channels | `users` `user` `users-round` |
| nav / links | `arrow-right` `chevron-right` `external-link` `link` |
| structure / layout / map | `layout` `panels-top-left` `map` `compass` `network` |
| history / undo / refresh | `history` `undo-2` `refresh-cw` `repeat` `archive` |

Legacy kit names (`bulb`, `alert-triangle`, …) still resolve via `icon-aliases.json`. Add a new
alias there only for a name the kit used historically — prefer the real lucide name in new digests.

## Hero hook — never ship a headline alone

`<Hero>` needs a 1–2 sentence stakes line. The canonical prop is `hook`; `summary` is a forgiving
alias (renders identically — both exist because agents reach for both). Pass exactly one. Write the
hook as the **bet/stakes**, not a description: what changes if this lands, in the note's own voice.
`<Hero>` also accepts and ignores the frontmatter passthrough (`source`/`commit`/`generated`/`type`/
`status`) — those render in the provenance strip, not the hero, so passing them is harmless.

## Cinematic motion (GSAP)

framer-motion covers the basics (Reveal/Stagger/Parallax — cheap, auto reduced-motion-safe).
GSAP owns the cinematic layer. Dividing line:

- **framer** = simple in-view fade / stagger / parallax.
- **GSAP** = headline split-reveals, scrubbed/pinned scroll scenes, entrance timelines, count-ups.

Rules (binding):

- **All GSAP goes through `useKitGsap`** (`src/kit/gsap/`) — it bakes in the reduced-motion gate
  (`gsap.matchMedia`) AND cleanup (useGSAP scope; survives SPA nav). Never call `gsap` /
  `ScrollTrigger` directly in a primitive.
- Animate **transform / opacity / clip / scroll only** — never colour/border/shadow/font (tokens
  own those). Set the hidden START state inside the gsap fn, never in CSS (so reduced-motion leaves
  it visible).
- Tuning lives in **`motion-profile.ts`** (the v2 per-skin-personality seam) — read from `MOTION`,
  never inline magic numbers.
- For GSAP idioms (useGSAP cleanup, ScrollTrigger, SplitText, timelines, performance) see any
  vendored **`gsap-*` skills** in the host agent environment when present.

Use in digests (motion is seasoning — don't over-animate):

- Hero entrance is **automatic** (every digest, via the kit `<Hero>`).
- `<Section animateTitle>` on a marquee section or two.
- `<Metric count>` on stat rows; `<Counter>18.45s</Counter>` inline.
- `<ScrollScene effect="scale-in">…</ScrollScene>` around ONE section that rewards a beat
  (a Cards grid, a Diagram). At most one or two per digest.

**Per-skin motion personalities (shipped):** `motion-profile` is keyed to `data-theme` — blog
breathes, brutalist snaps, frontier glides, magazine struts, blueprint drafts. Authoring is
unaffected; the motion follows the skin automatically.

## Per-origin content playbooks

Pick the recipe that matches `type` in the source note's frontmatter. Sequence = reading order.
Rhythm-breakers (Callout / PullQuote / Divider / Cards) MUST appear between dense Prose runs.
**Every digest includes ONE `Diagram` of its core structure (default-on)** — flow, relationship
map, hierarchy, lifecycle, decision split, or before→after. Author it via the `excalidraw-diagrams`
skill; skip only when a note has no structure to draw (rare).

### tech-debt

```
Hero(title=problem, hook=1-line impact)
Metrics(severity · effort · status)
Gist(root-cause bullets)
Diagram(the failure→fix flow, or the affected-system relationship)
Ledger(symptoms as Row items)
Cards(fix options, one Card per option)
Callout(variant="pitfall", the trap to avoid)
Section → Prose(full analysis)
Takeaways(what resolving this unlocks, related=[sibling debt notes])
```

### spec

```
Hero(title=spec name, hook=the bet)
Gist(3-5 what-this-unlocks bullets)
StickyTOC
Section(Stakes) → PullQuote(the line) → Prose
Section(Architecture / Approach) → Diagram(the architecture shape) → Prose → CodeBlock(key interface)
Section(Trade-offs) → Cards(options compared)
More(heavy detail / prior art)
Takeaways(what ships, related=[decision records, zones])
```

### idea

```
Hero(title=pitch headline, hook=the hook)
PullQuote(the defining line)
Cards(facets — problem / opportunity / form / risk)
Diagram(how the pieces connect — substrate map or the idea's flow)
Timeline(if the idea has a sequential arc)
Callout(variant="key-insight", the unlock)
Takeaways(next action, related=[related specs or ideas])
```

### program / plan

```
Hero(title=program name, hook=goal)
Metrics(thread count · zones touched · high-risk count)
Diagram(the program's model — pipeline, two-sided flow, or thread map)
Timeline(milestones in order)
Ledger(tasks — Row done/open/risk per item)
Callout(variant="warn" for blockers, variant="in-practice" for patterns)
Takeaways(success criteria, related=[zone cards])
```

---

## Immersion principles

Nine binding rules distilled from the immersion spec. Every MDX digest must satisfy all nine.

1. **First-screen Hero** — every digest opens with `<Hero>`. The H1 (`title`) must be assertive;
   `hook` gives 1–2 sentences of stakes. No digest starts with bare `<Prose>`.

2. **Rhythm-breakers between dense runs** — never three consecutive Prose sections without a
   Callout, PullQuote, Divider, or Cards between them.

3. **ReadingProgress + Reveal** — mount `<ReadingProgress />` once at the top of every digest.
   Use `<Reveal>` on section headings and images to give scroll-as-narrative motion.

4. **StickyTOC for orientation** — use `<StickyTOC>` on any digest with three or more Sections.
   Give every `<Section>` an `id` prop so StickyTOC can build the active-highlight list.
   Nesting is first-class: a `<Section id>` inside another `<Section id>` renders as an
   **indented sub-item** in the TOC and highlights independently (active tracking is by
   heading position, so a parent stays active through its intro and each child takes over
   as you reach it). Keep nesting to ≤2 levels for a readable rail.

5. **PullQuote and DropCap for editorial weight** — surface the single most memorable sentence as
   a `<PullQuote>`. Use `<DropCap>` on the first prose paragraph of long-form openers (spec /
   idea types).

6. **One skin per page** — the active skin is set globally via `data-theme`; never inline
   override skin tokens inside a digest. Never mix atmospheres.

7. **CodeBlock copy interaction** — every code snippet must use `<CodeBlock lang="…">`, not a
   bare markdown fence, so the copy-toast interaction is available.

8. **Takeaways as completion ritual** — every digest ends with `<Takeaways>`. The `related` prop
   must list at least one sibling note or zone card. Omitting Takeaways is a hard authoring error.

9. **Reduced-motion compliance** — all motion primitives (Reveal, Stagger, Parallax) internally
   respect `prefers-reduced-motion`. No additional authoring guard needed, but never polyfill or
   disable the media query.

10. **Measure, hierarchy & whitespace** — body prose renders inside `<Prose>`, which holds the
    `--skin-measure` (~70ch) reading column; keep paragraphs there rather than full-bleed. Maintain
    generous vertical rhythm between blocks and a clear heading scale (`<Section>` titles over
    `<Prose>` text) so the page reads calm, not dense.

---

## Extending the kit

Reach for extension only when a content shape genuinely has no mapping to existing primitives.

1. **Author the component** at `{appDir}/src/kit/<New>.tsx`. Token-only constraint: every CSS
   value must reference a `var(--skin-*)` token. No hardcoded colours, radii, fonts, or shadows.

2. **Author the meta file** at `{appDir}/src/kit/meta/<New>.meta.ts` exporting a
   `PrimitiveMeta` object:
   ```ts
   import type { PrimitiveMeta } from './types'
   export const NewMeta: PrimitiveMeta = {
     name: 'New',
     category: 'data',          // typography | data | orientation | motion | structure
     useWhen: 'One-line: when an author should reach for this primitive.',
     props: {
       label: 'string — description of the prop',
     },
     example: `<New label="example" />`,
   }
   ```

3. **Register in the MDX component map** — add an import + entry in
   `{appDir}/src/kit/index.tsx` under `mdxComponents` (Section 1 for named primitives; Section 2
   for bare-element overrides). Also add to the re-export list.

4. **Regenerate the catalog**:
   ```bash
   pnpm exec atlas-visuals catalog
   # or: pnpm --dir {appDir} catalog
   ```
   This walks `src/kit/meta/*.meta.ts` and rewrites `kit-catalog.json`. The `KIT.md` in this
   skill dir is NOT auto-regenerated — update it manually or note the drift.

5. **Use the new primitive** in the MDX digest exactly as any catalog primitive.

---

## The MDX file contract

### Location

Digests live at:
```
{visualsDir}/illustrated/<skin>/<folder>/<slug>.mdx
```
where `<skin>` is the skin tree (`default` is the base — the ONLY tree the gallery manifest
scans) and `<folder>` mirrors the source note's vault folder (e.g. `tech-debt/`, `specs/`,
`ideas/`, `programs/`). The filename `<slug>` matches the source note's filename without
extension.

Example: source `{vaultDir}/tech-debt/inline-sprite-tech-debt.md` →
digest `{visualsDir}/illustrated/default/tech-debt/inline-sprite-tech-debt.mdx`.

### Which notes get a digest — NOT all of them

A digest is an **editorial redaction**, not the only way to look good. Every note already renders
well (Typeset + the derived tier). So skin a note only when an *overview* adds something the
source cannot say for itself: `programs/`, `specs/`, load-bearing `map/decisions/`.

**Never skin a `plan` or a `map/zones/` card.** A plan is a checklist — Typeset styles GFM task
lists natively, so a live render beats a redaction. A zone card is generated and always moving,
so a frozen digest is guaranteed drift. There is no coverage target.

### Required frontmatter fields

The manifest builder (`pnpm exec atlas-visuals manifest`) reads these fields from every `.mdx` file:

```yaml
---
source: tech-debt/inline-sprite-tech-debt.md   # vault-relative path to source .md
hash: a1b2c3d4e5f6                              # sha256 of source bytes, first 12 hex chars
commit: c82e89ad                                # git short SHA when digest was generated
generated: 2026-06-21                           # ISO date of generation
title: Inline sprite tech-debt                  # display title
type: tech-debt                                 # tech-debt | spec | idea | program | plan
status: open                                    # open | in-progress | done | parked
hero: /files/stocks/some-image.jpg             # optional; shown in gallery + Snapshot banner
---
```

Compute `hash` with:
```bash
sha256sum {vaultDir}/<folder>/<slug>.md | head -c 12
```

The manifest builder uses `hash` to compute freshness (`fresh` / `stale` / `missing`). The
gallery freshness chip reads this. Re-stamp `hash` and `commit` whenever the digest is
regenerated after the source note changes.

### IRON RULE — Ouroboros

- **Never write a `.md` file into `{visualsDir}/`**. Only `.mdx` digests live in the illustrated
  trees (plus app source under `app/`, assets under `files/`). The lint and Ouroboros guard both
  enforce this; the `app/` sub-directory is excluded by the manifest walker's guard
  (`if (entry.name === 'app') continue`).
- **Never modify the source note** when authoring a digest. The source `.md` in `{vaultDir}/`
  is the single source of truth; the digest is a frozen read-only snapshot of it.
- **Never copy content verbatim** from the source note — the digest is a structured interpretation
  (Hero + playbook primitives), not a transliteration.
