import { describe, expect, it } from 'vitest'
import { extractBodyLinks, resolveOutbound, stripLink } from './wikilinks'

const VAULT = [
  'specs/2026-06-23-syndcast-skills-v1-design.md',
  'programs/2026-06-23-the-set-production-lifecycle-program.md',
  'map/zones/billing-credits.md',
  'syndcast-clip-types/CLIP-TYPES.md',
  'a/spec.md',
  'b/spec.md', // basename collision
  'ideas/2026-01-01-old-dup.md',
  'ideas/2026-09-09-old-dup.md', // date-dup
]

describe('stripLink', () => {
  it('strips alias/heading/block', () => {
    expect(stripLink('note|shown')).toBe('note')
    expect(stripLink('note#heading')).toBe('note')
    expect(stripLink('note^block')).toBe('note')
    expect(stripLink('folder/Note#h')).toBe('folder/Note')
  })
})

describe('extractBodyLinks', () => {
  it('finds links, dedupes, keeps order, includes embeds', () => {
    expect(extractBodyLinks('see [[a]] then [[b]] and ![[a]]')).toEqual(['a', 'b'])
  })
  it('excludes links inside inline code and fenced code', () => {
    expect(extractBodyLinks('real [[a]]\n`[[code]]`\n```\n[[fenced]]\n```')).toEqual(['a'])
  })
  it('excludes links inside double-backtick inline code', () => {
    expect(extractBodyLinks('real [[a]] ``[[x]]``')).toEqual(['a'])
  })
})

describe('resolveOutbound', () => {
  it('resolves a plain slug to its note', () => {
    const r = resolveOutbound('[[2026-06-23-syndcast-skills-v1-design]]', VAULT)[0]
    expect(r).toMatchObject({ exists: true, path: 'specs/2026-06-23-syndcast-skills-v1-design.md' })
  })
  it('resolves a path-style link by last segment', () => {
    const r = resolveOutbound('[[syndcast-clip-types/CLIP-TYPES]]', VAULT)[0]
    expect(r).toMatchObject({ exists: true, path: 'syndcast-clip-types/CLIP-TYPES.md' })
  })
  it('marks nonexistent targets', () => {
    expect(resolveOutbound('[[totally-missing]]', VAULT)[0]).toMatchObject({
      exists: false,
      path: null,
    })
  })
  it('path-qualified link wins a basename collision (no ambiguity)', () => {
    const r = resolveOutbound('[[a/spec]]', VAULT)[0]
    expect(r).toMatchObject({ exists: true, path: 'a/spec.md', ambiguous: false })
  })
  it('bare collision picks deterministically and flags ambiguous', () => {
    const r = resolveOutbound('[[spec]]', VAULT)[0]
    expect(r.exists).toBe(true)
    expect(r.ambiguous).toBe(true)
    expect(['a/spec.md', 'b/spec.md']).toContain(r.path)
  })
  it('date-dup tiebreak also asserts ambiguous', () => {
    const r = resolveOutbound('[[old-dup]]', VAULT)[0]
    expect(r.path).toBe('ideas/2026-09-09-old-dup.md')
    expect(r.ambiguous).toBe(true)
  })
  it('date-dup tiebreak picks the newest date prefix', () => {
    const r = resolveOutbound('[[old-dup]]', VAULT)[0]
    expect(r.path).toBe('ideas/2026-09-09-old-dup.md')
  })
  it('resolves alias input: returns both raw and slug', () => {
    const r = resolveOutbound('[[2026-06-23-syndcast-skills-v1-design|Skills]]', VAULT)[0]
    expect(r).toMatchObject({
      raw: '2026-06-23-syndcast-skills-v1-design|Skills',
      slug: '2026-06-23-syndcast-skills-v1-design',
      exists: true,
      path: 'specs/2026-06-23-syndcast-skills-v1-design.md',
    })
  })
})
