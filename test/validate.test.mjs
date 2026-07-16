import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  extractLinks,
  isExcludePathspec,
  noteIdAliases,
  renderIndex,
  validate,
} from '../lib/validate.mjs'

function fakeResolvers(overrides = {}) {
  return {
    glob: () => true,
    changedSince: () => false,
    ...overrides,
  }
}

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

describe('isExcludePathspec', () => {
  test('recognizes :(exclude) and :! prefixes', () => {
    assert.ok(isExcludePathspec(':(exclude)src/legacy/**'))
    assert.ok(isExcludePathspec(':!src/legacy/**'))
    assert.ok(!isExcludePathspec('src/checkout/**'))
  })
})

describe('noteIdAliases', () => {
  test('a dated note registers both the full id and the date-stripped alias', () => {
    assert.deepEqual(noteIdAliases('2026-05-20-x-design'), ['2026-05-20-x-design', 'x-design'])
  })

  test('an undated note registers only itself', () => {
    assert.deepEqual(noteIdAliases('checkout'), ['checkout'])
  })
})

describe('extractLinks', () => {
  test('extracts slugs and strips |alias', () => {
    assert.deepEqual(extractLinks('[[some-zone|Some Zone]]'), ['some-zone'])
  })

  test('handles arrays, ignores non-wikilink strings', () => {
    assert.deepEqual(extractLinks(['[[a]]', 'plain text', '[[b]]']), ['a', 'b'])
  })

  test('returns [] for null/undefined', () => {
    assert.deepEqual(extractLinks(undefined), [])
    assert.deepEqual(extractLinks(null), [])
  })
})

describe('validate — anchor classes', () => {
  test('glob with no tracked-file match is a hard error', () => {
    const z = zone({ owns: { globs: ['src/nope/**'] } })
    const r = fakeResolvers({ glob: () => false })
    const { errors } = validate([z], [], r)
    assert.ok(errors.some((e) => e.includes('glob "src/nope/**" matches no tracked files')))
  })

  test('glob matching a tracked file produces no error', () => {
    const z = zone({ owns: { globs: ['src/checkout/**'] } })
    const r = fakeResolvers({ glob: () => true })
    const { errors } = validate([z], [], r)
    assert.equal(errors.length, 0)
  })

  test('owns.testids present but the anchor class is unconfigured -> warning, not error', () => {
    const z = zone({ owns: { testids: ['checkout-submit'] } })
    const r = fakeResolvers() // no `testid` resolver present => class unconfigured
    const { errors, warnings } = validate([z], [], r)
    assert.equal(errors.length, 0)
    assert.ok(
      warnings.some((w) => w.includes('owns.testids present but anchor class not configured')),
    )
  })

  test('owns.tools present but unconfigured -> warning', () => {
    const z = zone({ owns: { tools: ['some-tool'] } })
    const { warnings } = validate([z], [], fakeResolvers())
    assert.ok(
      warnings.some((w) => w.includes('owns.tools present but anchor class not configured')),
    )
  })

  test('owns.routes present but unconfigured -> warning', () => {
    const z = zone({ owns: { routes: ['/checkout'] } })
    const { warnings } = validate([z], [], fakeResolvers())
    assert.ok(
      warnings.some((w) => w.includes('owns.routes present but anchor class not configured')),
    )
  })

  test('configured testid class: missing testid is a hard error', () => {
    const z = zone({ owns: { testids: ['missing-id'] } })
    const r = fakeResolvers({ testid: () => false })
    const { errors } = validate([z], [], r)
    assert.ok(errors.some((e) => e.includes('testid "missing-id" not found')))
  })

  test('configured route class: unresolved route is a soft warning, never an error', () => {
    const z = zone({ owns: { routes: ['/checkout'] } })
    const r = fakeResolvers({ route: () => false })
    const { errors, warnings } = validate([z], [], r)
    assert.equal(errors.length, 0)
    assert.ok(warnings.some((w) => w.includes('route "/checkout" not confidently resolved')))
  })

  test('invariant with no enforcedBy is a warning', () => {
    const z = zone({ invariants: [{ rule: 'totals stay integers', enforcedBy: [] }] })
    const { warnings } = validate([z], [], fakeResolvers())
    assert.ok(
      warnings.some((w) => w.includes('invariant "totals stay integers" has no enforcedBy')),
    )
  })

  test('exclude pathspec is skipped for the existence check but kept in changedSince args', () => {
    let seenGlobArgs
    const z = zone({
      owns: { globs: ['src/checkout/**', ':(exclude)src/checkout/legacy/**'] },
    })
    const r = fakeResolvers({
      glob: (g) => {
        assert.notEqual(
          g,
          ':(exclude)src/checkout/legacy/**',
          'glob() must never see an exclude pathspec',
        )
        return true
      },
      changedSince: (_sha, globs) => {
        seenGlobArgs = globs
        return false
      },
    })
    const { errors } = validate([z], [], r)
    assert.equal(errors.length, 0)
    assert.ok(seenGlobArgs.includes(':(exclude)src/checkout/legacy/**'))
    assert.ok(seenGlobArgs.includes('src/checkout/**'))
  })
})

