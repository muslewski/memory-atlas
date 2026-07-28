import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import {
  coerceSemver,
  computePackageFreshness,
  evaluateRegistryLag,
  evaluateWiredLag,
  readUpdateCheckCache,
  resolvePackageFreshness,
  shouldExitNonZero,
} from '../lib/package-freshness.mjs'
import { packageVersion, writeState } from '../lib/state.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const tmpDirs = []

function mkRepo(configExtra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-fresh-'))
  fs.mkdirSync(path.join(dir, '.git'))
  const vault = path.join(dir, 'demo-atlas')
  fs.mkdirSync(path.join(vault, 'map', 'zones'), { recursive: true })
  fs.writeFileSync(path.join(vault, 'map', 'index.md'), '# index\n')
  fs.writeFileSync(
    path.join(dir, 'atlas.config.json'),
    `${JSON.stringify({ version: 1, vaultDir: 'demo-atlas', ...configExtra }, null, 2)}\n`,
  )
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    `${JSON.stringify({ name: 'demo', devDependencies: { 'memory-atlas': '^0.5.0' } }, null, 2)}\n`,
  )
  writeState(dir, {
    atlasVersion: packageVersion(),
    configVersion: 1,
    specVersion: '0.1',
    modules: [],
    wired: { claude: false, grok: false, rootBlocks: [] },
    vendored: {},
  })
  tmpDirs.push(dir)
  return dir
}

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('resolvePackageFreshness', () => {
  test('defaults', () => {
    const p = resolvePackageFreshness({})
    assert.equal(p.mode, 'warn')
    assert.equal(p.registry, true)
    assert.equal(p.wired, true)
    assert.equal(p.registryTtlHours, 24)
  })

  test('overrides mode fail', () => {
    const p = resolvePackageFreshness({
      packageFreshness: { mode: 'fail', registry: false, registryTtlHours: 1 },
    })
    assert.equal(p.mode, 'fail')
    assert.equal(p.registry, false)
    assert.equal(p.registryTtlHours, 1)
  })
})

describe('coerceSemver / evaluate*', () => {
  test('coerceSemver strips ranges', () => {
    assert.equal(coerceSemver('^0.5.0'), '0.5.0')
    assert.equal(coerceSemver('~1.2.3'), '1.2.3')
    assert.equal(coerceSemver('v2.0.0'), '2.0.0')
    assert.equal(coerceSemver('latest'), null)
  })

  test('wired lag when versions differ', () => {
    const r = evaluateWiredLag({ atlasVersion: '0.0.1' }, '0.5.0')
    assert.equal(r.lag, true)
    assert.match(r.messages[0], /0\.5\.0 installed, wired 0\.0\.1/)
  })

  test('wired equal → no lag', () => {
    const r = evaluateWiredLag({ atlasVersion: '0.5.0' }, '0.5.0')
    assert.equal(r.lag, false)
    assert.equal(r.messages.length, 0)
  })

  test('registry lag when latest ahead', () => {
    const r = evaluateRegistryLag('0.5.0', '0.6.0', '^0.5.0')
    assert.equal(r.lag, true)
    assert.match(r.messages[0], /0\.6\.0 available/)
    assert.match(r.messages[0], /pin \^0\.5\.0/)
    assert.match(r.messages[0], /npm i -D memory-atlas@0\.6\.0 then atlas-update/)
  })

  test('registry current → no lag', () => {
    const r = evaluateRegistryLag('0.5.0', '0.5.0')
    assert.equal(r.lag, false)
  })

  test('registry missing latest → no lag', () => {
    const r = evaluateRegistryLag('0.5.0', null)
    assert.equal(r.lag, false)
  })
})

describe('readUpdateCheckCache', () => {
  test('hit within TTL', () => {
    const now = Date.parse('2026-07-28T12:00:00.000Z')
    const state = {
      updateCheck: {
        checkedAt: '2026-07-28T10:00:00.000Z',
        latest: '0.6.0',
        source: 'npm',
      },
    }
    const c = readUpdateCheckCache(state, 24, now)
    assert.equal(c.hit, true)
    assert.equal(c.latest, '0.6.0')
  })

  test('miss when expired', () => {
    const now = Date.parse('2026-07-30T12:00:00.000Z')
    const state = {
      updateCheck: {
        checkedAt: '2026-07-28T10:00:00.000Z',
        latest: '0.6.0',
      },
    }
    const c = readUpdateCheckCache(state, 24, now)
    assert.equal(c.hit, false)
  })
})

