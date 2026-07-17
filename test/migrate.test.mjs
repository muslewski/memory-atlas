import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { compareVersions, pendingMigrations, runMigrate } from '../lib/migrate.mjs'
import { defaultState, packageVersion, readState, STATE_FILE, writeState } from '../lib/state.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const tmpDirs = []

function mkRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-migrate-'))
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

/** Snapshot every file path + mtimeMs under dir (recursive, sorted). */
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

describe('compareVersions', () => {
  test('orders semver by numeric components; 0.10.0 > 0.9.9', () => {
    assert.equal(compareVersions('0.10.0', '0.9.9'), 1)
    assert.equal(compareVersions('0.9.9', '0.10.0'), -1)
    assert.equal(compareVersions('1.0.0', '1.0.0'), 0)
    assert.equal(compareVersions('0.1.0', '0.2.0'), -1)
    assert.equal(compareVersions('2.0.0', '1.9.9'), 1)
    assert.equal(compareVersions('0.0.1', '0.0.2'), -1)
  })
})

describe('pendingMigrations', () => {
  const registry = [
    {
      id: '0001-a',
      target: '0.2.0',
      describe: 'a',
      plan: () => [],
      apply: () => ({ changed: [] }),
    },
    {
      id: '0002-b',
      target: '0.3.0',
      describe: 'b',
      plan: () => [],
      apply: () => ({ changed: [] }),
    },
  ]

  test('null state returns all migrations with target <= installed', () => {
    const pending = pendingMigrations(null, '0.2.0', registry)
    assert.equal(pending.length, 1)
    assert.equal(pending[0].id, '0001-a')

    const all = pendingMigrations(null, '0.3.0', registry)
    assert.equal(all.length, 2)
  })

  test('current state (atlasVersion >= all targets) returns []', () => {
    const state = { atlasVersion: '0.3.0' }
    assert.deepEqual(pendingMigrations(state, '0.3.0', registry), [])
    assert.deepEqual(pendingMigrations(state, '0.2.0', registry), [])
  })

  test('state behind installed returns only migrations still ahead of state', () => {
    const state = { atlasVersion: '0.1.0' }
    const pending = pendingMigrations(state, '0.2.0', registry)
    assert.equal(pending.length, 1)
    assert.equal(pending[0].id, '0001-a')
  })
})

describe('runMigrate', () => {
  test('no pending → ✓ up to date, exit 0', () => {
    const repo = mkRepo()
    writeState(repo, defaultState({ atlasVersion: packageVersion() }))
    const io = capture()
    const code = runMigrate([], {
      cwd: repo,
      stdout: io.stdout,
      stderr: io.stderr,
      migrations: [],
    })
    assert.equal(code, 0)
    assert.match(io.text(), /✓ up to date \(atlas .+\)/)
  })

  test('dry-run makes zero filesystem changes and exits 0', () => {
    const repo = mkRepo()
    // No state — one stub pending if we inject it.
    let applied = false
    const stub = {
      id: '0001-stub',
      target: packageVersion(),
      describe: 'stub migration',
      plan: () => [{ action: 'create', path: 'new-file.txt', detail: 'would create' }],
      apply: () => {
        applied = true
        fs.writeFileSync(path.join(repo, 'new-file.txt'), 'x\n')
        return { changed: ['new-file.txt'] }
      },
    }
    // Seed a marker file so mtime snapshot has content.
    fs.writeFileSync(path.join(repo, 'keep.txt'), 'keep\n')
    const before = snapshotTree(repo)

    const io = capture()
    const code = runMigrate([], {
      cwd: repo,
      stdout: io.stdout,
      stderr: io.stderr,
      migrations: [stub],
    })
    assert.equal(code, 0)
    assert.equal(applied, false)
    assert.ok(!fs.existsSync(path.join(repo, 'new-file.txt')))
    assert.ok(!fs.existsSync(path.join(repo, STATE_FILE)))
    const after = snapshotTree(repo)
    assert.deepEqual(after, before)
    assert.match(io.text(), /0001-stub/)
    assert.match(io.text(), /dry run — re-run with --write to apply/)
  })

  test('--json dry-run emits structured pending plan', () => {
    const repo = mkRepo()
    const stub = {
      id: '0001-stub',
      target: packageVersion(),
      describe: 'stub',
      plan: () => [{ action: 'create', path: 'x', detail: 'd' }],
      apply: () => ({ changed: [] }),
    }
    const io = capture()
    const code = runMigrate(['--json'], {
      cwd: repo,
      stdout: io.stdout,
      stderr: io.stderr,
      migrations: [stub],
    })
    assert.equal(code, 0)
    const parsed = JSON.parse(io.text())
    assert.equal(parsed.installed, packageVersion())
    assert.ok(Array.isArray(parsed.pending))
    assert.equal(parsed.pending[0].id, '0001-stub')
    assert.deepEqual(parsed.pending[0].plan, [{ action: 'create', path: 'x', detail: 'd' }])
  })

  test('--write with stub migration applies and bumps atlasVersion', () => {
    const repo = mkRepo()
    const stub = {
      id: '0001-stub',
      target: packageVersion(),
      describe: 'create marker',
      plan: () => [{ action: 'create', path: 'marker.txt', detail: 'create' }],
      apply: (root) => {
        fs.writeFileSync(path.join(root, 'marker.txt'), 'ok\n')
        return { changed: ['marker.txt'] }
      },
    }
    const io = capture()
    const code = runMigrate(['--write'], {
      cwd: repo,
      stdout: io.stdout,
      stderr: io.stderr,
      migrations: [stub],
    })
    assert.equal(code, 0)
    assert.ok(fs.existsSync(path.join(repo, 'marker.txt')))
    const state = readState(repo)
    assert.ok(state)
    assert.equal(state.atlasVersion, packageVersion())
  })

  test('failing stub migration → exit 1, version NOT bumped', () => {
    const repo = mkRepo()
    writeState(repo, defaultState({ atlasVersion: '0.0.0' }))
    const stub = {
      id: '0001-fail',
      target: packageVersion(),
      describe: 'always fails',
      plan: () => [{ action: 'update', path: 'x', detail: 'fail' }],
      apply: () => {
        throw new Error('boom')
      },
    }
    const io = capture()
    const code = runMigrate(['--write'], {
      cwd: repo,
      stdout: io.stdout,
      stderr: io.stderr,
      migrations: [stub],
    })
    assert.equal(code, 1)
    assert.match(io.errText() + io.text(), /0001-fail/)
    const state = readState(repo)
    assert.equal(state.atlasVersion, '0.0.0')
  })
})