describe('validate — verifiedAt encoding + freshness tri-state', () => {
  test('seeded + unverified -> freshness "seeded", no error', () => {
    const z = zone({ status: 'seeded', verifiedAt: 'unverified' })
    const { errors, rows } = validate([z], [], fakeResolvers())
    assert.equal(errors.length, 0)
    assert.equal(rows[0].freshness, 'seeded')
  })

  test('seeded + a SHA is a hard error', () => {
    const z = zone({ status: 'seeded', verifiedAt: 'abc1234' })
    const { errors } = validate([z], [], fakeResolvers())
    assert.ok(errors.some((e) => e.includes('status "seeded" requires verifiedAt "unverified"')))
  })

  test('active + unverified is a hard error', () => {
    const z = zone({ status: 'active', verifiedAt: 'unverified' })
    const { errors } = validate([z], [], fakeResolvers())
    assert.ok(errors.some((e) => e.includes('requires a commit SHA')))
  })

  test('active + fresh SHA -> freshness "ok"', () => {
    const z = zone({ status: 'active', verifiedAt: 'abc1234' })
    const r = fakeResolvers({ changedSince: () => false })
    const { errors, rows } = validate([z], [], r)
    assert.equal(errors.length, 0)
    assert.equal(rows[0].freshness, 'ok')
  })

  test('active + changed-since-verified -> freshness "⚠ stale"', () => {
    const z = zone({ status: 'active', verifiedAt: 'abc1234' })
    const r = fakeResolvers({ changedSince: () => true })
    const { rows } = validate([z], [], r)
    assert.equal(rows[0].freshness, '⚠ stale')
  })

  test('unknown-sha sentinel -> warning, freshness stays "⚠ stale" (never silently fresh)', () => {
    const z = zone({ status: 'active', verifiedAt: 'deadbee' })
    const r = fakeResolvers({ changedSince: () => 'unknown-sha' })
    const { warnings, rows } = validate([z], [], r)
    assert.ok(warnings.some((w) => w.includes('verifiedAt deadbee not found in history')))
    assert.equal(rows[0].freshness, '⚠ stale')
  })
})

