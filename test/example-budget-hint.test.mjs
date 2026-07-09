import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { removeDirsWithRetry } from './helpers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.dirname(__dirname)
const SCRIPT = path.join(REPO_ROOT, 'examples', 'with-token-oracle', 'budget-hint.mjs')

const tmpDirs = []

function writeFixture(obj) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-budget-hint-'))
  tmpDirs.push(dir)
  const file = path.join(dir, 'forecast.json')
  fs.writeFileSync(file, JSON.stringify(obj))
  return file
}

function run(args) {
  const result = { code: 0, stdout: '', stderr: '' }
  try {
    result.stdout = execFileSync('node', [SCRIPT, ...args], { encoding: 'utf8' })
  } catch (err) {
    result.code = err.status ?? 1
    result.stdout = err.stdout ?? ''
    result.stderr = err.stderr ?? ''
  }
  return result
}

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('examples/with-token-oracle/budget-hint.mjs', () => {
  test('schema 1, one window at 88%: prints one advisory line, exits 0', () => {
    const fixture = writeFixture({
      schema: 1,
      generated_at: 1751234567.89,
      windows: [
        {
          window: '5h',
          used: 194000,
          cap: 220000,
          projected_pct: 88.0,
          eta_to_cap_secs: 1200,
          reset_in_secs: 14040.0,
          idle: false,
          confidence: 0.9,
        },
      ],
    })

    const result = run(['--path', fixture])
    assert.equal(result.code, 0)
    const lines = result.stdout.trim().split('\n')
    assert.equal(lines.length, 1)
    assert.match(result.stdout, /5h window projected 88%/)
    assert.match(result.stdout, /194k\/220k/)
    assert.match(result.stdout, /resets in 3\.9h/)
  })

  test('schema 2 fixture: silent, exit 0', () => {
    const fixture = writeFixture({ schema: 2, generated_at: 1, windows: [] })
    const result = run(['--path', fixture])
    assert.equal(result.code, 0)
    assert.equal(result.stdout, '')
  })

  test('missing snapshot file: silent, exit 0 (fail-open)', () => {
    const result = run(['--path', path.join(os.tmpdir(), 'atlas-budget-hint-nonexistent.json')])
    assert.equal(result.code, 0)
    assert.equal(result.stdout, '')
  })

  test('idle window: silent even at a high projected_pct', () => {
    const fixture = writeFixture({
      schema: 1,
      generated_at: 1,
      windows: [
        {
          window: '5h',
          used: 0,
          cap: 220000,
          projected_pct: 95,
          eta_to_cap_secs: null,
          reset_in_secs: 100,
          idle: true,
          confidence: 1,
        },
      ],
    })
    const result = run(['--path', fixture])
    assert.equal(result.code, 0)
    assert.equal(result.stdout, '')
  })

  test('below the default 80% threshold: silent', () => {
    const fixture = writeFixture({
      schema: 1,
      generated_at: 1,
      windows: [
        {
          window: '5h',
          used: 10000,
          cap: 220000,
          projected_pct: 50,
          eta_to_cap_secs: null,
          reset_in_secs: 100,
          idle: false,
          confidence: 1,
        },
      ],
    })
    const result = run(['--path', fixture])
    assert.equal(result.code, 0)
    assert.equal(result.stdout, '')
  })

  test('--warn-pct lowers the threshold', () => {
    const fixture = writeFixture({
      schema: 1,
      generated_at: 1,
      windows: [
        {
          window: '5h',
          used: 10000,
          cap: 220000,
          projected_pct: 50,
          eta_to_cap_secs: null,
          reset_in_secs: 100,
          idle: false,
          confidence: 1,
        },
      ],
    })
    const result = run(['--path', fixture, '--warn-pct', '40'])
    assert.equal(result.code, 0)
    assert.match(result.stdout, /5h window projected 50%/)
  })
})
