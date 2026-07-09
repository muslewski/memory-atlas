import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { lintLedger } from '../lib/ledger.mjs'

const tmpDirs = []

function mkVault() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-ledger-'))
  tmpDirs.push(dir)
  fs.mkdirSync(path.join(dir, 'specs'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'plans'), { recursive: true })
  return dir
}

function write(vault, rel, content) {
  const full = path.join(vault, rel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
}

after(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true })
})

describe('lintLedger', () => {
  test('a valid spec and a valid plan both pass', () => {
    const vault = mkVault()
    write(
      vault,
      'specs/2026-07-01-checkout.md',
      '---\ntype: spec\nsummary: "checkout design"\nstatus: draft\n---\n',
    )
    write(
      vault,
      'plans/2026-07-02-checkout-plan.md',
      '---\ntype: plan\nsummary: "checkout plan"\nstatus: ready\n---\n',
    )

    const result = lintLedger(vault)
    assert.deepEqual(result.violations, [])
    assert.equal(result.total, 2)
    assert.equal(result.clean, 2)
    assert.equal(result.coverage, 100)
  })

  test('walks specs/ and plans/ recursively', () => {
    const vault = mkVault()
    write(
      vault,
      'specs/nested/deep/2026-07-01-x.md',
      '---\ntype: spec\nsummary: "x"\nstatus: draft\n---\n',
    )
    const result = lintLedger(vault)
    assert.equal(result.total, 1)
    assert.equal(result.clean, 1)
  })

  test("a status outside the type's lifecycle is flagged by name", () => {
    const vault = mkVault()
    write(vault, 'specs/2026-07-01-bad.md', '---\ntype: spec\nsummary: "x"\nstatus: bogus\n---\n')
    const result = lintLedger(vault)
    assert.equal(result.violations.length, 1)
    assert.match(result.violations[0], /status "bogus" not in spec's lifecycle/)
    assert.equal(result.clean, 0)
  })

  test('spec lifecycle accepts the widened SPEC.md enum (approved), not a narrower table', () => {
    const vault = mkVault()
    write(
      vault,
      'specs/2026-07-01-approved.md',
      '---\ntype: spec\nsummary: "x"\nstatus: approved\n---\n',
    )
    const result = lintLedger(vault)
    assert.deepEqual(result.violations, [])
  })

  test('plan lifecycle accepts "ready" (SPEC.md widened enum)', () => {
    const vault = mkVault()
    write(vault, 'plans/2026-07-01-ready.md', '---\ntype: plan\nsummary: "x"\nstatus: ready\n---\n')
    const result = lintLedger(vault)
    assert.deepEqual(result.violations, [])
  })

  test('an unknown type is flagged', () => {
    const vault = mkVault()
    write(vault, 'specs/2026-07-01-x.md', '---\ntype: nonsense\nsummary: "x"\nstatus: draft\n---\n')
    const result = lintLedger(vault)
    assert.ok(result.violations.some((v) => v.includes('unknown type "nonsense"')))
  })

  test('missing frontmatter is flagged, not thrown', () => {
    const vault = mkVault()
    write(vault, 'specs/2026-07-01-x.md', 'not a frontmatter file at all\n')
    const result = lintLedger(vault)
    assert.equal(result.violations.length, 1)
    assert.match(result.violations[0], /unparseable frontmatter/)
  })

  test('an empty/missing summary is flagged', () => {
    const vault = mkVault()
    write(vault, 'specs/2026-07-01-x.md', '---\ntype: spec\nsummary: ""\nstatus: draft\n---\n')
    const result = lintLedger(vault)
    assert.ok(result.violations.some((v) => v.includes('summary must be a non-empty string')))
  })

  test('an unknown zones: entry is flagged; a known one passes', () => {
    const vault = mkVault()
    write(
      vault,
      'plans/2026-07-01-x.md',
      '---\ntype: plan\nsummary: "x"\nstatus: draft\nzones:\n  - "checkout"\n  - "ghost-zone"\n---\n',
    )
    const result = lintLedger(vault, { zoneSlugs: new Set(['checkout']) })
    assert.ok(
      result.violations.some((v) => v.includes('"ghost-zone" is not an existing zone slug')),
    )
    assert.ok(!result.violations.some((v) => v.includes('"checkout" is not an existing zone slug')))
  })

  test('an empty zones: array is allowed', () => {
    const vault = mkVault()
    write(
      vault,
      'plans/2026-07-01-x.md',
      '---\ntype: plan\nsummary: "x"\nstatus: draft\nzones: []\n---\n',
    )
    const result = lintLedger(vault, { zoneSlugs: new Set() })
    assert.deepEqual(result.violations, [])
  })

  test('coverage % summary reflects clean/total', () => {
    const vault = mkVault()
    write(vault, 'specs/2026-07-01-a.md', '---\ntype: spec\nsummary: "a"\nstatus: draft\n---\n')
    write(vault, 'specs/2026-07-01-b.md', '---\ntype: spec\nsummary: ""\nstatus: draft\n---\n')
    const result = lintLedger(vault)
    assert.equal(result.total, 2)
    assert.equal(result.clean, 1)
    assert.equal(result.coverage, 50)
  })

  test('an absent specs/ or plans/ dir is tolerated (0 files, not an error)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-ledger-empty-'))
    tmpDirs.push(dir)
    const result = lintLedger(dir)
    assert.deepEqual(result.violations, [])
    assert.equal(result.total, 0)
    assert.equal(result.coverage, 100)
  })
})
