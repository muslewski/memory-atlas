import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { runStamp } from '../lib/stamp.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.dirname(__dirname)
const BIN = path.join(REPO_ROOT, 'bin', 'atlas.mjs')

const tmpDirs = []

function mkRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-stamp-'))
  tmpDirs.push(dir)
  execFileSync('git', ['init', '-q'], { cwd: dir })
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir })
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir })
  return dir
}

function commitAll(repo, message) {
  execFileSync('git', ['add', '-A'], { cwd: repo })
  execFileSync('git', ['commit', '-q', '-m', message], { cwd: repo })
}

function shaOf(repo) {
  return execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], {
    cwd: repo,
    encoding: 'utf8',
  }).trim()
}

function vaultPath(repo) {
  return path.join(repo, `${path.basename(repo)}-atlas`)
}

function writeZone(vault, slug, globs, { status = 'active', verifiedAt = 'unverified' } = {}) {
  const globLines = globs.map((g) => `    - ${JSON.stringify(g)}`).join('\n')
  const content = `---
type: zone
summary: "the ${slug} flow"
tags: []
status: ${status}
created: 2026-07-09
updated: 2026-07-09
verifiedAt: ${JSON.stringify(verifiedAt)}
owns:
  globs:
${globLines}
  routes: []
  testids: []
  tools: []
depends: []
invariants: []
skills: []
advances: []
related: []
sources: []
---

## What this is
`
  fs.mkdirSync(path.join(vault, 'map', 'zones'), { recursive: true })
  fs.writeFileSync(path.join(vault, 'map', 'zones', `${slug}.md`), content)
}

function atlasInit(repo) {
  const r = execFileSync('node', [BIN, 'init'], { cwd: repo, encoding: 'utf8' })
  return r
}

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('atlas stamp — uncommitted owned-files warning', () => {
  test('warns when owned files have uncommitted changes', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'a.mjs'), 'export const x = 1\n')
    commitAll(repo, 'init tree')
    atlasInit(repo)
    const vault = vaultPath(repo)
    writeZone(vault, 'config', ['src/a.mjs'])

    fs.writeFileSync(path.join(repo, 'src', 'a.mjs'), 'export const x = 2\n')

    const stderrLines = []
    const stdoutLines = []
    const code = runStamp(['config'], {
      cwd: repo,
      stderr: { write: (s) => stderrLines.push(s) },
      stdout: { write: (s) => stdoutLines.push(s) },
    })

    assert.equal(code, 0, 'warning must not change exit code')
    const stderr = stderrLines.join('')
    assert.ok(
      stderr.includes('uncommitted changes in owned files'),
      `expected uncommitted warning, got: ${stderr}`,
    )
    assert.ok(stderr.includes('config'), `expected zone slug in warning, got: ${stderr}`)
    assert.ok(stdoutLines.join('').includes('stamped config'), 'stamp must still succeed')
  })

  test('no warning on a clean tree', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'a.mjs'), 'export const x = 1\n')
    commitAll(repo, 'init tree')
    atlasInit(repo)
    const vault = vaultPath(repo)
    writeZone(vault, 'config', ['src/a.mjs'])
    // Zone file is untracked/uncommitted but outside owns.globs — commit vault
    // scaffolding so the tree is clean for owned paths.
    commitAll(repo, 'add vault + zone')

    const stderrLines = []
    const stdoutLines = []
    const code = runStamp(['config'], {
      cwd: repo,
      stderr: { write: (s) => stderrLines.push(s) },
      stdout: { write: (s) => stdoutLines.push(s) },
    })

    assert.equal(code, 0)
    const stderr = stderrLines.join('')
    assert.ok(
      !stderr.includes('uncommitted changes in owned files'),
      `clean tree must not warn, got: ${stderr}`,
    )
    assert.ok(stdoutLines.join('').includes(`stamped config → ${shaOf(repo)}`))
  })

  test('no warning when dirty file is outside the zone globs', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'a.mjs'), 'export const x = 1\n')
    fs.writeFileSync(path.join(repo, 'src', 'other.mjs'), 'export const y = 1\n')
    commitAll(repo, 'init tree')
    atlasInit(repo)
    const vault = vaultPath(repo)
    writeZone(vault, 'config', ['src/a.mjs'])
    commitAll(repo, 'add vault + zone')

    fs.writeFileSync(path.join(repo, 'src', 'other.mjs'), 'export const y = 2\n')

    const stderrLines = []
    const code = runStamp(['config'], {
      cwd: repo,
      stderr: { write: (s) => stderrLines.push(s) },
      stdout: { write: () => {} },
    })

    assert.equal(code, 0)
    const stderr = stderrLines.join('')
    assert.ok(
      !stderr.includes('uncommitted changes in owned files'),
      `dirty outside globs must not warn, got: ${stderr}`,
    )
  })

  test('slug with ../ is refused — no write outside vault (containment)', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'a.mjs'), 'export {}\n')
    commitAll(repo, 'init tree')
    atlasInit(repo)
    const vault = vaultPath(repo)
    writeZone(vault, 'config', ['src/**'])
    commitAll(repo, 'vault')

    const outside = path.join(repo, 'outside-escape.md')
    // Pre-plant a target that would be written if join were naïve
    fs.writeFileSync(outside, 'UNTOUCHED\n')

    const err = []
    const code = runStamp(['../outside-escape'], {
      cwd: repo,
      stderr: { write: (s) => err.push(s) },
      stdout: { write: () => {} },
    })
    assert.equal(code, 1)
    assert.match(err.join(''), /safe slug|escapes|not found|not a safe/i)
    assert.equal(fs.readFileSync(outside, 'utf8'), 'UNTOUCHED\n')
  })

  test('zone card missing updated key still stamps (upsert)', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'a.mjs'), 'export {}\n')
    commitAll(repo, 'init')
    atlasInit(repo)
    const vault = vaultPath(repo)
    const zones = path.join(vault, 'map', 'zones')
    fs.mkdirSync(zones, { recursive: true })
    // Hostile card: no `updated` field
    fs.writeFileSync(
      path.join(zones, 'hostile.md'),
      `---
type: zone
summary: "hostile"
status: active
verifiedAt: unverified
owns:
  globs:
    - "src/**"
---
body
`,
    )
    commitAll(repo, 'hostile zone')
    const code = runStamp(['hostile'], {
      cwd: repo,
      stderr: { write: () => {} },
      stdout: { write: () => {} },
    })
    assert.equal(code, 0)
    const text = fs.readFileSync(path.join(zones, 'hostile.md'), 'utf8')
    assert.match(text, /verifiedAt: [0-9a-f]{7,40}/i)
    assert.match(text, /^updated: /m)
  })
})
