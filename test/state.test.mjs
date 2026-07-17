import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  defaultState,
  packageVersion,
  readState,
  STATE_FILE,
  sha256,
  writeState,
} from '../lib/state.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const tmpDirs = []

function mkTmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-state-'))
  tmpDirs.push(dir)
  return dir
}

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('state', () => {
  test('sha256("a") matches the known hex digest', () => {
    assert.equal(sha256('a'), 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb')
    // Cross-check against node:crypto for a longer input.
    const longer = 'memory-atlas'
    assert.equal(sha256(longer), createHash('sha256').update(longer, 'utf8').digest('hex'))
  })

  test('defaultState().atlasVersion equals package.json version', () => {
    const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    assert.equal(packageVersion(), pkg.version)
    assert.equal(defaultState().atlasVersion, pkg.version)
  })

  test('defaultState shape and overrides', () => {
    const base = defaultState()
    assert.equal(base.configVersion, 1)
    assert.equal(base.specVersion, '0.1')
    assert.deepEqual(base.modules, [])
    assert.deepEqual(base.wired, { claude: false, grok: false, rootBlocks: [] })
    assert.deepEqual(base.vendored, {})

    const over = defaultState({
      modules: ['flows'],
      wired: { claude: true, grok: false, rootBlocks: ['CLAUDE.md'] },
    })
    assert.deepEqual(over.modules, ['flows'])
    assert.equal(over.wired.claude, true)
  })

  test('writeState/readState round-trip', () => {
    const repo = mkTmp()
    const state = defaultState({ modules: ['backlog', 'drafts'] })
    writeState(repo, state)

    const onDisk = fs.readFileSync(path.join(repo, STATE_FILE), 'utf8')
    assert.equal(onDisk, `${JSON.stringify(state, null, 2)}\n`)

    const loaded = readState(repo)
    assert.deepEqual(loaded, state)
  })

  test('readState returns null when the file is missing', () => {
    const repo = mkTmp()
    assert.equal(readState(repo), null)
  })

  test('readState returns null on malformed JSON', () => {
    const repo = mkTmp()
    fs.writeFileSync(path.join(repo, STATE_FILE), '{not json\n')
    assert.equal(readState(repo), null)
  })
})
