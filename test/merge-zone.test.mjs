import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  decideZoneMerge,
  mergeZone,
  normalizeZoneForStampCompare,
} from '../lib/merge-zone.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.dirname(__dirname)
const BIN = path.join(REPO_ROOT, 'bin', 'atlas.mjs')

const tmpDirs = []

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

function mkTmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  tmpDirs.push(dir)
  return dir
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' })
}

function zoneText(verifiedAt, body = '## What this is\n\ncheckout\n') {
  return `---
type: zone
summary: "the checkout flow"
tags: []
status: active
created: 2026-07-09
updated: 2026-07-09
verifiedAt: ${verifiedAt}
owns:
  globs:
    - "src/checkout/**"
  routes: []
  testids: []
  tools: []
depends: []
invariants: []
skills: []
advances: []
related: []
sources: []
---

${body}`
}

describe('decideZoneMerge', () => {
  test('identical sides → take-ours', () => {
    const t = zoneText('aaa1111')
    const r = decideZoneMerge({ ours: t, theirs: t })
    assert.equal(r.ok, true)
    assert.equal(r.action, 'take-ours')
    assert.equal(r.text, t)
  })

  test('stamp-only conflict → unverified', () => {
    const ours = zoneText('aaa1111')
    const theirs = zoneText('bbb2222')
    const r = decideZoneMerge({ base: zoneText('0000000'), ours, theirs })
    assert.equal(r.ok, true)
    assert.equal(r.action, 'unverify')
    assert.match(r.text, /^verifiedAt: unverified$/m)
    assert.ok(!r.text.includes('aaa1111'))
    assert.ok(!r.text.includes('bbb2222'))
    // Body preserved
    assert.match(r.text, /## What this is/)
  })

  test('content conflict → refuse', () => {
    const ours = zoneText('aaa1111', '## What this is\n\nours body\n')
    const theirs = zoneText('bbb2222', '## What this is\n\ntheirs body\n')
    const r = decideZoneMerge({ base: zoneText('0000000'), ours, theirs })
    assert.equal(r.ok, false)
    assert.match(r.reason, /beyond verifiedAt/i)
  })

  test('normalize collapses different stamps', () => {
    const a = normalizeZoneForStampCompare(zoneText('aaa1111'))
    const b = normalizeZoneForStampCompare(zoneText('bbb2222'))
    assert.ok(a && b)
    assert.equal(a.normalized, b.normalized)
  })
})

describe('mergeZone write path', () => {
  test('writes unverified to ours path', () => {
    const dir = mkTmp('atlas-mz-')
    const base = path.join(dir, 'base.md')
    const ours = path.join(dir, 'ours.md')
    const theirs = path.join(dir, 'theirs.md')
    fs.writeFileSync(base, zoneText('0000000'))
    fs.writeFileSync(ours, zoneText('aaa1111'))
    fs.writeFileSync(theirs, zoneText('bbb2222'))
    const r = mergeZone({ base, ours, theirs })
    assert.equal(r.ok, true)
    assert.equal(r.action, 'unverify')
    assert.match(fs.readFileSync(ours, 'utf8'), /^verifiedAt: unverified$/m)
  })
})

describe('verifiedAt after merge — atlas check agrees', () => {
  test('active + unverified passes encoding check (warning only)', () => {
    const repo = mkTmp('atlas-check-unv-')
    git(repo, ['init', '-q'])
    git(repo, ['config', 'user.email', 'test@example.com'])
    git(repo, ['config', 'user.name', 'Test'])
    const vault = path.join(repo, 'atlas')
    fs.mkdirSync(path.join(vault, 'map', 'zones'), { recursive: true })
    fs.writeFileSync(
      path.join(repo, 'atlas.config.json'),
      JSON.stringify({ vaultDir: 'atlas', check: { indexSync: false } }, null, 2) + '\n',
    )
    fs.mkdirSync(path.join(repo, 'src', 'checkout'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'checkout', 'x.js'), 'export {}\n')
    fs.writeFileSync(path.join(vault, 'map', 'zones', 'checkout.md'), zoneText('unverified'))
    fs.writeFileSync(path.join(vault, 'map', 'index.md'), '<!-- GENERATED -->\n')
    git(repo, ['add', 'atlas.config.json', 'atlas', 'src'])
    git(repo, ['commit', '-q', '-m', 'init'])

    const check = spawnSync('node', [BIN, 'check'], { cwd: repo, encoding: 'utf8' })
    assert.equal(check.status, 0, `check failed:\n${check.stdout}\n${check.stderr}`)
    assert.match(check.stderr + check.stdout, /re-stamp|unverified|ok/i)
    // Must NOT hard-error on active+unverified encoding
    assert.ok(
      !/requires a commit SHA for verifiedAt/.test(check.stderr),
      `unexpected hard encoding error: ${check.stderr}`,
    )
  })

  test('active + ISO date still rejected', () => {
    const z = zoneText('2026-07-30')
    // Use pure decide path: encoding is validate's job
    const dir = mkTmp('atlas-iso-')
    git(dir, ['init', '-q'])
    git(dir, ['config', 'user.email', 't@e.com'])
    git(dir, ['config', 'user.name', 'T'])
    const vault = path.join(dir, 'atlas')
    fs.mkdirSync(path.join(vault, 'map', 'zones'), { recursive: true })
    fs.mkdirSync(path.join(dir, 'src', 'checkout'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'src', 'checkout', 'x.js'), 'export {}\n')
    fs.writeFileSync(path.join(vault, 'map', 'zones', 'checkout.md'), z)
    fs.writeFileSync(path.join(vault, 'map', 'index.md'), '<!-- GENERATED -->\n')
    fs.writeFileSync(
      path.join(dir, 'atlas.config.json'),
      JSON.stringify({ vaultDir: 'atlas', check: { indexSync: false } }, null, 2) + '\n',
    )
    git(dir, ['add', 'atlas.config.json', 'atlas', 'src'])
    git(dir, ['commit', '-q', '-m', 'init'])
    const check = spawnSync('node', [BIN, 'check'], { cwd: dir, encoding: 'utf8' })
    assert.notEqual(check.status, 0)
    assert.match(check.stderr, /verifiedAt/i)
  })

  test('two-branch stamp-only merge resolves to unverified via driver', () => {
    const repo = mkTmp('atlas-stamp-merge-')
    git(repo, ['init', '-q'])
    git(repo, ['config', 'user.email', 'test@example.com'])
    git(repo, ['config', 'user.name', 'Test'])
    git(repo, ['checkout', '-b', 'main'])

    const vault = path.join(repo, 'atlas')
    fs.mkdirSync(path.join(vault, 'map', 'zones'), { recursive: true })
    fs.mkdirSync(path.join(repo, 'src', 'checkout'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'checkout', 'x.js'), 'export {}\n')
    fs.writeFileSync(path.join(vault, 'map', 'zones', 'checkout.md'), zoneText('1111111'))
    fs.writeFileSync(path.join(vault, 'map', 'index.md'), '<!-- GENERATED -->\n')
    fs.writeFileSync(
      path.join(repo, 'atlas.config.json'),
      JSON.stringify({ vaultDir: 'atlas', check: { indexSync: false } }, null, 2) + '\n',
    )
    fs.writeFileSync(
      path.join(repo, '.gitattributes'),
      'atlas/map/zones/*.md merge=atlas-zone\n',
    )
    git(repo, ['add', 'atlas.config.json', 'atlas', 'src', '.gitattributes'])
    git(repo, ['commit', '-q', '-m', 'base'])

    const zoneDriver = `node ${JSON.stringify(BIN)} merge-zone %O %A %B %L %P`
    git(repo, ['config', 'merge.atlas-zone.name', 'zone verifiedAt'])
    git(repo, ['config', 'merge.atlas-zone.driver', zoneDriver])

    git(repo, ['checkout', '-q', '-b', 'stamp-a'])
    fs.writeFileSync(path.join(vault, 'map', 'zones', 'checkout.md'), zoneText('aaaaaaa'))
    git(repo, ['add', 'atlas/map/zones/checkout.md'])
    git(repo, ['commit', '-q', '-m', 'stamp A'])

    git(repo, ['checkout', '-q', 'main'])
    git(repo, ['checkout', '-q', '-b', 'stamp-b'])
    fs.writeFileSync(path.join(vault, 'map', 'zones', 'checkout.md'), zoneText('bbbbbbb'))
    git(repo, ['add', 'atlas/map/zones/checkout.md'])
    git(repo, ['commit', '-q', '-m', 'stamp B'])

    const merge = spawnSync('git', ['merge', '--no-edit', 'stamp-a'], {
      cwd: repo,
      encoding: 'utf8',
    })
    assert.equal(
      merge.status,
      0,
      `stamp-only merge should succeed:\n${merge.stdout}\n${merge.stderr}`,
    )
    const merged = fs.readFileSync(path.join(vault, 'map', 'zones', 'checkout.md'), 'utf8')
    assert.match(merged, /^verifiedAt: unverified$/m)
    assert.ok(!merged.includes('<<<<<<<'))
    assert.ok(!merged.includes('aaaaaaa'))
    assert.ok(!merged.includes('bbbbbbb'))

    const check = spawnSync('node', [BIN, 'check'], { cwd: repo, encoding: 'utf8' })
    assert.equal(check.status, 0, `check after stamp merge:\n${check.stderr}`)
  })
})

