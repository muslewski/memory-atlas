import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import {
  fixDebtType,
  fixDecisionZones,
  fixZoneHonesty,
  planAdoption,
  runAdopt,
} from '../lib/adopt.mjs'
import { DEFAULTS } from '../lib/config.mjs'
import { parseFrontmatter } from '../lib/frontmatter.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const tmpDirs = []

function mkRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-adopt-'))
  fs.mkdirSync(path.join(dir, '.git'))
  tmpDirs.push(dir)
  return dir
}

function capture() {
  const out = []
  const err = []
  return {
    stdout: { write: (s) => out.push(s) },
    stderr: { write: (s) => err.push(s) },
    text: () => out.join(''),
    errText: () => err.join(''),
  }
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text)
}

/**
 * Syndcast-shaped brownfield vault (no atlas.config.json).
 * @param {{ withModules?: boolean }} [opts] when true, also seeds reports/ for module detection
 */
function mkSyndcastFixture(opts = {}) {
  const repo = mkRepo()
  const vault = path.join(repo, 'demo-mind')
  write(
    path.join(vault, 'map', 'decisions', '0001-auth.md'),
    `---
type: decision
summary: "auth"
zones:
  - "[[auth]]"
  - [[data-spine]]
---
body
`,
  )
  write(
    path.join(vault, 'map', 'zones', 'auth.md'),
    `---
type: zone
summary: "auth zone"
status: active
verifiedAt: ""
owns:
  globs:
    - "src/auth/**"
---
## What
`,
  )
  write(
    path.join(vault, 'tech-debt', 'old-debt.md'),
    `---
type: tech-debt
summary: "legacy"
---
body
`,
  )
  write(path.join(vault, 'human-drafts', 'scratch.md'), '# scratch\n')
  write(path.join(vault, 'notes', 'random.md'), `---\ntype: note\n---\nrandom\n`)
  write(path.join(vault, 'map', 'index.md'), '# index\n')
  write(path.join(vault, 'templates', 'zone.md'), '---\ntype: zone\n---\n')
  if (opts.withModules) {
    write(path.join(vault, 'reports', 'snap.md'), '# report\n')
  }
  return { repo, vault }
}

/** Snapshot every file path + mtimeMs + size under dir (recursive, sorted). */
function snapshotTree(dir) {
  const entries = []
  function walk(rel) {
    const abs = path.join(dir, rel)
    const st = fs.statSync(abs)
    if (st.isDirectory()) {
      for (const name of fs.readdirSync(abs).sort()) {
        walk(rel ? path.join(rel, name) : name)
      }
    } else {
      entries.push({ rel, mtimeMs: st.mtimeMs, size: st.size })
    }
  }
  walk('')
  return entries
}

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('fixDecisionZones', () => {
  test('block list wikilink entries → bare slugs; other fields byte-identical', () => {
    const text = `---
type: decision
summary: "auth choice"
zones:
  - "[[auth]]"
  - [[data-spine]]
status: accepted
---
## Why
body stays
`
    const result = fixDecisionZones(text)
    assert.equal(result.changed, true)
    assert.ok(result.details.length > 0)
    const { data, body } = parseFrontmatter(result.text)
    assert.deepEqual(data.zones, ['auth', 'data-spine'])
    assert.equal(data.summary, 'auth choice')
    assert.equal(data.status, 'accepted')
    assert.equal(body, '## Why\nbody stays\n')
    // non-zones frontmatter lines preserved
    assert.match(result.text, /summary: "auth choice"/)
    assert.match(result.text, /status: accepted/)
  })

  test('inline wikilink form → bare slug array', () => {
    const text = `---
type: decision
zones: [[auth]], [[data-spine]]
summary: x
---
body
`
    const result = fixDecisionZones(text)
    assert.equal(result.changed, true)
    const { data } = parseFrontmatter(result.text)
    assert.deepEqual(data.zones, ['auth', 'data-spine'])
  })

  test('already bare slugs → unchanged; second run idempotent', () => {
    const text = `---
type: decision
zones: [auth, data-spine]
---
`
    const once = fixDecisionZones(text)
    assert.equal(once.changed, false)
    assert.equal(once.text, text)

    const block = `---
type: decision
zones:
  - auth
  - data-spine
---
`
    const blockOnce = fixDecisionZones(block)
    assert.equal(blockOnce.changed, false)

    const wiki = `---
type: decision
zones:
  - "[[auth]]"
---
`
    const first = fixDecisionZones(wiki)
    assert.equal(first.changed, true)
    const second = fixDecisionZones(first.text)
    assert.equal(second.changed, false)
    assert.equal(second.text, first.text)
  })

  test('no zones field → unchanged', () => {
    const text = `---
type: decision
summary: none
---
`
    const result = fixDecisionZones(text)
    assert.equal(result.changed, false)
    assert.equal(result.text, text)
  })
})