describe('validate — unmounted zones (SPEC.md verifiedAt amendment)', () => {
  test('unmounted zone with a SHA verifiedAt: no error, no row, attic entry, changedSince never called', () => {
    const z = zone({ status: 'unmounted', verifiedAt: 'abc1234' })
    let called = false
    const r = fakeResolvers({
      changedSince: () => {
        called = true
        return true
      },
    })
    const { errors, warnings, rows, attic } = validate([z], [], r)
    assert.equal(errors.length, 0)
    assert.equal(rows.length, 0)
    assert.equal(called, false, 'staleness check must never run against an unmounted zone')
    assert.equal(attic.length, 1)
    assert.equal(attic[0].id, 'checkout')
    assert.equal(attic[0].kind, 'zone')
    assert.equal(warnings.length, 0)
  })

  test('unmounted zone with verifiedAt "unverified": also legal, no error', () => {
    const z = zone({ status: 'unmounted', verifiedAt: 'unverified' })
    const { errors, rows, attic } = validate([z], [], fakeResolvers())
    assert.equal(errors.length, 0)
    assert.equal(rows.length, 0)
    assert.equal(attic.length, 1)
  })

  test('unmounted zone whose globs match no tracked files: the glob-existence check must not run at all (the canonical tombstone case)', () => {
    const z = zone({ status: 'unmounted', owns: { globs: ['src/deleted-module/**'] } })
    const r = fakeResolvers({ glob: () => false }) // every glob "misses" — the canonical tombstone shape
    const { errors, warnings, rows, attic } = validate([z], [], r)
    assert.equal(errors.length, 0, 'an unmounted zone must be exempt from owns.globs existence too')
    assert.equal(rows.length, 0)
    assert.equal(attic.length, 1)
    assert.equal(warnings.length, 0)
  })

  test('unmounted zone with unconfigured testids/tools/routes classes present: no warnings either — anchors are not evaluated at all', () => {
    const z = zone({
      status: 'unmounted',
      owns: { globs: ['src/gone/**'], testids: ['x'], tools: ['y'], routes: ['/z'] },
      invariants: [{ rule: 'no-op', enforcedBy: [] }],
    })
    const r = fakeResolvers({ glob: () => false })
    const { errors, warnings, attic } = validate([z], [], r)
    assert.equal(errors.length, 0)
    assert.equal(warnings.length, 0)
    assert.equal(attic.length, 1)
  })

  test('unmounted flow/decision also land in attic via the graph param', () => {
    const flow = { id: 'checkout-flow', status: 'unmounted', summary: 'old flow' }
    const decision = { id: '2026-01-01-old-choice', status: 'unmounted', summary: 'superseded' }
    const { attic } = validate([], [flow], fakeResolvers(), { decisions: [decision] })
    assert.ok(attic.some((a) => a.id === 'checkout-flow' && a.kind === 'flow'))
    assert.ok(attic.some((a) => a.id === '2026-01-01-old-choice' && a.kind === 'decision'))
  })
})

describe('validate — decision-number uniqueness', () => {
  test('duplicate decision numbers warn', () => {
    const decisions = [
      { id: '0013-a', status: 'active', summary: 'a' },
      { id: '0013-b', status: 'active', summary: 'b' },
      { id: '0014-c', status: 'active', summary: 'c' },
    ]
    const { errors, warnings } = validate([], [], fakeResolvers(), { decisions })
    assert.equal(errors.length, 0)
    const numWarns = warnings.filter((w) => w.includes('decision number'))
    assert.equal(numWarns.length, 1)
    assert.equal(numWarns[0], 'decision number 0013 reused: 0013-a, 0013-b')
  })

  test('unique numbers stay silent', () => {
    const decisions = [
      { id: '0001-a', status: 'active', summary: 'a' },
      { id: '0002-b', status: 'active', summary: 'b' },
    ]
    const { warnings } = validate([], [], fakeResolvers(), { decisions })
    assert.ok(!warnings.some((w) => w.includes('decision number')))
  })

  test('non-numbered decision ids are ignored', () => {
    const decisions = [
      { id: 'adr-foo', status: 'active', summary: 'a' },
      { id: '2026-01-01-old-choice', status: 'active', summary: 'b' },
      { id: 'no-prefix', status: 'active', summary: 'c' },
    ]
    const { warnings } = validate([], [], fakeResolvers(), { decisions })
    assert.ok(!warnings.some((w) => w.includes('decision number')))
  })
})

