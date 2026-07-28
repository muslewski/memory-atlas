import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { runGate } from '../lib/gate.mjs'
import { packageVersion, writeState } from '../lib/state.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const tmpDirs = []

function mkRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-gate-'))
  fs.mkdirSync(path.join(dir, '.git'))
  const vault = path.join(dir, 'demo-atlas')
  fs.mkdirSync(path.join(vault, 'map', 'zones'), { recursive: true })
  fs.writeFileSync(path.join(vault, 'map', 'index.md'), '# index\n')
  fs.writeFileSync(
    path.join(dir, 'atlas.config.json'),
    `${JSON.stringify({ version: 1, vaultDir: 'demo-atlas' }, null, 2)}\n`,
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

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('runGate', () => {
  test('ok when current', () => {
    const repo = mkRepo()
    const io = capture()
    const code = runGate([], {
      cwd: repo,
      stdout: io.stdout,
      stderr: io.stderr,
      fetchLatest: () => packageVersion(),
    })
    assert.equal(code, 0)
    assert.match(io.text(), /atlas gate: ok/)
  })

  test('wired lag warn → exit 0 + message', () => {
    const repo = mkRepo()
    writeState(repo, {
      atlasVersion: '0.0.1',
      configVersion: 1,
      specVersion: '0.1',
      modules: [],
      wired: { claude: false, grok: false, rootBlocks: [] },
      vendored: {},
    })
    const io = capture()
    const code = runGate([], {
      cwd: repo,
      stdout: io.stdout,
      stderr: io.stderr,
      fetchLatest: () => packageVersion(),
    })
    assert.equal(code, 0)
    assert.match(io.text(), /installed.*wired 0\.0\.1/)
  })

  test('wired lag --strict → exit 1', () => {
    const repo = mkRepo()
    writeState(repo, {
      atlasVersion: '0.0.1',
      configVersion: 1,
      specVersion: '0.1',
      modules: [],
      wired: { claude: false, grok: false, rootBlocks: [] },
      vendored: {},
    })
    const io = capture()
    const code = runGate(['--strict'], {
      cwd: repo,
      stdout: io.stdout,
      stderr: io.stderr,
      fetchLatest: () => packageVersion(),
    })
    assert.equal(code, 1)
    assert.match(io.errText(), /strict/)
  })

  test('mode fail in config → exit 1 without --strict', () => {
    const repo = mkRepo()
    writeState(repo, {
      atlasVersion: '0.0.1',
      configVersion: 1,
      specVersion: '0.1',
      modules: [],
      wired: { claude: false, grok: false, rootBlocks: [] },
      vendored: {},
    })
    fs.writeFileSync(
      path.join(repo, 'atlas.config.json'),
      `${JSON.stringify({
        version: 1,
        vaultDir: 'demo-atlas',
        check: { packageFreshness: { mode: 'fail', registry: false } },
      }, null, 2)}\n`,
    )
    const io = capture()
    const code = runGate([], {
      cwd: repo,
      stdout: io.stdout,
      stderr: io.stderr,
      fetchLatest: () => null,
    })
    assert.equal(code, 1)
  })

  test('registry lag --strict → exit 1', () => {
    const repo = mkRepo()
    const io = capture()
    const code = runGate(['--strict'], {
      cwd: repo,
      stdout: io.stdout,
      stderr: io.stderr,
      fetchLatest: () => '9.9.9',
    })
    assert.equal(code, 1)
    assert.match(io.text(), /9\.9\.9 available/)
  })

  test('no git repo warn mode → exit 0', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-gate-nogit-'))
    tmpDirs.push(dir)
    const io = capture()
    const code = runGate([], { cwd: dir, stdout: io.stdout, stderr: io.stderr })
    assert.equal(code, 0)
  })
})
