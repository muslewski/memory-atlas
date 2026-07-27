import { describe, expect, it } from 'vitest'
import { deriveHeadings, deriveHook, deriveMetrics, deriveTags, slugify } from './derive'

describe('slugify', () => {
  it('kebabs a heading into a stable anchor id', () => {
    expect(slugify('The three tiers')).toBe('the-three-tiers')
  })
  it('strips punctuation and collapses runs', () => {
    expect(slugify('Kit — what `Typeset` absorbs!')).toBe('kit-what-typeset-absorbs')
  })
})

describe('deriveHeadings', () => {
  it('collects h2 and h3 with stable ids', () => {
    const body = '# Title\n\n## The three tiers\n\ntext\n\n### Substrate\n\n#### too deep\n'
    expect(deriveHeadings(body)).toEqual([
      { depth: 2, text: 'The three tiers', id: 'the-three-tiers' },
      { depth: 3, text: 'Substrate', id: 'substrate' },
    ])
  })

  it('ignores headings inside fenced code blocks', () => {
    const body = '## Real\n\n```md\n## Fake\n```\n'
    expect(deriveHeadings(body)).toEqual([{ depth: 2, text: 'Real', id: 'real' }])
  })

  it('returns an empty list for a note with no headings', () => {
    expect(deriveHeadings('just a paragraph')).toEqual([])
  })
})

describe('deriveMetrics', () => {
  it('reads only real frontmatter fields — never invents one', () => {
    expect(deriveMetrics({ type: 'spec', status: 'draft', created: '2026-07-11' })).toEqual([
      { label: 'Type', value: 'spec', icon: 'file-text' },
      { label: 'Status', value: 'draft', icon: 'clock' },
      { label: 'Date', value: '2026-07-11', icon: 'calendar' },
    ])
  })

  it('omits a metric whose field is absent', () => {
    expect(deriveMetrics({ type: 'plan' })).toEqual([
      { label: 'Type', value: 'plan', icon: 'file-text' },
    ])
  })

  it('returns an empty list for frontmatter-less notes', () => {
    expect(deriveMetrics({})).toEqual([])
  })

  // 19% of the vault dates itself with `date`, not `created`. Keying only on `created`
  // made ~200 notes look undated.
  it('falls back to `date` when `created` is absent', () => {
    expect(deriveMetrics({ date: '2026-01-02' })).toEqual([
      { label: 'Date', value: '2026-01-02', icon: 'calendar' },
    ])
  })

  it('prefers `created` over `date`, and never emits both', () => {
    expect(deriveMetrics({ created: '2026-07-11', date: '2026-01-02' })).toEqual([
      { label: 'Date', value: '2026-07-11', icon: 'calendar' },
    ])
  })
})

describe('deriveHook', () => {
  it('uses the note’s own summary as the hero hook', () => {
    expect(deriveHook({ summary: 'The engine, re-founded.' })).toBe('The engine, re-founded.')
  })

  it('returns undefined when there is no summary — never invents one', () => {
    expect(deriveHook({})).toBeUndefined()
    expect(deriveHook({ summary: '   ' })).toBeUndefined()
  })
})

describe('deriveTags', () => {
  it('returns frontmatter tags', () => {
    expect(deriveTags({ tags: ['visuals', 'typeset'] })).toEqual(['visuals', 'typeset'])
  })

  it('returns an empty list when tags are absent or malformed', () => {
    expect(deriveTags({})).toEqual([])
    expect(deriveTags({ tags: 'not-a-list' })).toEqual([])
  })
})