describe('validate — graph pass (soft, never affects errors)', () => {
  test('dangling link in related -> graph warning, never an error', () => {
    const z = zone({ related: ['[[nowhere]]'] })
    const { errors, graphWarnings } = validate([z], [], fakeResolvers())
    assert.equal(errors.length, 0)
    assert.ok(graphWarnings.some((w) => w.includes('dangling link [[nowhere]] in related')))
  })

  test('link resolves via the date-stripped alias (2026-05-20-x-design reachable as x-design)', () => {
    const z = zone({ id: 'checkout', related: ['[[x-design]]'] })
    const noteIds = new Set(noteIdAliases('2026-05-20-x-design'))
    const { graphWarnings } = validate([z], [], fakeResolvers(), { noteIds })
    assert.ok(!graphWarnings.some((w) => w.includes('dangling link')))
  })

  test('skills field is excluded from link checking entirely', () => {
    const z = zone({ skills: ['[[nowhere-skill]]'] })
    const { graphWarnings } = validate([z], [], fakeResolvers())
    assert.ok(!graphWarnings.some((w) => w.includes('nowhere-skill')))
  })

  test('advances -> realizedBy reciprocity: missing back-link is a graph warning', () => {
    const z = zone({ id: 'checkout', advances: ['[[speed]]'] })
    const pillar = { id: 'speed', status: 'active', realizedBy: [] }
    const noteIds = new Set([...noteIdAliases('checkout'), ...noteIdAliases('speed')])
    const { graphWarnings } = validate([z], [], fakeResolvers(), { noteIds, pillars: [pillar] })
    assert.ok(
      graphWarnings.some((w) =>
        w.includes('advances [[speed]] but pillar speed does not list it in realizedBy'),
      ),
    )
  })

  test('advances <-> realizedBy reciprocity satisfied: no warning either direction', () => {
    const z = zone({ id: 'checkout', advances: ['[[speed]]'] })
    const pillar = { id: 'speed', status: 'active', realizedBy: ['[[checkout]]'] }
    const noteIds = new Set([...noteIdAliases('checkout'), ...noteIdAliases('speed')])
    const { graphWarnings } = validate([z], [], fakeResolvers(), { noteIds, pillars: [pillar] })
    assert.ok(!graphWarnings.some((w) => w.includes('reciprocity') || w.includes('does not list')))
  })

  test('realizedBy -> advances reverse reciprocity check also fires', () => {
    const z = zone({ id: 'checkout', advances: [] })
    const pillar = { id: 'speed', status: 'active', realizedBy: ['[[checkout]]'] }
    const noteIds = new Set([...noteIdAliases('checkout'), ...noteIdAliases('speed')])
    const { graphWarnings } = validate([z], [], fakeResolvers(), { noteIds, pillars: [pillar] })
    assert.ok(
      graphWarnings.some((w) =>
        w.includes('realizedBy [[checkout]] but zone checkout does not list it in advances'),
      ),
    )
  })
})

