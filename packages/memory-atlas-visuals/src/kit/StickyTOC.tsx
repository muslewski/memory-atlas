/**
 * StickyTOC — sticky table of contents with active-section highlighting.
 *
 * When `items` is omitted: derives from all `section[id]` elements in the
 * document on mount, reading the first heading child's text as the label.
 *
 * Active section: tracked by HEADING position, not box intersection. On scroll we
 * find the last section whose heading has crossed a line near the top of the
 * viewport. This is nesting-correct: a parent (e.g. high-priority) stays active
 * through its own intro, then each nested child (td-pq2, td-pq3) takes over as its
 * heading scrolls past the line — an IntersectionObserver over the section BOXES
 * can't express this (the parent box always intersects whenever a child does).
 * Heading positions use getBoundingClientRect, which already reflects ScrollSmoother's
 * transform (the real on-screen position).
 *
 * Scroll-to: `scrollIntoView({ behavior: 'smooth' })` is suppressed under
 * `prefers-reduced-motion: reduce` — falls back to instant scroll.
 *
 * Cleanup: both the IntersectionObserver and any reference to the observed
 * elements are fully disconnected in the useEffect return.
 */

'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap, ScrollSmoother } from './gsap/setup'

interface TOCItem {
  id: string
  label: string
  /** Nesting depth = number of ancestor section[id]. 0 = top level. Drives indent. */
  depth?: number
}

interface StickyTOCProps {
  items?: TOCItem[]
}

function deriveItems(): TOCItem[] {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('section[id]'))
  return sections.map((el) => {
    // Sections nest (e.g. td-pq3 inside high-priority). Reflect that as TOC depth
    // instead of flattening — a flat list both hides the structure and was the root
    // of the active-highlight bug. The first heading descendant is this section's own
    // title (it precedes any nested section in DOM).
    let depth = 0
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (p.matches?.('section[id]')) depth++
    }
    const heading = el.querySelector('h1,h2,h3,h4,h5,h6')
    return {
      id: el.id,
      label: heading?.textContent?.trim() ?? el.id,
      depth,
    }
  })
}

export function StickyTOC({ items: propItems }: StickyTOCProps) {
  const [items, setItems] = useState<TOCItem[]>(propItems ?? [])
  const [activeId, setActiveId] = useState<string>('')
  // The rail portals into #toc-layer (outside the ScrollSmoother transform) so its
  // position:fixed stays viewport-relative. Resolved after mount (target must exist).
  const [layer, setLayer] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setLayer(document.getElementById('toc-layer'))
  }, [])

  // Derive items from DOM if not provided
  useEffect(() => {
    if (!propItems) {
      setItems(deriveItems())
    }
  }, [propItems])

  // Track the active section by heading position vs a line near the top of the
  // viewport. Driven by the gsap ticker (NOT a 'scroll' listener): ScrollSmoother
  // jumps native scroll once, then animates the transform over its smooth duration
  // (up to 2s on frontier) emitting NO further scroll events — a scroll listener
  // would read a stale position mid-animation. The ticker fires every frame; a
  // scrollTop guard makes update() run only when the position actually changed.
  useEffect(() => {
    if (items.length === 0) return
    const ids = items.map((i) => i.id)
    // The line sits just below the sticky nav (~52px) with breathing room. A heading
    // at/above this line counts as "entered".
    const LINE = 140

    const update = () => {
      let active = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        const heading = (el.querySelector('h1,h2,h3,h4,h5,h6') ?? el) as HTMLElement
        // DOM order == visual order for in-flow content, so the last heading whose
        // top has crossed the line is the current section.
        if (heading.getBoundingClientRect().top <= LINE) active = id
      }
      setActiveId(active)
    }

    let lastY = NaN
    const tick = () => {
      const y = ScrollSmoother.get()?.scrollTop() ?? window.scrollY
      if (y === lastY) return // no movement → skip the getBoundingClientRect reads
      lastY = y
      update()
    }
    gsap.ticker.add(tick)
    update()
    return () => {
      gsap.ticker.remove(tick)
    }
  }, [items])

  if (items.length === 0) return null

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    const target = document.getElementById(id)
    if (!target) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const smoother = ScrollSmoother.get()
    if (smoother) {
      // Align the section top ~72px down (clear of the fixed nav); smooth unless reduced.
      smoother.scrollTo(target, !reducedMotion.matches, 'top 72px')
    } else {
      target.scrollIntoView({
        behavior: reducedMotion.matches ? 'instant' : 'smooth',
        block: 'start',
      } as ScrollIntoViewOptions)
    }

    // Update URL hash without scroll jump
    history.pushState(null, '', `#${id}`)
    setActiveId(id)
  }

  const toc = (
    <nav className="skin-toc" data-testid="sticky-toc" aria-label="Table of contents">
      <span className="skin-toc-label">On this page</span>
      <ol className="skin-toc-list">
        {items.map(({ id, label, depth = 0 }) => (
          <li key={id} className="skin-toc-item" data-depth={depth}>
            <a
              href={`#${id}`}
              className={`skin-toc-link${activeId === id ? ' skin-toc-link--active' : ''}${depth > 0 ? ' skin-toc-link--child' : ''}`}
              style={depth > 0 ? { paddingLeft: `calc(12px + ${depth} * 0.85rem)` } : undefined}
              aria-current={activeId === id ? 'location' : undefined}
              onClick={(e) => handleClick(e, id)}
            >
              {label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )

  // Portal into the fixed #toc-layer (outside the ScrollSmoother transform). Until the
  // layer resolves on mount, render nothing.
  return layer ? createPortal(toc, layer) : null
}
