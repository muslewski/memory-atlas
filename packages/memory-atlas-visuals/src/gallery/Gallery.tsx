/**
 * Gallery.tsx — Home view: grouped cards by folder + freshness chips.
 *
 * Design: editorial-cartography. Dense information tiles arranged by folder
 * (knowledge domain). Each card shows type chip, title, freshness enamel dot,
 * and status. The folder headings use a serif display typeface; metadata uses
 * monospace. Left-border accent colors encode knowledge type at a glance.
 */

import { AnimatePresence, motion, type Transition, type Variants } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip } from '../kit'
import { useMotion } from '../kit/gsap/useMotion'
import { useReducedMotion } from '../kit/useReducedMotion'
import { groupByFolder } from '../lib/group'
import { resolveHero } from '../lib/heroes'
import { noteHref } from '../note/note-route'
import { type NoteMeta, notesManifest } from '../notes/notes-manifest'
import { availableTypes, FRESHNESS_VALUES, filterEntries, normalizeType } from './gallery-filter'
import { cardVariants, layoutTransition } from './gallery-motion'
import digestManifest from './manifest.json'

// Map note type → Chip tone
function typeToTone(
  type: string | null,
): 'program' | 'debt' | 'idea' | 'done' | 'next' | 'risk' | 'neutral' {
  switch (type) {
    case 'idea':
      return 'idea'
    case 'tech-debt':
    case 'debt':
      return 'debt'
    case 'program':
      return 'program'
    case 'done':
      return 'done'
    case 'next':
      return 'next'
    case 'risk':
      return 'risk'
    default:
      return 'neutral'
  }
}