describe('computePackageFreshness + shouldExitNonZero', () => {
  test('clean: no messages, warn mode exit false', () => {
    const repo = mkRepo()
    const report = computePackageFreshness(
      repo,
      { check: {}, skills: { dir: '.claude/skills' } },
      { fetchLatest: () => packageVersion(), persistRegistry: true },
    )
    assert.equal(report.hasIssues, false)
    assert.equal(report.messages.length, 0)
    assert.equal(shouldExitNonZero(report, false), false)
    assert.equal(shouldExitNonZero(report, true), false)
  })

  test('wired lag warn: has issues but no fail', () => {
    const repo = mkRepo()
    writeState(repo, {
      atlasVersion: '0.0.1',
      configVersion: 1,
      specVersion: '0.1',
      modules: [],
      wired: { claude: false, grok: false, rootBlocks: [] },
      vendored: {},
    })
    const report = computePackageFreshness(
      repo,
      { check: { packageFreshness: { mode: 'warn' } }, skills: { dir: '.claude/skills' } },
      { fetchLatest: () => packageVersion() },
    )
    assert.equal(report.wired.lag, true)
    assert.equal(report.hasIssues, true)
    assert.equal(report.shouldFail, false)
    assert.equal(shouldExitNonZero(report, false), false)
    assert.equal(shouldExitNonZero(report, true), true)
    assert.match(report.messages[0], /atlas-update skill \(\.claude\/skills/)
  })

  test('wired lag fail mode → shouldFail', () => {
    const repo = mkRepo()
    writeState(repo, {
      atlasVersion: '0.0.1',
      configVersion: 1,
      specVersion: '0.1',
      modules: [],
      wired: { claude: false, grok: false, rootBlocks: [] },
      vendored: {},
    })
    const report = computePackageFreshness(
      repo,
      { check: { packageFreshness: { mode: 'fail', registry: false } }, skills: {} },
      { fetchLatest: () => null },
    )
    assert.equal(report.shouldFail, true)
    assert.equal(shouldExitNonZero(report, false), true)
  })

  test('registry lag only: warn no fail; strict fails', () => {
    const repo = mkRepo()
    const installed = packageVersion()
    const report = computePackageFreshness(
      repo,
      { check: { packageFreshness: { mode: 'warn' } }, skills: {} },
      { fetchLatest: () => '9.9.9' },
    )
    assert.equal(report.registry.lag, true)
    assert.equal(report.wired.lag, false)
    assert.equal(report.shouldFail, false)
    assert.equal(shouldExitNonZero(report, false), false)
    assert.equal(shouldExitNonZero(report, true), true)
    assert.match(report.messages.join('\n'), /9\.9\.9 available/)
    assert.ok(report.messages.every((m) => !m.includes('wired')))
    // installed still current package version
    assert.equal(report.installed, installed)
  })

  test('registry lag fail mode → shouldFail', () => {
    const repo = mkRepo()
    const report = computePackageFreshness(
      repo,
      { check: { packageFreshness: { mode: 'fail', wired: false } }, skills: {} },
      { fetchLatest: () => '9.9.9' },
    )
    assert.equal(report.shouldFail, true)
  })

  test('registry disabled → no probe messages even if inject newer', () => {
    const repo = mkRepo()
    const report = computePackageFreshness(
      repo,
      { check: { packageFreshness: { registry: false } }, skills: {} },
      { fetchLatest: () => '9.9.9' },
    )
    assert.equal(report.registry.lag, false)
    assert.equal(report.messages.length, 0)
  })

  test('cache hit skips fetchLatest', () => {
    const repo = mkRepo()
    const now = Date.parse('2026-07-28T12:00:00.000Z')
    writeState(repo, {
      atlasVersion: packageVersion(),
      configVersion: 1,
      specVersion: '0.1',
      modules: [],
      wired: { claude: false, grok: false, rootBlocks: [] },
      vendored: {},
      updateCheck: {
        checkedAt: '2026-07-28T11:00:00.000Z',
        latest: '9.9.9',
        source: 'npm',
      },
    })
    let fetches = 0
    const report = computePackageFreshness(
      repo,
      { check: { packageFreshness: { registryTtlHours: 24 } }, skills: {} },
      {
        fetchLatest: () => {
          fetches++
          return '0.0.1'
        },
        nowMs: now,
        persistRegistry: false,
      },
    )
    assert.equal(fetches, 0)
    assert.equal(report.registry.latest, '9.9.9')
    assert.equal(report.registry.lag, true)
    assert.equal(report.registry.fromCache, true)
  })
})
