import { describe, expect, it } from 'vitest'
import { joinOutbound } from './build-manifest'

describe('joinOutbound', () => {
  const digests = new Map([['specs/skills.md', { route: '/specs/skills', title: 'Skills v1' }]])
  // One note, one URL. Every outbound link points at the canonical /note/<relPath>,
  // illustrated or not — the illustrated view is a `?view=` on that URL, not a route of
  // its own. The legacy shapes (`/source/…`, `/:folder/:slug`) still redirect, but a
  // redirect exists for old bookmarks; we must not keep minting fresh links into it.
  it('illustrated target → canonical note route, illustrated true', () => {
    const r = joinOutbound([{ slug: 'skills', path: 'specs/skills.md', exists: true }], digests)
    expect(r[0]).toEqual({
      title: 'Skills v1',
      slug: 'skills',
      illustrated: true,
      route: '/note/specs/skills',
    })
  })
  it('existing non-illustrated target → the SAME canonical route, illustrated false', () => {
    const r = joinOutbound([{ slug: 'idea', path: 'ideas/idea.md', exists: true }], digests)
    expect(r[0]).toEqual({
      title: 'idea',
      slug: 'idea',
      illustrated: false,
      route: '/note/ideas/idea',
    })
  })
  it('missing target → route null', () => {
    const r = joinOutbound([{ slug: 'gone', path: null, exists: false }], digests)
    expect(r[0]).toEqual({ title: 'gone', slug: 'gone', illustrated: false, route: null })
  })
})
