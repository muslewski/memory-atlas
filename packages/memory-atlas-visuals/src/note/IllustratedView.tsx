/**
 * IllustratedView.tsx — Note detail view: hero banner + provenance strip + MDX body.
 *
 * Route: /:folder/:slug
 *
 * Design: the provenance strip reads like a film leader — monospaced metadata
 * on a slightly inset band. Below it the MDX content flows through the
 * kit primitives, with element overrides handed in via the `components` prop.
 *
 * View-source: in dev, Vite's fs.allow + /@fs/ lets us link the absolute path.
 * In built dist we fall back to a relative ../../<source> path (best-effort).
 */

import { useTheme } from 'next-themes'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { visuals } from '../config'
import manifest from '../gallery/manifest.json'
import type { ManifestEntry } from '../gallery/types'
import { mdxComponents, OutboundProvider } from '../kit'
import { ScrollTrigger } from '../kit/gsap/setup'
import { loadByRoute, missingModuleHint } from '../lib/mdx'

// Human label + tooltip for the freshness chip. Stale is made explicit so a
// reader knows the visual is an illustrated note whose source has since moved on.
const FRESHNESS_COPY: Record<ManifestEntry['freshness'], { label: string; title: string }> = {
  fresh: { label: 'fresh', title: 'Source note unchanged since this illustrated view.' },
  stale: {
    label: 'stale · source changed',
    title:
      'The source note changed after this illustrated view was taken. The visual may be out of date — re-skin to refresh.',
  },
  missing: { label: 'source missing', title: 'The source note could not be found.' },
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  /* Typefaces load centrally via the theme barrel (theme/index.css). */

  /* ── Illustrated chrome ─────────────────────────────────────────────────── */
  .snap-root {
    max-width: 860px;
    margin: 0 auto;
    padding: 40px 24px 80px;
  }

  /* ── Back link ───────────────────────────────────────────────────────── */
  .snap-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--skin-muted);
    text-decoration: none;
    margin-bottom: 32px;
    opacity: 0.7;
    transition: opacity 0.15s;
  }
  .snap-back:hover { opacity: 1; color: var(--skin-text); }
  .snap-back-arrow { font-size: 14px; }

  /* ── Hero banner ─────────────────────────────────────────────────────── */
  /* The MDX Hero primitive handles the .skin-hero class; we supplement
     the IllustratedView with a hero-from-frontmatter banner when hero.title is set
     and there is no inline <Hero> in the MDX itself. This guard banner
     sits above the MDX body and is styled identically to kit Hero. */

  /* ── Provenance strip ────────────────────────────────────────────────── */
  .snap-prov {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 16px;
    padding: 10px 14px;
    margin-bottom: 36px;
    background: var(--skin-surface);
    border: var(--skin-border-w, 1px) solid var(--skin-border);
    border-radius: var(--skin-radius, 8px);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--skin-muted);
    letter-spacing: 0.03em;
  }
  .snap-prov-source {
    color: var(--skin-text);
    font-weight: 500;
  }
  .snap-prov-date {
    color: var(--skin-muted);
  }
  .snap-prov-commit {
    color: var(--skin-faint);
    font-size: 10px;
    letter-spacing: 0.02em;
  }
  .snap-prov-sep {
    color: var(--skin-border);
    user-select: none;
  }
  .snap-prov-links {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .snap-prov-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--skin-accent, #185fa5);
    text-decoration: none;
    font-size: 11px;
    letter-spacing: 0.03em;
    transition: opacity 0.15s;
    white-space: nowrap;
  }
  .snap-prov-link:hover { opacity: 0.7; }
  .snap-prov-fresh {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 7px 2px 5px;
    border-radius: 99px;
    font-size: 10px;
  }
  .snap-prov-fresh::before {
    content: '';
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .snap-prov-fresh--fresh {
    color: var(--chip-done-text, #04342C);
    background: var(--chip-done-bg, #E1F5EE);
  }
  .snap-prov-fresh--fresh::before { background: var(--chip-done-text, #04342C); }
  .snap-prov-fresh--stale {
    color: var(--chip-idea-text, #412402);
    background: var(--chip-idea-bg, #FAEEDA);
  }
  .snap-prov-fresh--stale::before { background: var(--chip-idea-text, #412402); }
  .snap-prov-fresh--missing {
    color: var(--chip-debt-text, #4A1B0C);
    background: var(--chip-debt-bg, #FAECE7);
  }
  .snap-prov-fresh--missing::before { background: var(--chip-debt-text, #4A1B0C); }

  /* ── MDX body ─────────────────────────────────────────────────────────── */
  .snap-body {
    /* Let kit.css prose/heading classes do their work */
  }

  /* ── Loading / error states ───────────────────────────────────────────── */
  .snap-loading {
    padding: 40px 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--skin-faint);
    letter-spacing: 0.04em;
    animation: snap-pulse 1.4s ease-in-out infinite;
  }
  @keyframes snap-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .snap-not-found {
    text-align: center;
    padding: 80px 24px;
    color: var(--skin-muted);
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.03em;
  }
  .snap-not-found-glyph {
    display: block;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 56px;
    opacity: 0.12;
    color: var(--skin-text);
    margin-bottom: 16px;
  }
  .snap-not-found-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 22px;
    font-weight: 600;
    color: var(--skin-text);
    margin-bottom: 8px;
    opacity: 0.6;
  }
  .snap-not-found-hint {
    font-size: 11px;
    opacity: 0.5;
    margin-top: 4px;
  }
  .snap-not-found-back {
    display: inline-block;
    margin-top: 24px;
    color: var(--skin-accent);
    text-decoration: none;
    font-size: 11px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .snap-not-found-back:hover { opacity: 0.7; }

`

// ── Build the source link ─────────────────────────────────────────────────────
function buildSourceLink(source: string): string {
  // In dev mode, Vite serves raw files via /@fs/<absolute_path>.
  // __VAULT_DIR__ is injected by vite.config.ts define and equals the absolute
  // path to syndcast-mind/ (the vault root). source is vault-relative, e.g.
  // "ideas/2026-06-17-code-native-worlds.md", so the final URL is:
  //   /@fs/<abs>/syndcast-mind/ideas/2026-06-17-code-native-worlds.md
  // which falls within fs.allow: ['..', '../..'] and is served as raw text.
  // In production (no dev server) this 404s — acceptable best-effort degradation.
  if (import.meta.env.DEV) {
    return `/@fs/${__VAULT_DIR__}/${source}`
  }
  // Production: best-effort relative path from the SPA root
  return `../../${source}`
}

// ── Lazy MDX loader with key ──────────────────────────────────────────────────
// We use a state-based approach rather than React.lazy directly
// because the lazy target changes with the route params.
// MDX default export accepts a `components` prop (element-override map) when the
// file is compiled WITHOUT providerImportSource. Named primitives the digest uses
// (Hero, Cards, …) come from its own `import … from '@/kit'`.
type MdxComponent = React.ComponentType<{ components?: typeof mdxComponents }>

function MdxBody({ folder, slug }: { folder: string; slug: string }) {
  const { theme } = useTheme()
  // Many mode: resolve the per-skin variant (falls back to base). Single mode:
  // always the base, so switching skins never reloads the MDX.
  const skin = visuals.content.mode === 'many' ? theme : undefined
  const [Comp, setComp] = useState<MdxComponent | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Blank to the loader ONLY on real navigation (note change). On a skin switch
  // (same note, many mode) we keep the current content mounted until the new variant
  // resolves — blanking would collapse the page height and reset scroll to the top.
  const noteKey = `${folder}/${slug}`
  const prevNoteKey = useRef(noteKey)

  useEffect(() => {
    if (prevNoteKey.current !== noteKey) {
      setComp(null)
      prevNoteKey.current = noteKey
    }
    setError(null)
    let cancelled = false
    loadByRoute(folder, slug, skin)
      .then((mod) => {
        if (cancelled) return
        if (!mod) {
          // Reaching here means the route IS in the manifest (IllustratedView found the
          // entry) but the .mdx is missing from the boot-time glob — a digest added
          // after the dev server started. Give the actionable restart hint.
          setError(missingModuleHint(folder, slug))
        } else {
          setComp(() => mod.default as MdxComponent)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [folder, slug, skin, noteKey])

  // Recompute ScrollTrigger positions AFTER the lazy MDX mounts. The shell's
  // refreshes (fonts.ready / window load) fire before this async content exists, so
  // reveal triggers (ScrollScene, SplitReveal) would be created against stale layout
  // — a reveal whose start is mispositioned never fires and its gsap.from(opacity:0)
  // leaves content invisible until a manual page refresh (the intermittent "silent"
  // disappearing cards). rAF×2 = after the new DOM has laid out; the 400ms pass
  // catches late shifts (font swap, hero image). refresh() re-fires any trigger now
  // in view, so deep-linked / above-fold sections become visible.
  useEffect(() => {
    if (!Comp || !visuals.motion.gsap) return
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => ScrollTrigger.refresh())
    })
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 400)
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      window.clearTimeout(t)
    }
  }, [Comp])

  if (error) {
    return (
      <p
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
          color: 'var(--chip-debt-text)',
          background: 'var(--chip-debt-bg)',
          padding: '12px 16px',
          borderRadius: 'var(--skin-radius, 8px)',
        }}
      >
        MDX load error: {error}
      </p>
    )
  }
  if (!Comp) {
    return <div className="snap-loading">Loading note…</div>
  }

  // Apply .typeset + .typeset-measure + the active skin's rhythm preset.
  // Map 'blog' (the editorial default) → .typeset-default to match presets.css.
  // The skin class sources from the same theme value used for data-theme.
  const activeSkin = theme || 'blog'
  const preset = activeSkin === 'blog' ? 'default' : activeSkin
  const typesetClass = `typeset typeset-measure typeset-${preset}`

  return (
    <div className={typesetClass}>
      <Comp components={mdxComponents} />
    </div>
  )
}

// ── IllustratedView ─────────────────────────────────────────────────────────────────
export default function IllustratedView({ folder, slug }: { folder: string; slug: string }) {
  const entries = manifest.entries as ManifestEntry[]

  if (!folder || !slug) {
    return (
      <div className="snap-not-found">
        <span className="snap-not-found-glyph" aria-hidden="true">
          ◌
        </span>
        <div className="snap-not-found-title">Invalid route</div>
        <Link to="/" className="snap-not-found-back">
          ← Back to gallery
        </Link>
      </div>
    )
  }

  const entry = entries.find((e) => e.folder === folder && e.slug === slug) ?? null

  // Unknown route — show graceful 404
  if (!entry) {
    return (
      <>
        <style>{CSS}</style>
        <div className="snap-root">
          <Link to="/" className="snap-back">
            <span className="snap-back-arrow">←</span> Gallery
          </Link>
          <div className="snap-not-found" style={{ padding: '40px 0' }}>
            <span className="snap-not-found-glyph" aria-hidden="true">
              ◌
            </span>
            <div className="snap-not-found-title">Note not found</div>
            <div className="snap-not-found-hint">
              /{folder}/{slug} is not in the manifest
            </div>
            <Link to="/" className="snap-not-found-back">
              ← Back to gallery
            </Link>
          </div>
        </div>
      </>
    )
  }

  const freshnessClass = `snap-prov-fresh--${entry.freshness}`
  const sourceLink = buildSourceLink(entry.source)

  return (
    <>
      <style>{CSS}</style>
      <div className="snap-root">
        {/* Back link */}
        <Link to="/" className="snap-back">
          <span className="snap-back-arrow">←</span> Gallery
        </Link>

        {/* The hero image is rendered by the MDX <Hero> banner (kit), so the
            headline and the image stay together as one hero unit. */}

        {/* Provenance strip — a frozen snapshot of the source note. The date +
            freshness chip tell the reader how current this rendering is. */}
        <div className="snap-prov">
          <span className="snap-prov-source">{entry.source}</span>
          <span className="snap-prov-sep" aria-hidden="true">
            ·
          </span>
          {entry.generated && (
            <>
              <span
                className="snap-prov-date"
                title="When this visual was generated from the source note."
              >
                snapshot {entry.generated}
              </span>
              <span className="snap-prov-sep" aria-hidden="true">
                ·
              </span>
            </>
          )}
          {entry.hash && (
            <>
              <span title="Source hash at snapshot time.">{entry.hash.slice(0, 8)}</span>
              <span className="snap-prov-sep" aria-hidden="true">
                ·
              </span>
            </>
          )}
          <span
            className={`snap-prov-fresh ${freshnessClass}`}
            title={FRESHNESS_COPY[entry.freshness].title}
          >
            {FRESHNESS_COPY[entry.freshness].label}
          </span>

          <div className="snap-prov-links">
            {entry.commit && (
              <span className="snap-prov-commit" title="Repo HEAD when this snapshot was taken.">
                @{entry.commit}
              </span>
            )}
            <Link
              to={`/source/${entry.source}`}
              className="snap-prov-link"
              data-testid="view-source"
              title={`Read the source note: ${entry.source}`}
            >
              View source →
            </Link>
            <a
              href={sourceLink}
              target="_blank"
              rel="noopener noreferrer"
              className="snap-prov-link"
              title={`Open the raw file: ${entry.source}`}
            >
              full note ↗
            </a>
          </div>
        </div>

        {/* MDX body — wrapped in the note's outbound context so inline <NoteLink>
            resolves against the SAME Mind-owned connections the footer uses. */}
        <div className="snap-body">
          <OutboundProvider value={entry.outbound ?? []}>
            <Suspense fallback={<div className="snap-loading">Loading note…</div>}>
              <MdxBody folder={folder} slug={slug} />
            </Suspense>
          </OutboundProvider>
        </div>
      </div>
    </>
  )
}
