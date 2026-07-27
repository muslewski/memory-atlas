import { describe, expect, it } from 'vitest'
import { linkifyWikilinks } from './wikilinks-md'

const resolve = (t: string) =>
  t === 'auth' ? '/auth' : t === 'data-spine' ? '/source/map/zones/data-spine.md' : null

describe('linkifyWikilinks', () => {
  it('turns a resolvable wikilink into a markdown link, using the alias as text', () => {
    expect(linkifyWikilinks('see [[auth|Authentication]] now', resolve)).toBe(
      'see [Authentication](/auth) now',
    )
  })
  it('uses the target as text when no alias, stripping #heading', () => {
    expect(linkifyWikilinks('[[data-spine#tables]]', resolve)).toBe(
      '[data-spine](/source/map/zones/data-spine.md)',
    )
  })
  it('leaves an unresolved wikilink literal (inert — never an invented link)', () => {
    expect(linkifyWikilinks('[[does-not-exist]]', resolve)).toBe('[[does-not-exist]]')
  })
  it('does not rewrite wikilinks inside inline code', () => {
    expect(linkifyWikilinks('`[[auth]]`', resolve)).toBe('`[[auth]]`')
  })
  it('does not rewrite wikilinks inside fenced code', () => {
    const md = '```\n[[auth]]\n```'
    expect(linkifyWikilinks(md, resolve)).toBe(md)
  })
})
