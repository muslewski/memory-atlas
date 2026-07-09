import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { runRoutine } from '../lib/routine.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.dirname(__dirname)
const BIN = path.join(REPO_ROOT, 'bin', 'atlas.mjs')

const tmpDirs = []

function mkRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-routine-'))
  tmpDirs.push(dir)
  execFileSync('git', ['init', '-q'], { cwd: dir })
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir })
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir })
  execFileSync('git', ['commit', '--allow-empty', '-q', '-m', 'init'], { cwd: dir })
  return dir
}

function atlas(repo, args) {
  const result = { code: 0, stdout: '', stderr: '' }
  try {
    result.stdout = execFileSync('node', [BIN, ...args], { cwd: repo, encoding: 'utf8' })
  } catch (err) {
    result.code = err.status ?? 1
    result.stdout = err.stdout ?? ''
    result.stderr = err.stderr ?? ''
  }
  return result
}

function vaultPath(repo) {
  return path.join(repo, `${path.basename(repo)}-atlas`)
}

after(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true })
})

describe('atlas routine — listing + templating (Step 4)', () => {
  test('no name: lists the built-in gardening routine', () => {
    const repo = mkRepo()
    atlas(repo, ['init'])

    const result = atlas(repo, ['routine'])
    assert.equal(result.code, 0)
    assert.match(result.stdout, /gardening \(built-in\)/)
  })

  test('a vault-level routine of the same name shadows the built-in', () => {
    const repo = mkRepo()
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    const routinesDir = path.join(vault, 'templates', 'routines')
    fs.mkdirSync(routinesDir, { recursive: true })
    fs.writeFileSync(path.join(routinesDir, 'gardening.md'), '# custom gardening\ncustom body\n')

    const listing = atlas(repo, ['routine'])
    assert.equal(listing.code, 0)
    assert.match(listing.stdout, /gardening \(vault\)/)
    assert.doesNotMatch(listing.stdout, /gardening \(built-in\)/)

    const printed = atlas(repo, ['routine', 'gardening'])
    assert.equal(printed.code, 0)
    assert.match(printed.stdout, /custom gardening/)
    assert.match(printed.stdout, /custom body/)
    assert.doesNotMatch(printed.stdout, /Atlas gardening routine/)
  })

  test('printing the built-in gardening routine substitutes cadence and appends a live counts footer', () => {
    const repo = mkRepo()
    atlas(repo, ['init'])

    const printed = atlas(repo, ['routine', 'gardening'])
    assert.equal(printed.code, 0)
    assert.match(printed.stdout, /every 7 days/)
    assert.doesNotMatch(printed.stdout, /\{\{CADENCE_DAYS\}\}/)
    assert.match(printed.stdout, /Live counts \(as of now\)/)
    assert.match(printed.stdout, /0 zones \(0 seeded\)/)
  })

  test('a custom routines.cadenceDays substitutes through to the printed template', () => {
    const repo = mkRepo()
    atlas(repo, ['init'])
    const configPath = path.join(repo, 'atlas.config.json')
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    config.routines.cadenceDays = 3
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    const printed = atlas(repo, ['routine', 'gardening'])
    assert.equal(printed.code, 0)
    assert.match(printed.stdout, /every 3 days/)
  })

  test('an unknown routine name exits 1 with a clear message', () => {
    const repo = mkRepo()
    atlas(repo, ['init'])

    const result = atlas(repo, ['routine', 'ghost'])
    assert.equal(result.code, 1)
    assert.match(result.stderr, /unknown routine "ghost"/)
  })

  test('runRoutine directly: no repo found exits 1', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-routine-norepo-'))
    tmpDirs.push(dir)
    const stderrLines = []
    const code = runRoutine([], { cwd: dir, stderr: { write: (s) => stderrLines.push(s) } })
    assert.equal(code, 1)
    assert.ok(stderrLines.some((l) => l.includes('no git repository')))
  })

  test('runRoutine directly: repo with no vault exits 1', () => {
    const repo = mkRepo()
    const stderrLines = []
    const code = runRoutine([], { cwd: repo, stderr: { write: (s) => stderrLines.push(s) } })
    assert.equal(code, 1)
    assert.ok(stderrLines.some((l) => l.includes('no Atlas vault found')))
  })
})