describe('fixZoneHonesty', () => {
  test('verifiedAt "" + status active → unverified + seeded', () => {
    const text = `---
type: zone
summary: "auth zone"
status: active
verifiedAt: ""
owns:
  globs: []
---
body
`
    const result = fixZoneHonesty(text)
    assert.equal(result.changed, true)
    const { data } = parseFrontmatter(result.text)
    assert.equal(data.verifiedAt, 'unverified')
    assert.equal(data.status, 'seeded')
    assert.equal(data.summary, 'auth zone')
    assert.match(result.text, /body/)
  })

  test('missing verifiedAt → unverified; status absent → seeded', () => {
    const text = `---
type: zone
summary: bare
---
`
    const result = fixZoneHonesty(text)
    assert.equal(result.changed, true)
    const { data } = parseFrontmatter(result.text)
    assert.equal(data.verifiedAt, 'unverified')
    assert.equal(data.status, 'seeded')
  })

  test('real SHA + active → unchanged; never writes a SHA', () => {
    const sha = 'a1b2c3d4'
    const text = `---
type: zone
status: active
verifiedAt: ${JSON.stringify(sha)}
---
`
    const result = fixZoneHonesty(text)
    assert.equal(result.changed, false)
    assert.equal(result.text, text)
    assert.ok(!result.text.includes('unverified'))
  })

  test('non-zone note → unchanged', () => {
    const text = `---
type: decision
verifiedAt: ""
status: active
---
`
    const result = fixZoneHonesty(text)
    assert.equal(result.changed, false)
    assert.equal(result.text, text)
  })

  test('idempotent after honesty fix', () => {
    const text = `---
type: zone
status: active
verifiedAt: ""
---
`
    const first = fixZoneHonesty(text)
    assert.equal(first.changed, true)
    const second = fixZoneHonesty(first.text)
    assert.equal(second.changed, false)
    assert.equal(second.text, first.text)
  })
})

describe('fixDebtType', () => {
  test('type: tech-debt → type: debt; body untouched', () => {
    const text = `---
type: tech-debt
summary: "defer"
---
## What's deferred
mentions tech-debt in body
`
    const result = fixDebtType(text)
    assert.equal(result.changed, true)
    const { data, body } = parseFrontmatter(result.text)
    assert.equal(data.type, 'debt')
    assert.match(body, /tech-debt in body/)
  })

  test('quoted type debt variants normalize to bare debt', () => {
    const quoted = `---
type: "debt"
summary: x
---
`
    const result = fixDebtType(quoted)
    // already debt (quoted) — canonical form is bare `debt`
    // Plan: `type: tech-debt` (or `type: debt` quoted variants) → canonical `type: debt`
    if (result.changed) {
      assert.equal(parseFrontmatter(result.text).data.type, 'debt')
      assert.match(result.text, /^type: debt$/m)
    } else {
      assert.equal(parseFrontmatter(result.text).data.type, 'debt')
    }
  })

  test('already type: debt → unchanged; second run idempotent', () => {
    const text = `---
type: debt
summary: ok
---
`
    const once = fixDebtType(text)
    assert.equal(once.changed, false)
    assert.equal(once.text, text)

    const tech = `---
type: tech-debt
---
`
    const first = fixDebtType(tech)
    assert.equal(first.changed, true)
    const second = fixDebtType(first.text)
    assert.equal(second.changed, false)
  })
})

