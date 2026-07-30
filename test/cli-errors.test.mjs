/**
 * Regression: CLI verbs must exit non-zero with a clean one-line message
 * (no raw Node stack) for hostile vault shapes, and containment/config
 * edges fixed in the cold-review repair wave must stay fixed.
 */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { loadConfig } from '../lib/config.mjs'
import { loadVault } from '../lib/notes.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.dirname(__dirname)
const BIN = path.join(REPO_ROOT, 'bin', 'atlas.mjs')

const tmpDirs = []
after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

function mkGitRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-cli-err-'))
  tmpDirs.push(dir)
  execFileSync('git', ['init', '-q'], { cwd: dir })
  execFileSync('git', ['config', 'user.email', 't@example.com'], { cwd: dir })
  execFileSync('git', ['config', 'user.name', 'T'], { cwd: dir })
  execFileSync('git', ['commit', '-q', '--allow-empty', '-m', 'seed'], { cwd: dir })
  return dir
}

function initVault(repo) {
  const r = spawnSync('node', [BIN, 'init', '--vault', 'atlas'], {
    cwd: repo,
    encoding: 'utf8',
  })
  assert.equal(r.status, 0, r.stderr)
  return path.join(repo, 'atlas')
}

function hasNodeStack(text) {
  return /at Object\.|node:internal|node:fs|^\s+at /m.test(text || '')
}

function writeZone(vault, slug, body) {
  const zones = path.join(vault, 'map', 'zones')
  fs.mkdirSync(zones, { recursive: true })
  fs.writeFileSync(path.join(zones, `${slug}.md`), body)
}

describe('atlas CLI — clean errors (no raw Node stack)', () => {
  test('check: unparseable zone card → exit 1, one-line error, no stack', () => {
    const repo = mkGitRepo()
    const vault = initVault(repo)
    writeZone(vault, 'bad', 'not frontmatter at all\n')
    const r = spawnSync('node', [BIN, 'check'], { cwd: repo, encoding: 'utf8' })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /unparseable frontmatter/)
    assert.equal(hasNodeStack(r.stderr), false, r.stderr)
  })

  test('check: empty / BOM-only zone → exit 1, clean error', () => {
    const repo = mkGitRepo()
    const vault = initVault(repo)
    writeZone(vault, 'empty', '')
    writeZone(vault, 'bom', '\uFEFF')
    const r = spawnSync('node', [BIN, 'check'], { cwd: repo, encoding: 'utf8' })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /unparseable frontmatter/)
    assert.equal(hasNodeStack(r.stderr), false, r.stderr)
  })

  test('check: map/zones is a regular file (ENOTDIR) → clean error', () => {
    const repo = mkGitRepo()
    const vault = initVault(repo)
    fs.rmSync(path.join(vault, 'map', 'zones'), { recursive: true, force: true })
    fs.writeFileSync(path.join(vault, 'map', 'zones'), 'I am a file\n')
    const r = spawnSync('node', [BIN, 'check'], { cwd: repo, encoding: 'utf8' })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /not a directory/)
    assert.equal(hasNodeStack(r.stderr), false, r.stderr)
  })

  test('check: self-referential zone symlink (ELOOP) → clean per-file error', () => {
    const repo = mkGitRepo()
    const vault = initVault(repo)
    const loop = path.join(vault, 'map', 'zones', 'loop.md')
    fs.symlinkSync('loop.md', loop)
    const r = spawnSync('node', [BIN, 'check'], { cwd: repo, encoding: 'utf8' })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /loop|ELOOP|symlink/i)
    assert.equal(hasNodeStack(r.stderr), false, r.stderr)
  })

  test('build: EACCES on map/index.md → exit 1, clean cannot write line', () => {
    const repo = mkGitRepo()
    const vault = initVault(repo)
    const idx = path.join(vault, 'map', 'index.md')
    fs.chmodSync(idx, 0o444)
    const r = spawnSync('node', [BIN, 'build'], { cwd: repo, encoding: 'utf8' })
    try {
      fs.chmodSync(idx, 0o644)
    } catch {
      /* restore best-effort */
    }
    assert.equal(r.status, 1)
    assert.match(r.stderr, /cannot write map\/index\.md.*EACCES/i)
    assert.equal(hasNodeStack(r.stderr), false, r.stderr)
  })

  test('stamp: EACCES on zone file → exit 1, clean cannot write line', () => {
    const repo = mkGitRepo()
    const vault = initVault(repo)
    const zpath = path.join(vault, 'map', 'zones', 'x.md')
    writeZone(
      vault,
      'x',
      `---
type: zone
summary: "x"
status: active
updated: 2026-01-01
verifiedAt: unverified
owns:
  globs: []
---
`,
    )
    execFileSync('git', ['add', '-A'], { cwd: repo })
    execFileSync('git', ['commit', '-q', '-m', 'zone'], { cwd: repo })
    fs.chmodSync(zpath, 0o444)
    const r = spawnSync('node', [BIN, 'stamp', 'x'], { cwd: repo, encoding: 'utf8' })
    try {
      fs.chmodSync(zpath, 0o644)
    } catch {
      /* restore */
    }
    assert.equal(r.status, 1)
    assert.match(r.stderr, /cannot write.*EACCES/i)
    assert.equal(hasNodeStack(r.stderr), false, r.stderr)
  })
})

