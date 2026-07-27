import { render, screen } from '@testing-library/react'
import ReactMarkdown from 'react-markdown'
import { MemoryRouter } from 'react-router-dom'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { describe, expect, it } from 'vitest'
import { extractRaw, isAllowedNotePath, noteKeys, SourceBody } from './SourceView'

describe('isAllowedNotePath', () => {
  const keys = ['specs/a.md', 'ideas/b.md']
  it('accepts a known vault path', () => expect(isAllowedNotePath('specs/a.md', keys)).toBe(true))
  it('rejects traversal', () => {
    expect(isAllowedNotePath('../../etc/passwd', keys)).toBe(false)
    expect(isAllowedNotePath('specs/../../../etc/passwd', keys)).toBe(false)
  })
  it('rejects an unknown in-vault path', () =>
    expect(isAllowedNotePath('specs/x.md', keys)).toBe(false))
})

describe('noteKeys (real glob — depth check)', () => {
  it('includes a known vault note from specs/', () => {
    expect(noteKeys).toContain('specs/2026-06-23-syndcast-skills-v1-design.md')
  })

  it('includes the visual-connections spec added in task 4', () => {
    expect(noteKeys).toContain('specs/2026-06-24-visual-connections-outbound-nav-design.md')
  })

  it('includes map zones and root product notes (reader surface)', () => {
    expect(noteKeys.some((k) => k.startsWith('map/zones/'))).toBe(true)
    expect(noteKeys).toContain('BACKLOG.md')
  })

  it('excludes non-note-bearing dirs (human-drafts, templates, visuals)', () => {
    const bad = noteKeys.filter(
      (k) =>
        k.startsWith('human-drafts/') ||
        k.startsWith('templates/') ||
        k.startsWith('visuals/') ||
        k.startsWith('llms.txt/'),
    )
    expect(bad).toHaveLength(0)
  })

  it('contains no visuals/app/ keys (allowlist excludes visuals/)', () => {
    const bad = noteKeys.filter((k) => k.startsWith('visuals/app/'))
    expect(bad).toHaveLength(0)
  })

  it('contains no node_modules keys', () => {
    const bad = noteKeys.filter((k) => k.includes('node_modules'))
    expect(bad).toHaveLength(0)
  })

  it('all entries end in .md', () => {
    const nonMd = noteKeys.filter((k) => !k.endsWith('.md'))
    expect(nonMd).toHaveLength(0)
  })

  it('no entry has a leading slash', () => {
    const leading = noteKeys.filter((k) => k.startsWith('/'))
    expect(leading).toHaveLength(0)
  })

  it('no entry contains ..', () => {
    const traversal = noteKeys.filter((k) => k.includes('..'))
    expect(traversal).toHaveLength(0)
  })
})

describe('extractRaw (the [object Object] crash fix)', () => {
  it('returns a plain string unchanged', () => {
    expect(extractRaw('# hello')).toBe('# hello')
  })
  it('unwraps a Vite ?raw module namespace { default: string }', () => {
    // This is the real browser shape that caused "Unexpected value [object Object]
    // for children" — the old `as string` cast passed this object to react-markdown.
    expect(extractRaw({ default: '# hello' })).toBe('# hello')
  })
  it('returns null for an object without a string default', () => {
    expect(extractRaw({ default: 123 })).toBeNull()
    expect(extractRaw({})).toBeNull()
  })
  it('returns null for non-string, non-module values', () => {
    expect(extractRaw(() => {})).toBeNull()
    expect(extractRaw(null)).toBeNull()
    expect(extractRaw(undefined)).toBeNull()
  })
})

describe('Sanitization (rehypeSanitize plugin)', () => {
  it('strips active HTML from rendered markdown — same plugin config as SourceView uses', () => {
    // This test asserts that the SourceView pipeline (ReactMarkdown + remarkGfm + rehypeSanitize)
    // note: task2 rename touched SourceView.test.tsx per scope list
    // removes dangerous HTML and event handlers. We render the exact plugin chain here.
    const maliciousMarkdown = `
<script>alert(1)</script>

<img src="x" onerror="alert(1)" />

[dangerous link](javascript:alert(1))
`

    const { container } = render(
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {maliciousMarkdown}
      </ReactMarkdown>,
    )

    // Assert: no <script> element rendered
    expect(container.querySelector('script')).toBe(null)

    // Assert: any rendered <img> has no onerror attribute
    const imgs = container.querySelectorAll('img')
    imgs.forEach((img) => {
      expect(img.hasAttribute('onerror')).toBe(false)
    })

    // Assert: any anchor does NOT have javascript: in href
    const anchors = container.querySelectorAll('a')
    anchors.forEach((a) => {
      const href = a.getAttribute('href')
      if (href) {
        expect(href).not.toMatch(/^javascript:/)
      }
    })
  })
})

describe('SourceBody typeset', () => {
  it('renders the markdown body inside a .typeset container', async () => {
    render(
      <MemoryRouter>
        <SourceBody relPath="specs/2026-07-11-visuals-typeset-migration-design.md" />
      </MemoryRouter>,
    )
    const article = await screen.findByTestId('note-body')
    expect(article.className).toContain('typeset')
    expect(article.className).toContain('typeset-measure')
  })

  it('wraps source content in .source-view so measure matches illustrated column', async () => {
    render(
      <MemoryRouter>
        <SourceBody relPath="specs/2026-07-11-visuals-typeset-migration-design.md" />
      </MemoryRouter>,
    )
    const shell = await screen.findByTestId('source-view')
    expect(shell.className).toContain('source-view')
    expect(shell.querySelector('[data-testid="note-body"]')).toBeTruthy()
  })
})
