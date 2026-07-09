import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter, setFrontmatterField } from '../lib/frontmatter.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.dirname(__dirname)

describe('parseFrontmatter', () => {
  test('parses the Plan 002 zone template verbatim', () => {
    const raw = fs.readFileSync(path.join(REPO_ROOT, 'templates', 'notes', 'zone.md'), 'utf8')
    const { data, body } = parseFrontmatter(raw)

    assert.equal(data.type, 'zone')
    assert.equal(data.status, 'seeded')
    assert.equal(data.verifiedAt, 'unverified')
    assert.deepEqual(data.owns, { routes: [], testids: [], globs: [], tools: [] })
    assert.deepEqual(data.depends, [])
    assert.deepEqual(data.invariants, [])
    assert.deepEqual(data.skills, [])
    assert.match(body, /## What this is/)
    assert.match(body, /## Lineage/)
  })

  test('round-trips owns.globs block array with exclude pathspecs', () => {
    const raw = `---
type: zone
summary: "checkout flow"
status: active
owns:
  globs:
    - "src/checkout/**"
    - ":(exclude)src/checkout/legacy/**"
  testids: []
---

body
`
    const { data } = parseFrontmatter(raw)
    assert.deepEqual(data.owns.globs, ['src/checkout/**', ':(exclude)src/checkout/legacy/**'])
  })

  test('round-trips invariants[0].rule and enforcedBy', () => {
    const raw = `---
type: zone
summary: "x"
status: active
invariants:
  - rule: "no writes outside src/checkout"
    enforcedBy: ["eslint:no-cross-zone"]
  - rule: "totals are integers (cents)"
    enforcedBy: []
---

body
`
    const { data } = parseFrontmatter(raw)
    assert.equal(data.invariants[0].rule, 'no writes outside src/checkout')
    assert.deepEqual(data.invariants[0].enforcedBy, ['eslint:no-cross-zone'])
    assert.equal(data.invariants[1].rule, 'totals are integers (cents)')
    assert.deepEqual(data.invariants[1].enforcedBy, [])
  })

  test('parses block arrays of scalars including wikilinks', () => {
    const raw = `---
type: zone
summary: "x"
status: active
related:
  - "[[other-zone]]"
  - "[[2026-05-20-x-design]]"
depends:
  - "[[billing]]"
---

body
`
    const { data } = parseFrontmatter(raw)
    assert.deepEqual(data.related, ['[[other-zone]]', '[[2026-05-20-x-design]]'])
    assert.deepEqual(data.depends, ['[[billing]]'])
  })

  test('parses inline arrays with quoted and bare entries', () => {
    const raw = `---
type: idea
summary: "x"
tags: [foo, "bar baz", 3]
status: active
---
`
    const { data } = parseFrontmatter(raw)
    assert.deepEqual(data.tags, ['foo', 'bar baz', 3])
  })

  test('parses scalars: bare, quoted, number, boolean, empty, null', () => {
    const raw = `---
type: debt
bare: hello
quoted: "hello world"
num: 42
flag: true
empty:
nothing: null
tilde: ~
---
`
    const { data } = parseFrontmatter(raw)
    assert.equal(data.bare, 'hello')
    assert.equal(data.quoted, 'hello world')
    assert.equal(data.num, 42)
    assert.equal(data.flag, true)
    assert.equal(data.empty, '')
    assert.equal(data.nothing, null)
    assert.equal(data.tilde, null)
  })

  test('strips # comments outside quotes but keeps them inside quotes', () => {
    const raw = `---
type: zone
status: seeded        # seeded → active → unmounted
summary: "has a # inside quotes"
---
`
    const { data } = parseFrontmatter(raw)
    assert.equal(data.status, 'seeded')
    assert.equal(data.summary, 'has a # inside quotes')
  })

  test('throws when the opening fence is missing', () => {
    assert.throws(() => parseFrontmatter('type: zone\n---\n'), /must start with/)
  })

  test('throws when the closing fence is missing', () => {
    assert.throws(() => parseFrontmatter('---\ntype: zone\n'), /not closed/)
  })

  test('throws on an unexpected indent jump', () => {
    const raw = `---
type: zone
        weird: indented
---
`
    assert.throws(() => parseFrontmatter(raw))
  })

  test('throws on tab indentation', () => {
    const raw = '---\nowns:\n\t- "src/**"\n---\n'
    assert.throws(() => parseFrontmatter(raw), /tab indentation/)
  })
})

describe('setFrontmatterField', () => {
  test('rewrites a top-level scalar field, preserving a trailing comment', () => {
    const raw = `---
type: zone
status: seeded        # seeded → active → unmounted
verifiedAt: unverified  # "unverified" OR the commit SHA
---

body
`
    const updated = setFrontmatterField(raw, 'status', 'active')
    assert.match(updated, /^status: active {2}# seeded → active → unmounted$/m)

    const updated2 = setFrontmatterField(updated, 'verifiedAt', 'abc12345')
    assert.match(updated2, /^verifiedAt: abc12345 {2}# "unverified" OR the commit SHA$/m)
    // body and other fields untouched
    assert.match(updated2, /^type: zone$/m)
    assert.match(updated2, /body\n$/)
  })

  test('throws when the key is not present', () => {
    const raw = '---\ntype: zone\n---\n'
    assert.throws(() => setFrontmatterField(raw, 'missing', 'x'), /not found/)
  })

  test('throws when there is no frontmatter fence', () => {
    assert.throws(() => setFrontmatterField('no fence here', 'type', 'x'), /no frontmatter fence/)
  })
})