// Freshness → visual class + label
function freshnessAttrs(f: 'fresh' | 'stale' | 'missing') {
  switch (f) {
    case 'fresh':
      return { cls: 'glry-fresh--fresh', label: 'fresh' }
    case 'stale':
      return { cls: 'glry-fresh--stale', label: 'stale' }
    case 'missing':
      return { cls: 'glry-fresh--missing', label: 'missing' }
  }
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  /* ── Google Fonts import ─────────────────────────────────────────────── */
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  /* ── Gallery layout ──────────────────────────────────────────────────── */
  .glry-root {
    max-width: 1080px;
    margin: 0 auto;
    padding: 48px 24px 80px;
  }

  /* ── Header ─────────────────────────────────────────────────────────── */
  .glry-header {
    margin-bottom: 52px;
    padding-bottom: 28px;
    border-bottom: var(--skin-border-w, 1px) solid var(--skin-border);
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .glry-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(28px, 4vw, 42px);
    font-weight: 700;
    color: var(--skin-text);
    letter-spacing: -0.02em;
    line-height: 1.1;
    margin: 0;
  }
  .glry-meta {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--skin-faint);
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  /* ── Empty state ─────────────────────────────────────────────────────── */
  .glry-empty {
    text-align: center;
    padding: 80px 24px;
    color: var(--skin-muted);
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.03em;
  }
  .glry-empty-glyph {
    display: block;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.15;
    color: var(--skin-text);
  }
  .glry-empty-hint {
    margin-top: 8px;
    font-size: 11px;
    opacity: 0.6;
  }

  /* ── Folder group ────────────────────────────────────────────────────── */
  .glry-group {
    margin-bottom: 48px;
  }
  .glry-group-h {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--skin-muted);
    margin: 0 0 16px 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .glry-group-h::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--skin-border);
  }
  .glry-group-count {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--skin-faint);
    letter-spacing: 0.05em;
    background: var(--skin-surface);
    border: var(--skin-border-w, 1px) solid var(--skin-border);
    border-radius: 99px;
    padding: 1px 7px;
  }

  /* ── Card grid ───────────────────────────────────────────────────────── */
  .glry-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }

  /* ── Individual card ─────────────────────────────────────────────────── */
  .glry-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;                 /* clip the hero band to the card radius */
    background: var(--skin-card, var(--skin-surface));
    border: var(--skin-border-w, 1px) solid var(--skin-border);
    border-left: 3px solid var(--glry-card-accent, var(--skin-border));
    border-radius: var(--skin-radius, 8px);
    text-decoration: none;
    color: inherit;
    transition: box-shadow 0.18s ease, border-color 0.18s ease, transform 0.12s ease;
    cursor: pointer;
  }
  /* Content zone — padding lives here (not on the card) so the hero band can be
     full-bleed at the top. Plain (no-hero) cards look identical to before. */
  .glry-card-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px 18px;
  }
  /* V2 hero band: a fixed-height image strip with a hard seam to the data zone.
     --glry-hero-filter lets each skin treat the photo (brutalist = grayscale). */
  .glry-card-hero {
    display: block;
    width: 100%;
    height: 132px;
    object-fit: cover;
    border-bottom: var(--skin-border-w, 1px) solid var(--skin-border);
    filter: var(--glry-hero-filter, none);
  }
  .glry-card:hover {
    box-shadow: var(--skin-shadow-popover);
    transform: translateY(-1px);
    border-left-color: var(--skin-accent);
  }
  /* Per-type left-border accent — uses the --type-* surface-line tokens so the
     edge stays visible in every skin (brutalist's chip-*-text is white). */
  .glry-card[data-type="idea"]     { --glry-card-accent: var(--type-idea); }
  .glry-card[data-type="debt"]     { --glry-card-accent: var(--type-debt); }
  .glry-card[data-type="tech-debt"]{ --glry-card-accent: var(--type-debt); }
  .glry-card[data-type="program"]  { --glry-card-accent: var(--type-program); }
  .glry-card[data-type="done"]     { --glry-card-accent: var(--type-done); }
  .glry-card[data-type="next"]     { --glry-card-accent: var(--type-next); }
  .glry-card[data-type="risk"]     { --glry-card-accent: var(--type-risk); }

  .glry-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .glry-card-title {
    /* Skin-aware: each skin's display face (brutalist Space Grotesk, magazine DM
       Serif, frontier Orbitron, blueprint IBM Plex Mono). Blog leaves the token unset
       → the Playfair fallback keeps its editorial serif. */
    font-family: var(--skin-font-display, 'Playfair Display', Georgia, serif);
    font-size: 15px;
    font-weight: 600;
    color: var(--skin-text);
    line-height: 1.35;
    letter-spacing: -0.01em;
    flex: 1;
  }
  .glry-card-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-top: 2px;
  }
  .glry-card-status {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--skin-faint);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* ── Freshness enamel dot + label ────────────────────────────────────── */
  .glry-fresh {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.04em;
    padding: 2px 7px 2px 5px;
    border-radius: 99px;
    border: 1px solid transparent;
  }
  .glry-fresh::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .glry-fresh--fresh {
    color: var(--chip-done-text, #04342C);
    background: var(--chip-done-bg, #E1F5EE);
    border-color: color-mix(in srgb, var(--chip-done-text, #04342C) 18%, transparent);
  }
  .glry-fresh--fresh::before { background: var(--chip-done-text, #04342C); }
  .glry-fresh--stale {
    color: var(--chip-idea-text, #412402);
    background: var(--chip-idea-bg, #FAEEDA);
    border-color: color-mix(in srgb, var(--chip-idea-text, #412402) 18%, transparent);
  }
  .glry-fresh--stale::before { background: var(--chip-idea-text, #412402); }
  .glry-fresh--missing {
    color: var(--chip-debt-text, #4A1B0C);
    background: var(--chip-debt-bg, #FAECE7);
    border-color: color-mix(in srgb, var(--chip-debt-text, #4A1B0C) 18%, transparent);
  }
  .glry-fresh--missing::before { background: var(--chip-debt-text, #4A1B0C); }

  /* ── Search + filter controls ────────────────────────────────────────── */
  .glry-controls {
    margin-bottom: 40px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .glry-search {
    width: 100%;
    padding: 10px 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: var(--skin-text);
    background: var(--skin-bg);
    border: var(--skin-border-w, 1px) solid var(--skin-border);
    border-radius: var(--skin-radius, 8px);
    box-sizing: border-box;
  }
  .glry-search::placeholder { color: var(--skin-faint); }
  .glry-search:focus {
    outline: 2px solid var(--skin-accent);
    outline-offset: 1px;
  }
  .glry-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .glry-filter-chip {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--skin-muted);
    background: var(--skin-surface);
    border: var(--skin-border-w, 1px) solid var(--skin-border);
    border-radius: 99px;
    padding: 4px 11px;
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  }
  .glry-filter-chip:hover {
    color: var(--skin-text);
    border-color: var(--skin-accent);
  }
  /* Active = outlined accent (accent IS the link color → legible on every skin's
     surface; a flat accent FILL fails low-contrast accent/bg pairs e.g. blog).
     A light accent tint reads as "filled" without killing the accent text. */
  .glry-filter-chip[aria-pressed="true"] {
    color: var(--skin-accent);
    background: color-mix(in srgb, var(--skin-accent) 12%, var(--skin-surface));
    border-color: var(--skin-accent);
    font-weight: 500;
  }
  .glry-filter-div {
    width: 1px;
    height: 18px;
    background: var(--skin-border);
    margin: 0 4px;
  }
  .glry-clear {
    margin-top: 12px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--skin-accent);
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: underline;
  }
`

// Internal card shape for gallery (adapts NoteMeta + digest lookup for hero/freshness).
type GalleryEntry = {
  title: string
  folder: string
  type: string | null
  status: string | null
  freshness: 'fresh' | 'stale' | 'missing' | null
  illustrated: boolean
  route: string
  hero?: string
}

// Module scope: both manifests are static imports, so this runs once per page load,
// not once per render. Keeping `entries` referentially stable is what lets the
// useMemos below actually hit — with a fresh array each render they never did,
// and every keystroke re-filtered and re-grouped all 1,115 notes.
const illustratedEntries = (
  digestManifest as {
    entries: Array<{ source?: string; freshness?: 'fresh' | 'stale' | 'missing'; hero?: string }>
  }
).entries
const heroAndFreshnessBySource = new Map<
  string,
  { freshness: 'fresh' | 'stale' | 'missing' | null; hero?: string }
>()
for (const d of illustratedEntries) {
  if (d.source)
    heroAndFreshnessBySource.set(d.source, { freshness: d.freshness ?? null, hero: d.hero })
}

const entries: GalleryEntry[] = notesManifest.notes.map((n: NoteMeta) => {
  const d = n.illustrated ? heroAndFreshnessBySource.get(n.relPath) : undefined
  return {
    title: n.title,
    folder: n.group,
    type: normalizeType(n.type ?? null),
    status: n.status ?? null,
    freshness: d?.freshness ?? null,
    illustrated: n.illustrated,
    route: noteHref(n.relPath),
    hero: d?.hero,
  }
})

const types = availableTypes(entries) // static now — computed once at module load

// ── Component ─────────────────────────────────────────────────────────────────
export default function Gallery() {
  const [q, setQ] = useState('')
  const [activeTypes, setActiveTypes] = useState<Set<string>>(() => new Set())
  const [activeFreshness, setActiveFreshness] = useState<Set<string>>(() => new Set())
  const [illustratedOnly, setIllustratedOnly] = useState(false)

  // Motion personality (skin-aware, stable refs per skin)
  const motionProfile = useMotion()
  const reduced = useReducedMotion()
  const transition = useMemo(
    () => layoutTransition(motionProfile, !!reduced) as Transition,
    [motionProfile, reduced],
  )
  const variants = useMemo(
    () => cardVariants(motionProfile, !!reduced) as unknown as Variants,
    [motionProfile, reduced],
  )

  // types is the stable module-scope value (no useMemo; was recomputing every render before hoist)
  // entries is module-scope stable so omitted from deps (satisfies exhaustive-deps; value never changes)
  const filtered = useMemo(
    () =>
      filterEntries(entries, {
        q,
        types: activeTypes,
        freshness: activeFreshness,
        illustrated: illustratedOnly ? true : null,
      }),
    [q, activeTypes, activeFreshness, illustratedOnly],
  )
  const groups = useMemo(() => groupByFolder(filtered), [filtered])
  const folderNames = useMemo(() => Object.keys(groups).sort(), [groups])

  const totalCount = entries.length
  const shownCount = filtered.length

  // Filter-active when any query text or chip is engaged (illustrated reuses the same filter path)
  const filterActive =
    q.trim() !== '' || activeTypes.size > 0 || activeFreshness.size > 0 || illustratedOnly

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) =>
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  const clearAll = () => {
    setQ('')
    setActiveTypes(new Set())
    setActiveFreshness(new Set())
    setIllustratedOnly(false)
  }

  /** Shared card markup — used by both the idle (grouped) and active (flat) branches. */
  function renderCard(entry: GalleryEntry, folderFallback: string) {
    const tone = typeToTone(entry.type)
    const heroUrl = entry.illustrated ? resolveHero(entry.hero) : null
    const showFresh = entry.illustrated && entry.freshness != null
    const fresh = showFresh
      ? freshnessAttrs(entry.freshness as 'fresh' | 'stale' | 'missing')
      : null
    return (
      <Link
        to={entry.route}
        className={`glry-card${heroUrl ? ' glry-card--hero' : ''}`}
        data-type={entry.type ?? undefined}
        data-testid="gallery-card"
      >
        {/* V2 "exposed seam": hero band over a data zone for digest-backed notes only.
            Non-visual notes render clean (title/type/status from frontmatter), linked to /source. */}
        {heroUrl && <img className="glry-card-hero" src={heroUrl} alt="" loading="lazy" />}
        <div className="glry-card-body">
          <div className="glry-card-top">
            <Chip tone={tone}>{entry.type ?? folderFallback}</Chip>
            {entry.illustrated && (
              <span data-testid="visual-badge" aria-hidden="true">
                ◆
              </span>
            )}
            {fresh && <span className={`glry-fresh ${fresh.cls}`}>{fresh.label}</span>}
          </div>
          <div className="glry-card-title">{entry.title}</div>
          {entry.status && (
            <div className="glry-card-foot">
              <span className="glry-card-status">{entry.status}</span>
            </div>
          )}
        </div>
      </Link>
    )
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="glry-root" data-testid="gallery">
        {/* ── Header ── */}
        <header className="glry-header">
          <h1 className="glry-title">Mind Skins</h1>
          {totalCount > 0 && (
            <span className="glry-meta">
              {shownCount === totalCount
                ? `${totalCount} note${totalCount !== 1 ? 's' : ''} · ${folderNames.length} folder${folderNames.length !== 1 ? 's' : ''}`
                : `${shownCount} of ${totalCount} notes`}
            </span>
          )}
        </header>

        {/* ── Search + filter controls ── */}
        {totalCount > 0 && (
          <div className="glry-controls">
            <input
              className="glry-search"
              data-testid="gallery-search"
              type="search"
              placeholder="Search title, folder, type, status…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search notes"
            />
            <div className="glry-filters">
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="glry-filter-chip"
                  data-testid={`gallery-filter-type-${t}`}
                  aria-pressed={activeTypes.has(t)}
                  onClick={() => toggle(setActiveTypes, t)}
                >
                  {t}
                </button>
              ))}
              {/* Illustrated is one facet among the type chips (styled/weighted identically), not a mode. */}
              <button
                type="button"
                className="glry-filter-chip"
                data-testid="filter-illustrated"
                aria-pressed={illustratedOnly}
                onClick={() => setIllustratedOnly((v) => !v)}
              >
                Illustrated
              </button>
              {types.length > 0 && <span className="glry-filter-div" aria-hidden="true" />}
              {FRESHNESS_VALUES.map((f) => (
                <button
                  key={f}
                  type="button"
                  className="glry-filter-chip"
                  data-testid={`gallery-filter-fresh-${f}`}
                  aria-pressed={activeFreshness.has(f)}
                  onClick={() => toggle(setActiveFreshness, f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty: no notes at all (should not normally happen) ── */}
        {totalCount === 0 && (
          <div className="glry-empty">
            <span className="glry-empty-glyph" aria-hidden="true">
              ◌
            </span>
            <div>No notes yet</div>
            <div className="glry-empty-hint">
              Run <code>pnpm manifest</code> to (re)build indexes.
            </div>
          </div>
        )}

        {/* ── Empty: filters exclude everything ── */}
        {totalCount > 0 && shownCount === 0 && (
          <div className="glry-empty" data-testid="gallery-no-match">
            <span className="glry-empty-glyph" aria-hidden="true">
              ◌
            </span>
            <div>No notes match your filters</div>
            <button
              type="button"
              className="glry-clear"
              data-testid="gallery-clear"
              onClick={clearAll}
            >
              Clear filters
            </button>
          </div>
        )}

        {/* ── Active filter branch: flat grid with FLIP reflow ── */}
        {filterActive && shownCount > 0 && (
          <div className="glry-grid">
            <AnimatePresence>
              {filtered.map((entry) => (
                <motion.div
                  layout
                  key={entry.route}
                  variants={variants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                >
                  {renderCard(entry, entry.folder)}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ── Idle branch: grouped <section>s (unchanged structure) ── */}
        {!filterActive &&
          folderNames.map((folder) => {
            const cards = groups[folder]
            return (
              <section key={folder} className="glry-group">
                <h2 className="glry-group-h">
                  {folder}
                  <span className="glry-group-count">{cards.length}</span>
                </h2>
                <div className="glry-grid">
                  {cards.map((entry) => (
                    <div key={entry.route}>{renderCard(entry, folder)}</div>
                  ))}
                </div>
              </section>
            )
          })}
      </div>
    </>
  )
}
