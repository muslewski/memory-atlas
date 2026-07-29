/**
 * Shared containment shape: plant a symlink/escape, run the verb, assert
 * nothing was written outside and exit code is nonzero.
 */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  assertWriteInside,
  isPathInside,
  isSafeSlug,
  isSafeVaultRel,
  resolveInside,
} from '../lib/paths.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.dirname(__dirname)
const BIN = path.join(REPO_ROOT, 'bin', 'atlas.mjs')

const tmpDirs = []
after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

function mkGitRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-contain-'))
  tmpDirs.push(dir)
  execFileSync('git', ['init', '-q'], { cwd: dir })
  execFileSync('git', ['config', 'user.email', 't@example.com'], { cwd: dir })
  execFileSync('git', ['config', 'user.name', 'T'], { cwd: dir })
  execFileSync('git', ['commit', '-q', '--allow-empty', '-m', 'seed'], { cwd: dir })
  return dir
}

describe('paths helpers', () => {
  test('isSafeSlug rejects traversal', () => {
    assert.equal(isSafeSlug('auth'), true)
    assert.equal(isSafeSlug('../etc'), false)
    assert.equal(isSafeSlug('a/b'), false)
    assert.equal(isSafeSlug('/abs'), false)
  })

  test('isSafeVaultRel rejects .. segments', () => {
    assert.equal(isSafeVaultRel('map/zones'), true)
    assert.equal(isSafeVaultRel('../outside'), false)
    assert.equal(isSafeVaultRel('map/../../etc'), false)
  })

  test('resolveInside / assertWriteInside refuse escape', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-root-'))
    tmpDirs.push(root)
    assert.throws(() => resolveInside(root, '..', 'escape.txt'), /escapes/)
    const outside = path.join(root, '..', 'should-not')
    assert.throws(() => assertWriteInside(root, outside), /escapes/)
    assert.equal(isPathInside(root, path.join(root, 'ok.md')), true)
  })
})

describe('atlas build containment', () => {
  test('refuses to write through map/index.md symlink outside the vault', () => {
    const repo = mkGitRepo()
    const init = spawnSync('node', [BIN, 'init', '--vault', 'atlas'], {
      cwd: repo,
      encoding: 'utf8',
    })
    assert.equal(init.status, 0, init.stderr)

    const vault = path.join(repo, 'atlas')
    const indexPath = path.join(vault, 'map', 'index.md')
    const outside = path.join(repo, 'OUTSIDE-INDEX.md')
    fs.writeFileSync(outside, 'OUTSIDE\n')
    fs.unlinkSync(indexPath)
    fs.symlinkSync(outside, indexPath)

    const build = spawnSync('node', [BIN, 'build'], { cwd: repo, encoding: 'utf8' })
    assert.notEqual(build.status, 0, 'build must fail on escaping symlink')
    assert.equal(fs.readFileSync(outside, 'utf8'), 'OUTSIDE\n', 'must not write outside')
    assert.match(build.stderr + build.stdout, /escapes|cannot write/i)
  })
})
