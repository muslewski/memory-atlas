import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  buildInboundCounts,
  checkBrokenLinks,
  checkHeaders,
  checkOrphans,
  checkSummary,
  findOwnershipConflicts,
  ZONE_REQUIRED_HEADERS,
} from '../lib/corpus.mjs'
import { validate } from '../lib/validate.mjs'

function zone(overrides = {}) {
  return {
    id: 'checkout',
    type: 'zone',
    summary: 'the checkout flow',
    status: 'active',
    verifiedAt: 'abc1234',
    owns: {},
    invariants: [],
    ...overrides,
  }
}

function fakeResolvers(overrides = {}) {
  return {
    glob: () => true,
    changedSince: () => false,
    ...overrides,
  }
}

/** Identity expand: each positive glob resolves to a file of the same name. */
function identityFilesFor(globs) {
  return (globs ?? []).filter((g) => g && !g.startsWith(':(exclude)') && !g.startsWith(':!'))
}

describe('findOwnershipConflicts', () => {
  test('flags a file owned by two zones — names both zones and the file', () => {
    const violations = findOwnershipConflicts(
      [
        zone({ id: 'timeline', owns: { globs: ['a.ts', 'b.ts'] } }),
        zone({ id: 'tracks', owns: { globs: ['b.ts', 'c.ts'] } }),
      ],
      identityFilesFor,
    )
    assert.equal(violations.length, 1)
    assert.match(violations[0].message, /b\.ts/)
    assert.match(violations[0].message, /timeline/)
    assert.match(violations[0].message, /tracks/)
    assert.ok(violations[0].zoneId === 'timeline' || violations[0].zoneId === 'tracks')
  })

  test('unmounted zone globs are ignored', () => {
    const violations = findOwnershipConflicts(
      [
        zone({ id: 'live', owns: { globs: ['shared.ts'] } }),
        zone({ id: 'retired', status: 'unmounted', owns: { globs: ['shared.ts'] } }),
      ],
      identityFilesFor,
    )
    assert.equal(violations.length, 0)
  })

  test('exclude pathspecs are not treated as ownership claims', () => {
    // filesFor returns [] for exclude-only / skips excludes — identity filter matches that.
    const violations = findOwnershipConflicts(
      [
        zone({
          id: 'a',
          owns: { globs: ['src/**', ':(exclude)src/skip.ts'] },
        }),
        zone({
          id: 'b',
          owns: { globs: [':!other.ts'] },
        }),
      ],
      identityFilesFor,
    )
    // a claims src/** only; b claims nothing after exclude filter → no conflict
    assert.equal(violations.length, 0)
  })

  test('disjoint globs stay silent', () => {
    const violations = findOwnershipConflicts(
      [zone({ id: 'a', owns: { globs: ['x.ts'] } }), zone({ id: 'b', owns: { globs: ['y.ts'] } })],
      identityFilesFor,
    )
    assert.equal(violations.length, 0)
  })
})

describe('validate — ownership SSOT', () => {
  test('two mounted zones claiming the same file → hard error naming both', () => {
    const zones = [
      zone({ id: 'timeline', owns: { globs: ['shared.ts'] } }),
      zone({ id: 'tracks', owns: { globs: ['shared.ts'] } }),
    ]
    const r = fakeResolvers({
      filesFor: identityFilesFor,
    })
    const { errors } = validate(zones, [], r)
    assert.ok(
      errors.some((e) => e.includes('shared.ts') && e.includes('timeline') && e.includes('tracks')),
      `expected ownership error, got: ${JSON.stringify(errors)}`,
    )
  })

  test('unmounted zone sharing a glob with a mounted zone is not an ownership error', () => {
    const zones = [
      zone({ id: 'live', owns: { globs: ['shared.ts'] } }),
      zone({ id: 'retired', status: 'unmounted', owns: { globs: ['shared.ts'] } }),
    ]
    const r = fakeResolvers({ filesFor: identityFilesFor })
    const { errors } = validate(zones, [], r)
    assert.ok(!errors.some((e) => e.includes('owned by') || e.includes('ownership')))
  })

  test('check.ownership: false disables the ownership pass even when filesFor is present', () => {
    const zones = [
      zone({ id: 'timeline', owns: { globs: ['shared.ts'] } }),
      zone({ id: 'tracks', owns: { globs: ['shared.ts'] } }),
    ]
    const r = fakeResolvers({ filesFor: identityFilesFor })
    const { errors } = validate(zones, [], r, { check: { ownership: false } })
    assert.ok(!errors.some((e) => e.includes('shared.ts') && e.includes('owned by')))
  })

  test('no filesFor resolver → ownership pass is skipped (unit-test seam)', () => {
    const zones = [
      zone({ id: 'timeline', owns: { globs: ['shared.ts'] } }),
      zone({ id: 'tracks', owns: { globs: ['shared.ts'] } }),
    ]
    const { errors } = validate(zones, [], fakeResolvers())
    assert.ok(!errors.some((e) => e.includes('owned by')))
  })

  test('disjoint globs → silent', () => {
    const zones = [
      zone({ id: 'a', owns: { globs: ['x.ts'] } }),
      zone({ id: 'b', owns: { globs: ['y.ts'] } }),
    ]
    const r = fakeResolvers({ filesFor: identityFilesFor })
    const { errors } = validate(zones, [], r)
    assert.ok(!errors.some((e) => e.includes('owned by')))
  })
})

