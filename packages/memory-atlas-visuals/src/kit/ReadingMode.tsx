/**
 * ReadingMode.tsx — Skim / Deep reading-mode toggle.
 *
 * Sets data-reading-mode="skim"|"deep" on <html>. Persists to localStorage
 * so the choice survives navigation. A CSS rule in kit.css hides any element
 * marked data-reading-detail when Skim is active:
 *
 *   :root[data-reading-mode="skim"] [data-reading-detail] { display: none }
 *
 * SSR/hydration guard: reads localStorage only after mount (useEffect).
 * No flash: the localStorage read happens before first paint on the client
 * because React flushes effects synchronously before the browser paints
 * in concurrent mode with a useLayoutEffect — but we use useEffect here
 * and accept that initial render may briefly show the default ("deep") state.
 * This is a client-only widget used in the Mind viewer, not a Next.js SSR app.
 *
 * Token-only: colours, border, radius read from var(--skin-*).
 */

import { useEffect, useState } from 'react'

const LS_KEY = 'mind-reading-mode'
type Mode = 'skim' | 'deep'

export function ReadingMode() {
  const [mode, setMode] = useState<Mode>('deep')
  const [mounted, setMounted] = useState(false)

  // Mount guard: read persisted value only on the client
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY) as Mode | null
    if (saved === 'skim' || saved === 'deep') {
      setMode(saved)
      document.documentElement.setAttribute('data-reading-mode', saved)
    } else {
      document.documentElement.setAttribute('data-reading-mode', 'deep')
    }
    setMounted(true)
  }, [])

  function toggle() {
    const next: Mode = mode === 'deep' ? 'skim' : 'deep'
    setMode(next)
    localStorage.setItem(LS_KEY, next)
    document.documentElement.setAttribute('data-reading-mode', next)
  }

  // Render a stable placeholder before mount to avoid hydration mismatch
  if (!mounted) {
    return <div className="skin-reading-mode skin-reading-mode--placeholder" />
  }

  const isSkimming = mode === 'skim'

  return (
    <button
      className={`skin-reading-mode${isSkimming ? ' skin-reading-mode--skim' : ''}`}
      onClick={toggle}
      data-testid="reading-mode"
      aria-label={isSkimming ? 'Switch to Deep reading mode' : 'Switch to Skim reading mode'}
      aria-pressed={isSkimming}
      type="button"
    >
      <span className="skin-reading-mode-track" aria-hidden="true">
        <span className="skin-reading-mode-thumb" />
      </span>
      <span className="skin-reading-mode-labels" aria-hidden="true">
        <span
          className={`skin-reading-mode-label${!isSkimming ? ' skin-reading-mode-label--active' : ''}`}
        >
          Deep
        </span>
        <span
          className={`skin-reading-mode-label${isSkimming ? ' skin-reading-mode-label--active' : ''}`}
        >
          Skim
        </span>
      </span>
    </button>
  )
}