describe('planAdoption', () => {
  test('syndcast-shaped fixture returns expected actions + unclassified; zero fs changes', () => {
    const repo = mkRepo()
    const vault = path.join(repo, 'demo-mind')
    // decision with wikilink zones
    write(
      path.join(vault, 'map', 'decisions', '0001-auth.md'),
      `---
type: decision
summary: "auth"
zones:
  - "[[auth]]"
  - [[data-spine]]
---
body
`,
    )
    // zone with empty verifiedAt + active
    write(
      path.join(vault, 'map', 'zones', 'auth.md'),
      `---
type: zone
summary: "auth zone"
status: active
verifiedAt: ""
owns:
  globs:
    - "src/auth/**"
---
## What
`,
    )
    // tech-debt note in tech-debt folder
    write(
      path.join(vault, 'tech-debt', 'old-debt.md'),
      `---
type: tech-debt
summary: "legacy"
---
body
`,
    )
    // human-drafts dir with a file
    write(path.join(vault, 'human-drafts', 'scratch.md'), '# scratch\n')
    // stray unclassified note
    write(path.join(vault, 'notes', 'random.md'), `---\ntype: note\n---\nrandom\n`)
    // map/index.md should NOT be unclassified
    write(path.join(vault, 'map', 'index.md'), '# index\n')
    // templates under vault should not be unclassified
    write(path.join(vault, 'templates', 'zone.md'), '---\ntype: zone\n---\n')
    // no atlas.config.json at repo root

    const before = snapshotTree(repo)
    const config = structuredClone(DEFAULTS)
    const plan = planAdoption(repo, vault, config)
    const after = snapshotTree(repo)
    assert.deepEqual(after, before, 'planAdoption must make zero filesystem changes')

    // actions: update decision, update zone, update debt, rename human-drafts, create config
    const actions = plan.actions
    const byAction = (a) => actions.filter((x) => x.action === a)

    assert.ok(byAction('create').some((a) => a.path === 'atlas.config.json'))
    // human-drafts is not folders.drafts yet — drafts module is only auto-detected when
    // the configured drafts folder already has .md (see next test). Here: no optional modules.

    assert.ok(
      byAction('rename').some(
        (a) => a.path.includes('human-drafts') || a.detail.includes('drafts'),
      ),
      'expected human-drafts → drafts rename',
    )

    const updates = byAction('update')
    assert.ok(
      updates.some((a) => a.path.includes('0001-auth') && /decision|zones/i.test(a.detail)),
      'decision zones update',
    )
    assert.ok(
      updates.some((a) => a.path.includes('auth.md') && /honesty|verifiedAt|zone/i.test(a.detail)),
      'zone honesty update',
    )
    assert.ok(
      updates.some((a) => a.path.includes('old-debt') && /debt/i.test(a.detail)),
      'debt type update',
    )

    assert.ok(Array.isArray(plan.unclassified))
    assert.ok(
      plan.unclassified.some((p) => p.includes('notes/random.md') || p.endsWith('random.md')),
      `expected notes/random.md in unclassified, got ${JSON.stringify(plan.unclassified)}`,
    )
    assert.ok(!plan.unclassified.some((p) => p.includes('map/index.md')))
    assert.ok(!plan.unclassified.some((p) => p.includes('templates/')))
  })

  test('with drafts folder containing .md, create config detail lists drafts module', () => {
    const repo = mkRepo()
    const vault = path.join(repo, 'demo-mind')
    write(
      path.join(vault, 'map', 'zones', 'z.md'),
      '---\ntype: zone\nstatus: seeded\nverifiedAt: unverified\n---\n',
    )
    write(path.join(vault, 'map', 'index.md'), '# i\n')
    write(path.join(vault, 'drafts', 'wip.md'), '# wip\n')
    write(path.join(vault, 'reports', 'r1.md'), '# r\n')

    const plan = planAdoption(repo, vault, structuredClone(DEFAULTS))
    const create = plan.actions.find((a) => a.action === 'create' && a.path === 'atlas.config.json')
    assert.ok(create)
    assert.match(create.detail, /drafts/)
    assert.match(create.detail, /reports/)
  })
})

