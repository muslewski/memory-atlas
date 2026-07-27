# Kit Catalog Reference

Generated from `{appDir}/kit-catalog.json` (28 primitives in the base catalog). Live source of
truth is `kit-catalog.json` + `src/kit/meta/*.meta.ts`. Run `pnpm exec atlas-visuals catalog`
(or `pnpm --dir {appDir} catalog`) to regenerate.

`{appDir}` = `{visualsDir}/app` where `{visualsDir}` is `config.visuals.dir` or `{vaultDir}/visuals`
from `atlas.config.json`. Product: **memory-atlas-visuals** (Atlas Visuals).

---

## Typography (6)

| Primitive | useWhen | Key props |
|-----------|---------|-----------|
| **Hero** | Opening a note or article page — sets the title, optional eyebrow label, and a lead hook sentence. | `title` (req), `hook`, `eyebrow`, `children` |
| **Section** | Dividing a long note into named blocks with optional fractional markers (e.g. "02 / 07"). | `id`, `title`, `marker`, `children` |
| **Prose** | Wrapping free-form body text to apply `--skin-measure` width constraint and vertical rhythm. | `children` |
| **PullQuote** | Surfacing a key insight or memorable phrase with typographic weight, distinct from an inline blockquote. | `children` |
| **DropCap** | Opening a long-form piece with an editorial drop-capital on the first paragraph. | `children` |
| **Divider** | Separating content blocks with a full-width rule; optionally labelled with a short string. | `label?` |

## Data (11)

| Primitive | useWhen | Key props |
|-----------|---------|-----------|
| **Callout** | Drawing attention to a notable aside, warning, best-practice, or cautionary note inline with prose. | `variant` (`key-insight`/`pitfall`/`in-practice`/`warn`/`info`), `title`, `children` |
| **Card** | A single card cell inside a Cards grid. | `h`, `children` |
| **Cards** | Displaying a scannable grid of related items, each with an optional heading and body content. | `children` (Card elements) |
| **Chip** | Inline status or classification badge; use tone to signal semantic meaning at a glance. | `tone` (`done`/`risk`/…), `children` |
| **CodeBlock** | Multi-line code snippet — syntax-highlighted (highlight.js, fixed dark panel across skins) + one-click copy. **Full-width only — NEVER inside `<Cards>`** (narrow columns clip code; `check:illustrated` enforces). Pass `lang` (tsx/ts/js/bash/json/css) for correct highlighting. | `lang`, `children` |
| **Gist** | Surfacing the distilled takeaway of a section; wraps a `<ul>` of key points under a bulb icon. | `children` (ul/li) **or** `items` (string[]) |
| **Ledger** | Listing tracked items with completion or risk status; rows carry icons that adapt across skins. | `children` (Row elements) **or** `items` (Row-props[]) |
| **Metric** | A single stat cell inside a Metrics row; value renders large, label renders small beneath. | `label`, `value` |
| **Metrics** | Displaying a row of key/value statistics or measurements with large display numerals. | `children` (Metric elements) **or** `items` ({label,value}[]) |
| **Row** | A single row inside a Ledger; use `done` or `risk` to apply the matching icon and accent colour. | `done?`, `risk?`, `title`, `sub?` |
| **Timeline** | Rendering a vertical sequence of events or milestones connected by a dotted spine. | `children` (li elements) **or** `items` (ReactNode[]) |
| _All five data primitives_ | **Never leave empty** — a self-closing tag with no `items=` (or `<Comp></Comp>`) renders blank. `pnpm exec atlas-visuals check:illustrated` enforces this. | — |

## Orientation (4)

| Primitive | useWhen | Key props |
|-----------|---------|-----------|
| **Concept** | Marking a defined term inline so readers can link directly to it and hover to copy a deep-link. | `id`, `children` |
| **Diagram** | A note explains a flow / sequence / architecture — embed an Excalidraw scene (`files/diagrams/<slug>.excalidraw`). Conditional, not per-note. Fixed hand-drawn palette, same across skins, framed on a light plate. Author via the **excalidraw-diagrams** skill. | `src`, `caption?`, `maxHeight?` |
| **ReadingProgress** | Long-form articles or reference notes where showing scroll progress helps readers gauge depth and stay oriented. | _(none)_ |
| **StickyTOC** | Documents with multiple named sections where readers benefit from a persistent, active-highlighted navigation sidebar. | `items?` (auto-derives from Section ids when omitted) |

## Motion (3)

| Primitive | useWhen | Key props |
|-----------|---------|-----------|
| **Parallax** | Adding a subtle scroll-driven depth effect to a single element — hero images, background panels, or decorative blocks. | `amount` (px, default 40), `children` |
| **Reveal** | Fading a block of content into view as the reader scrolls to it. | `y?` (offset px), `children` |
| **Stagger** | Animating a list of sibling items so they cascade into view one after another. | `gap` (delay seconds), `children` |

## Structure (4)

| Primitive | useWhen | Key props |
|-----------|---------|-----------|
| **Icon** | Inline glyph beside a label, card heading, list item or callout. **Any lucide icon by kebab-case name** (e.g. `git-branch`, `sparkles`, `shield`); strokes inherit the skin colour via `currentColor` — never set a colour. Legacy names (`bulb`, `alert-triangle`) still resolve. | `name`, `size?`, `strokeWidth?` |
| **More** | A section has supplementary detail that most readers can skip — collapse it behind a disclosure trigger. | `summary`, `children` |
| **ReadingMode** | Mount once in the layout shell to give readers a Skim/Deep toggle. | _(none — mount once per page)_ |
| **Takeaways** | Place at the end of a vault note as a completion ritual — summarises key points and links related documents. | `children` (key points) **or** `items` (ReactNode[]); `related` ({href,title} **or** bare string)[] |

---

_Cross-check: 6 + 11 + 4 + 3 + 4 = 28 primitives (base catalog; motion may ship more GSAP primitives in-app)._