describe('renderIndex', () => {
  test('renders banner, sorted table, and all four sections in order', () => {
    const md = renderIndex({
      rows: [
        { id: 'zebra', status: 'active', freshness: 'ok', summary: 'z' },
        { id: 'alpha', status: 'seeded', freshness: 'seeded', summary: 'a' },
      ],
      warnings: ['zone alpha: something'],
      graphWarnings: ['zone zebra: dangling link [[x]] in related'],
      attic: [{ id: 'old', kind: 'zone', summary: 'retired' }],
    })

    assert.match(md, /^<!-- GENERATED by atlas build — do not hand-edit\. -->/)
    assert.match(md, /# Atlas Map — index/)
    const alphaIdx = md.indexOf('| alpha |')
    const zebraIdx = md.indexOf('| zebra |')
    assert.ok(alphaIdx > 0 && zebraIdx > alphaIdx, 'rows must be sorted by id')
    assert.match(md, /## ⚠ Verification gaps/)
    assert.match(md, /## ⚠ Graph coherence/)
    assert.match(md, /## Attic \(unmounted\)/)
    assert.match(md, /- old \(zone\) — retired/)

    const gapsIdx = md.indexOf('## ⚠ Verification gaps')
    const graphIdx = md.indexOf('## ⚠ Graph coherence')
    const atticIdx = md.indexOf('## Attic')
    assert.ok(gapsIdx < graphIdx && graphIdx < atticIdx, 'sections must appear in spec order')
  })

  test('empty warnings/graphWarnings/attic render a placeholder, not a broken list', () => {
    const md = renderIndex({ rows: [] })
    assert.match(md, /## ⚠ Verification gaps\n\n_none_/)
    assert.match(md, /## ⚠ Graph coherence\n\n_none_/)
    assert.match(md, /## Attic \(unmounted\)\n\n_none_/)
  })

  test('renderIndex ledger section counts and recency', () => {
    const specs = [
      { id: '2026-07-01-a', status: 'draft' },
      { id: '2026-07-10-b', status: 'approved' },
      { id: '2026-06-01-old', status: 'draft' },
    ]
    const plans = [
      { id: '2026-07-15-c', status: 'ready' },
      { id: '2026-07-20-d', status: 'done' },
    ]
    // 11 dated reports to exercise the 10-item recency cap.
    const reports = []
    for (let i = 1; i <= 11; i++) {
      const day = String(i).padStart(2, '0')
      reports.push({ id: `2026-05-${day}-r${i}`, status: 'snapshot' })
    }
    const decisions = [
      { id: '0001-choice', status: 'active' },
      { id: '0002-other', status: 'unmounted' },
    ]

    const md = renderIndex({ rows: [] }, { specs, plans, reports, decisions })

    assert.match(md, /## Ledger/)
    assert.match(md, /specs: 3 \(approved 1 · draft 2\)/)
    assert.match(md, /plans: 2 \(done 1 · ready 1\)/)
    assert.match(md, /reports: 11 \(snapshot 11\)/)
    assert.match(md, /decisions: 2 \(active 1 · unmounted 1\)/)

    // Newest-first date-prefixed across specs/plans/reports, capped at 10.
    const ledger = md.slice(md.indexOf('## Ledger'))
    const linkMatches = [...ledger.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1])
    assert.equal(linkMatches.length, 10)
    assert.equal(linkMatches[0], '2026-07-20-d')
    assert.equal(linkMatches[1], '2026-07-15-c')
    assert.equal(linkMatches[2], '2026-07-10-b')
    assert.equal(linkMatches[3], '2026-07-01-a')
    assert.equal(linkMatches[4], '2026-06-01-old')
    // Decision NNNN- ids are not date-prefixed YYYY-MM-DD and stay out of recency.
    assert.ok(!linkMatches.includes('0001-choice'))
    // 11th-oldest report falls off the cap.
    assert.ok(!linkMatches.includes('2026-05-01-r1'))
  })

  test('renderIndex without ledger arg is unchanged', () => {
    const withEmpty = renderIndex({
      rows: [{ id: 'alpha', status: 'active', freshness: 'ok', summary: 'a' }],
    })
    const withExplicitEmpty = renderIndex(
      { rows: [{ id: 'alpha', status: 'active', freshness: 'ok', summary: 'a' }] },
      {},
    )
    assert.equal(withEmpty, withExplicitEmpty)
    assert.doesNotMatch(withEmpty, /## Ledger/)
  })
})

describe('renderIndex — Verification gaps lists stale/seeded zones (SPEC.md §6 item 2)', () => {
  function gapsSection(md) {
    return md.slice(md.indexOf('## ⚠ Verification gaps'), md.indexOf('## ⚠ Graph coherence'))
  }

  test('a stale zone and a seeded zone both appear in Verification gaps, not just _none_', () => {
    const md = renderIndex({
      rows: [
        { id: 'checkout', status: 'active', freshness: '⚠ stale', summary: 'x' },
        { id: 'billing', status: 'seeded', freshness: 'seeded', summary: 'y' },
        { id: 'auth', status: 'active', freshness: 'ok', summary: 'z' },
      ],
    })
    const gaps = gapsSection(md)
    assert.match(gaps, /checkout/, 'the stale zone must be listed')
    assert.match(gaps, /billing/, 'the seeded zone must be listed')
    assert.doesNotMatch(gaps, /_none_/)
    assert.doesNotMatch(gaps, /auth/, 'a fresh ("ok") zone must not be listed as a gap')
  })

  test('non-graph warnings still appear alongside stale/seeded zone entries', () => {
    const md = renderIndex({
      rows: [{ id: 'checkout', status: 'active', freshness: '⚠ stale', summary: 'x' }],
      warnings: ['zone checkout: invariant "x" has no enforcedBy → file tech-debt'],
    })
    const gaps = gapsSection(md)
    assert.match(gaps, /checkout.*⚠ stale|⚠ stale.*checkout/s)
    assert.match(gaps, /invariant "x" has no enforcedBy/)
  })

  test('_none_ only when genuinely clean: no stale/seeded rows and no warnings', () => {
    const md = renderIndex({
      rows: [{ id: 'auth', status: 'active', freshness: 'ok', summary: 'z' }],
    })
    assert.match(gapsSection(md), /_none_/)
  })
})
