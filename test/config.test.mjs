import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { DEFAULTS, loadConfig } from '../lib/config.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const tmpDirs = []

function mkRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-config-'))
  tmpDirs.push(dir)
  return dir
}

function writeConfig(repo, obj) {
  fs.writeFileSync(path.join(repo, 'atlas.config.json'), JSON.stringify(obj, null, 2))
}

function silentStderr() {
  const lines = []
  return { stderr: { write: (s) => lines.push(s) }, lines }
}

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('loadConfig', () => {
  test('returns the full default shape when atlas.config.json is absent', () => {
    const repo = mkRepo()
    const config = loadConfig(repo)
    assert.deepEqual(config, DEFAULTS)
  })

  test('defaults include folders.reports="reports" and modules.reports=false', () => {
    assert.equal(DEFAULTS.folders.reports, 'reports')
    assert.equal(DEFAULTS.modules.reports, false)
    const repo = mkRepo()
    const config = loadConfig(repo)
    assert.equal(config.folders.reports, 'reports')
    assert.equal(config.modules.reports, false)
  })

  test('deep merge: a partial folders override keeps every other folders default', () => {
    const repo = mkRepo()
    writeConfig(repo, { folders: { ideas: 'notes/sparks' } })

    const config = loadConfig(repo)
    assert.equal(config.folders.ideas, 'notes/sparks')
    assert.equal(config.folders.techDebt, 'tech-debt')
    assert.equal(config.folders.zones, 'map/zones')
    assert.equal(config.folders.templates, 'templates')
    // Unrelated top-level defaults must survive an unrelated partial override.
    assert.equal(config.enabled, true)
    assert.equal(config.hooks.sessionStartStatus, true)
  })

  test('an unknown top-level key warns, never throws, and is dropped from the result', () => {
    const repo = mkRepo()
    writeConfig(repo, { bogus: true, enabled: false })
    const { stderr, lines } = silentStderr()

    const config = loadConfig(repo, { stderr })

    assert.equal(config.enabled, false)
    assert.equal(config.bogus, undefined)
    assert.ok(lines.some((l) => l.includes('unknown config key "bogus"')))
  })

  test('an unknown nested key warns with a dotted path and is dropped', () => {
    const repo = mkRepo()
    writeConfig(repo, { folders: { ideas: 'x', bogus: 'y' } })
    const { stderr, lines } = silentStderr()

    const config = loadConfig(repo, { stderr })

    assert.equal(config.folders.ideas, 'x')
    assert.equal(config.folders.bogus, undefined)
    assert.ok(lines.some((l) => l.includes('unknown config key "folders.bogus"')))
  })

  test('a wrong-type known key warns and falls back to the default, never throws', () => {
    const repo = mkRepo()
    writeConfig(repo, { enabled: 'nope', hooks: { sessionStartStatus: 'nope' } })
    const { stderr, lines } = silentStderr()

    const config = loadConfig(repo, { stderr })

    assert.equal(config.enabled, true)
    assert.equal(config.hooks.sessionStartStatus, true)
    assert.ok(lines.some((l) => l.includes('"enabled" should be a boolean')))
  })

  test('enabled: false is surfaced through to the merged config', () => {
    const repo = mkRepo()
    writeConfig(repo, { enabled: false })

    const config = loadConfig(repo)
    assert.equal(config.enabled, false)
  })

  test('invalid JSON warns and falls back to defaults, never throws', () => {
    const repo = mkRepo()
    fs.writeFileSync(path.join(repo, 'atlas.config.json'), '{ this is not json')
    const { stderr, lines } = silentStderr()

    const config = loadConfig(repo, { stderr })

    assert.deepEqual(config, DEFAULTS)
    assert.ok(lines.some((l) => l.includes('not valid JSON')))
  })

  test('a "$schema" key is tolerated silently (not reported as unknown)', () => {
    const repo = mkRepo()
    writeConfig(repo, { $schema: './schema.json', enabled: true })
    const { stderr, lines } = silentStderr()

    loadConfig(repo, { stderr })

    assert.equal(lines.length, 0)
  })

  test('anchors.tools.root left at its documented empty-string default normalizes to "." (a git pathspec-safe value)', () => {
    const repo = mkRepo()
    writeConfig(repo, { anchors: { tools: { enabled: true } } })

    const config = loadConfig(repo)
    assert.equal(config.anchors.tools.root, '.')
    // testids keeps its own documented default untouched by the same pass.
    assert.equal(config.anchors.testids.root, 'src')
  })

  test('loadConfig never mutates the shared DEFAULTS/DEFAULT_ANCHORS singletons', () => {
    const repo = mkRepo()
    writeConfig(repo, { anchors: { tools: { enabled: true } } })

    loadConfig(repo)
    assert.equal(DEFAULTS.anchors.tools.root, '', 'the canonical default must remain untouched')
  })
})