const FULL_HEADERS = ZONE_REQUIRED_HEADERS.map((h) => `## ${h}\n\n`).join('')

describe('checkSummary', () => {
  test('missing/empty summary is a violation', () => {
    assert.equal(checkSummary(zone({ summary: '' }), { maxSummaryLen: 500 }).length, 1)
    assert.equal(checkSummary(zone({ summary: '   ' }), { maxSummaryLen: 500 }).length, 1)
    assert.equal(checkSummary(zone({ summary: undefined }), { maxSummaryLen: 500 }).length, 1)
  })

  test('summary over the cap is a violation', () => {
    const long = 'x'.repeat(501)
    const v = checkSummary(zone({ summary: long }), { maxSummaryLen: 500 })
    assert.equal(v.length, 1)
    assert.match(v[0].message, /501/)
    assert.match(v[0].message, /500/)
  })

  test('crisp summary within cap is silent', () => {
    assert.equal(
      checkSummary(zone({ summary: 'short and useful' }), { maxSummaryLen: 500 }).length,
      0,
    )
  })
})

describe('checkHeaders', () => {
  test('missing a required zone template section is a violation', () => {
    const z = zone({ body: '## What this is\n\nonly one section\n' })
    const v = checkHeaders(z)
    assert.ok(v.length >= 1)
    assert.ok(v.some((x) => x.message.includes('Anchors') || x.rule === 'headers'))
  })

  test('all required sections present is silent', () => {
    const z = zone({ body: FULL_HEADERS })
    assert.equal(checkHeaders(z).length, 0)
  })
})

describe('checkBrokenLinks', () => {
  test('body wikilink to nowhere is a violation', () => {
    const z = zone({ body: 'see [[no-such-note]] for context\n' })
    const noteIds = new Set(['checkout', 'other'])
    const v = checkBrokenLinks(z, noteIds)
    assert.equal(v.length, 1)
    assert.match(v[0].message, /no-such-note/)
  })

  test('body wikilink that resolves via note id is silent', () => {
    const z = zone({ body: 'see [[other]]\n' })
    const noteIds = new Set(['checkout', 'other'])
    assert.equal(checkBrokenLinks(z, noteIds).length, 0)
  })
})

describe('buildInboundCounts + checkOrphans', () => {
  test('mounted zone with zero inbound links is an orphan', () => {
    const orphan = zone({ id: 'lonely', body: FULL_HEADERS })
    const inbound = buildInboundCounts([orphan])
    const v = checkOrphans(orphan, inbound)
    assert.equal(v.length, 1)
    assert.match(v[0].message, /orphan|inbound/i)
  })

  test('zone linked from another note is not an orphan', () => {
    const target = zone({ id: 'hub', body: FULL_HEADERS })
    const linker = zone({ id: 'spoke', body: `${FULL_HEADERS}\nSee [[hub]].\n` })
    const inbound = buildInboundCounts([target, linker])
    assert.equal(checkOrphans(target, inbound).length, 0)
  })
})
