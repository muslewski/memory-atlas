import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { findRepoRoot, findVaultDir } from '../lib/detect.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const tmpDirs = []

function mkTmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-detect-'))
  tmpDirs.push(dir)
  return dir
}

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('findRepoRoot', () => {
  test('finds the nearest ancestor containing .git', () => {
    const root = mkTmp()
    fs.mkdirSync(path.join(root, '.git'))
    const nested = path.join(root, 'a', 'b', 'c')
    fs.mkdirSync(nested, { recursive: true })

    assert.equal(findRepoRoot(nested), root)
  })

  test('returns null when no .git is found up to the filesystem root', () => {
    const root = mkTmp()
    const nested = path.join(root, 'a', 'b')
    fs.mkdirSync(nested, { recursive: true })

    assert.equal(findRepoRoot(nested), null)
  })
})

describe('findVaultDir', () => {
  test('detects a vault by structure: map/zones/ present', () => {
    const root = mkTmp()
    fs.mkdirSync(path.join(root, 'foo-atlas', 'map', 'zones'), { recursive: true })

    assert.equal(findVaultDir(root), path.join(root, 'foo-atlas'))
  })

  test('detects a vault by structure: map/index.md present', () => {
    const root = mkTmp()
    fs.mkdirSync(path.join(root, 'somewhere', 'map'), { recursive: true })
    fs.writeFileSync(path.join(root, 'somewhere', 'map', 'index.md'), '')

    assert.equal(findVaultDir(root), path.join(root, 'somewhere'))
  })

  test('falls back to a -atlas/-mind/-brain suffix match when no structure hit exists', () => {
    const root = mkTmp()
    fs.mkdirSync(path.join(root, 'project-mind'), { recursive: true })

    assert.equal(findVaultDir(root), path.join(root, 'project-mind'))
  })

  test('skips hidden directories and node_modules', () => {
    const root = mkTmp()
    fs.mkdirSync(path.join(root, '.hidden', 'map', 'zones'), { recursive: true })
    fs.mkdirSync(path.join(root, 'node_modules', 'map', 'zones'), { recursive: true })

    assert.equal(findVaultDir(root), null)
  })

  test('returns null when no vault exists', () => {
    const root = mkTmp()
    fs.mkdirSync(path.join(root, 'src'), { recursive: true })

    assert.equal(findVaultDir(root), null)
  })
})
