/**
 * Concept — anchorable inline term with a copy-link affordance on hover.
 *
 * Renders a <span id={id}> so heading-link jump targets work.
 * On hover (or focus for keyboard users) a copy-link icon appears.
 * Clicking it writes `location.href#id` to the clipboard.
 */

'use client'

import { type ReactNode, useState } from 'react'

interface ConceptProps {
  id: string
  children: ReactNode
}

export function Concept({ id, children }: ConceptProps) {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    const url = `${location.origin}${location.pathname}#${id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <span id={id} className="skin-concept">
      <span className="skin-concept-term">{children}</span>
      <button
        type="button"
        className="skin-concept-copy"
        onClick={copyLink}
        aria-label={`Copy link to "${typeof children === 'string' ? children : id}"`}
        title={copied ? 'Copied!' : 'Copy link'}
      >
        {copied ? (
          // Checkmark
          <svg
            className="skin-concept-icon"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="3 8.5 6.5 12 13 5" />
          </svg>
        ) : (
          // Link icon
          <svg
            className="skin-concept-icon"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6.5 9.5a3.5 3.5 0 0 0 4.95 0l2-2a3.5 3.5 0 0 0-4.95-4.95l-1.25 1.25" />
            <path d="M9.5 6.5a3.5 3.5 0 0 0-4.95 0l-2 2a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25" />
          </svg>
        )}
      </button>
    </span>
  )
}