describe('containment — folders.zones escape', () => {
  test('loadVault throws when folders.zones contains ..', () => {
    const repo = mkGitRepo()
    const vault = initVault(repo)
    assert.throws(
      () => loadVault(vault, { folders: { zones: '../OUTSIDE-ZONES' } }),
      /escapes the vault/,
    )
  })

  test('build refuses folders.zones escape with clean error', () => {
    const repo = mkGitRepo()
    initVault(repo)
    fs.writeFileSync(
      path.join(repo, 'atlas.config.json'),
      JSON.stringify({ vaultDir: 'atlas', folders: { zones: '../OUTSIDE' } }, null, 2) + '\n',
    )
    const r = spawnSync('node', [BIN, 'build'], { cwd: repo, encoding: 'utf8' })
    assert.equal(r.status, 1)
    assert.match(r.stderr, /escapes the vault/)
    assert.equal(hasNodeStack(r.stderr), false, r.stderr)
  })
})

describe('atlas check — config warning once', () => {
  test('type-mismatch config warning emits once (not twice via renderCore)', () => {
    const repo = mkGitRepo()
    initVault(repo)
    fs.writeFileSync(
      path.join(repo, 'atlas.config.json'),
      JSON.stringify(
        {
          vaultDir: 'atlas',
          check: { strictFreshness: 'yes-please' },
        },
        null,
        2,
      ) + '\n',
    )
    const r = spawnSync('node', [BIN, 'check'], { cwd: repo, encoding: 'utf8' })
    const lines = (r.stderr || '').split('\n').filter((l) => l.includes('strictFreshness'))
    assert.equal(lines.length, 1, `expected 1 warning, got ${lines.length}: ${r.stderr}`)
  })
})

describe('loadConfig — non-regular atlas.config.json', () => {
  test('FIFO config does not hang; warns and returns defaults', () => {
    const repo = mkGitRepo()
    initVault(repo)
    const cfg = path.join(repo, 'atlas.config.json')
    fs.unlinkSync(cfg)
    execFileSync('mkfifo', [cfg])
    const lines = []
    const t0 = Date.now()
    let config
    try {
      config = loadConfig(repo, { stderr: { write: (s) => lines.push(s) } })
    } finally {
      try {
        fs.unlinkSync(cfg)
      } catch {
        /* */
      }
    }
    const elapsed = Date.now() - t0
    assert.ok(elapsed < 500, `loadConfig blocked for ${elapsed}ms on FIFO`)
    assert.equal(config.folders.zones, 'map/zones')
    assert.ok(lines.some((l) => /not a regular file/.test(l)), lines.join(''))
  })
})