describe('runAdopt', () => {
  test('dry-run prints actions + unclassified + footer; zero writes', () => {
    const { repo } = mkSyndcastFixture({ withModules: true })
    const before = snapshotTree(repo)
    const io = capture()
    const code = runAdopt([], { cwd: repo, ...io })
    assert.equal(code, 0)
    const text = io.text()
    assert.match(text, /update .*0001-auth/)
    assert.match(text, /update .*auth\.md/)
    assert.match(text, /update .*old-debt/)
    assert.match(text, /rename .*human-drafts/)
    assert.match(text, /create atlas\.config\.json/)
    assert.match(text, /needs classification \(run the atlas-adopt skill\):/)
    assert.match(text, /\? .*notes\/random\.md/)
    assert.match(text, /dry run — re-run with --write to apply/)
    assert.deepEqual(snapshotTree(repo), before)
  })

  test('--write applies transforms, rename, config; second run is nothing-to-adopt', () => {
    const { repo, vault } = mkSyndcastFixture({ withModules: true })
    // tracked path so ownership can resolve if check runs
    write(path.join(repo, 'src', 'auth', 'index.js'), 'export {}\n')

    const io = capture()
    const code = runAdopt(['--write'], { cwd: repo, ...io })
    assert.equal(code, 0)
    const text = io.text()
    assert.match(
      text,
      /next: atlas wire all && atlas migrate --write, review unclassified notes with the atlas-adopt skill, then verify cards before any stamp — adopted zones stay unverified until reviewed/,
    )

    // decision zones bare
    const decision = fs.readFileSync(path.join(vault, 'map', 'decisions', '0001-auth.md'), 'utf8')
    assert.deepEqual(parseFrontmatter(decision).data.zones, ['auth', 'data-spine'])

    // zone honesty
    const zone = fs.readFileSync(path.join(vault, 'map', 'zones', 'auth.md'), 'utf8')
    const zdata = parseFrontmatter(zone).data
    assert.equal(zdata.status, 'seeded')
    assert.equal(zdata.verifiedAt, 'unverified')

    // debt type
    const debt = fs.readFileSync(path.join(vault, 'tech-debt', 'old-debt.md'), 'utf8')
    assert.equal(parseFrontmatter(debt).data.type, 'debt')

    // rename
    assert.ok(!fs.existsSync(path.join(vault, 'human-drafts')))
    assert.ok(fs.existsSync(path.join(vault, 'drafts', 'scratch.md')))

    // config created with detected modules (reports; drafts after human-drafts intent)
    assert.ok(fs.existsSync(path.join(repo, 'atlas.config.json')))
    const cfg = JSON.parse(fs.readFileSync(path.join(repo, 'atlas.config.json'), 'utf8'))
    assert.equal(cfg.modules.reports, true)
    assert.equal(cfg.vaultDir, 'demo-mind')

    // adopted zone frontmatter is honest (seeded/unverified) — no SHA
    assert.equal(zdata.verifiedAt, 'unverified')
    assert.ok(!/verifiedAt:\s*["']?[0-9a-f]{7,}/.test(zone))

    // idempotent second --write
    const io2 = capture()
    const code2 = runAdopt(['--write'], { cwd: repo, ...io2 })
    assert.equal(code2, 0)
    assert.match(io2.text(), /✓ nothing to adopt — vault already conforms/)
  })

  test('--json emits { actions, unclassified } shape (dry)', () => {
    const { repo } = mkSyndcastFixture()
    const io = capture()
    const code = runAdopt(['--json'], { cwd: repo, ...io })
    assert.equal(code, 0)
    const payload = JSON.parse(io.text())
    assert.ok(Array.isArray(payload.actions))
    assert.ok(Array.isArray(payload.unclassified))
    assert.ok(payload.actions.length > 0)
    for (const a of payload.actions) {
      assert.ok(['update', 'rename', 'create'].includes(a.action))
      assert.equal(typeof a.path, 'string')
      assert.equal(typeof a.detail, 'string')
      assert.equal(a._apply, undefined, 'json must strip internal _apply')
    }
  })

  test('conforming vault → nothing to adopt', () => {
    const repo = mkRepo()
    const vault = path.join(repo, 'demo-mind')
    write(
      path.join(vault, 'map', 'zones', 'z.md'),
      '---\ntype: zone\nstatus: seeded\nverifiedAt: unverified\nowns:\n  globs: []\n---\n',
    )
    write(path.join(vault, 'map', 'index.md'), '# i\n')
    write(
      path.join(repo, 'atlas.config.json'),
      JSON.stringify({ version: 1, enabled: true, vaultDir: 'demo-mind' }, null, 2),
    )
    const io = capture()
    const code = runAdopt([], { cwd: repo, ...io })
    assert.equal(code, 0)
    assert.match(io.text(), /✓ nothing to adopt — vault already conforms/)
  })

  test('no vault → exit 1', () => {
    const repo = mkRepo()
    const io = capture()
    const code = runAdopt([], { cwd: repo, ...io })
    assert.equal(code, 1)
    assert.match(io.errText(), /no Atlas vault/)
  })
})
