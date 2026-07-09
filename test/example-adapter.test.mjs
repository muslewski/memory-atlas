import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import * as adapter from '../examples/with-agentic-sage/adapter.mjs'
import { runInit } from '../lib/init.mjs'

const tmpDirs = []

function mkRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-example-adapter-'))
  tmpDirs.push(dir)
  execFileSync('git', ['init', '-q'], { cwd: dir })
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir })
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir })
  execFileSync('git', ['commit', '--allow-empty', '-q', '-m', 'init'], { cwd: dir })
  return dir
}

function silentIo() {
  return { stdout: { write: () => {} }, stderr: { write: () => {} } }
}

function vaultPath(repo) {
  return path.join(repo, `${path.basename(repo)}-atlas`)
}

function writeZone(vault, slug, globs) {
  const globLines = globs.map((g) => `    - "${g}"`).join('\n')
  const content = `---
type: zone
summary: "the ${slug} zone"
tags: []
status: seeded
created: 2026-07-09
updated: 2026-07-09
verifiedAt: unverified
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

after(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true })
})

describe('examples/with-agentic-sage/adapter.mjs — a living contract check against atlas init scaffolding', () => {
  test('ownsZone resolves a seeded zone whose owns.globs overlaps the queried path', () => {
    const repo = mkRepo()
    runInit(['--modules', 'backlog'], { cwd: repo, ...silentIo() })
    writeZone(vaultPath(repo), 'billing', ['src/billing/**'])

    const ctx = { repoRoot: repo }
    assert.equal(adapter.ownsZone('src/billing/invoice.ts', ctx), 'billing')
    assert.equal(adapter.ownsZone('src/billing/deep/nested/file.ts', ctx), 'billing')
    assert.equal(adapter.ownsZone('src/unrelated/file.ts', ctx), null)
  })

  test('an exclude pathspec is skipped as an ownership claim, not treated as a positive glob', () => {
    const repo = mkRepo()
    runInit(['--modules', 'backlog'], { cwd: repo, ...silentIo() })
    writeZone(vaultPath(repo), 'checkout', ['src/checkout/**', ':(exclude)src/checkout/legacy/**'])

    const ctx = { repoRoot: repo }
    assert.equal(adapter.ownsZone('src/checkout/cart.ts', ctx), 'checkout')
    // the excluded path still overlaps the positive glob, so it's still owned —
    // exclude pathspecs narrow the existence check, not ownsZone's overlap test.
    assert.equal(adapter.ownsZone('src/checkout/legacy/cart.ts', ctx), 'checkout')
  })

  test("backlogRows parses atlas init --modules backlog's own scaffold (checklist + table)", () => {
    const repo = mkRepo()
    runInit(['--modules', 'backlog'], { cwd: repo, ...silentIo() })

    const ctx = { repoRoot: repo }
    const rows = adapter.backlogRows(ctx)
    assert.ok(Array.isArray(rows))
    assert.ok(
      rows.some((r) => r.id === 'A1' && r.status === '⬜'),
      "the scaffold's Track A checklist item should parse as row A1, open",
    )
  })

  test('claimedWork matches a branch against the Lands column only, never main/master', () => {
    const repo = mkRepo()
    runInit(['--modules', 'backlog'], { cwd: repo, ...silentIo() })
    fs.writeFileSync(
      path.join(vaultPath(repo), 'BACKLOG.md'),
      `# BACKLOG

## Track D (side-missions, parallel-safe)

| ID | Status | Mission | Lands |
|----|--------|---------|-------|
| D1 | 🟡 | Ship the thing | feature/ship-thing |
`,
    )
    const ctx = { repoRoot: repo }
    assert.deepEqual(adapter.claimedWork({ branch: 'feature/ship-thing' }, ctx), {
      row: 'D1',
      status: '🟡',
    })
    assert.equal(adapter.claimedWork({ branch: 'main' }, ctx), null)
    assert.equal(adapter.claimedWork({ branch: 'master' }, ctx), null)
  })

  test('enabled: false is a global kill switch — every export returns null/[]', () => {
    const repo = mkRepo()
    runInit(['--modules', 'backlog'], { cwd: repo, ...silentIo() })
    writeZone(vaultPath(repo), 'billing', ['src/billing/**'])
    const configPath = path.join(repo, 'atlas.config.json')
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    config.enabled = false
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    const ctx = { repoRoot: repo }
    assert.equal(adapter.ownsZone('src/billing/invoice.ts', ctx), null)
    assert.equal(adapter.claimedWork({ branch: 'feature/x' }, ctx), null)
    assert.deepEqual(adapter.backlogRows(ctx), [])
    assert.equal(adapter.backlogPath(ctx), null)
  })

  test('garbage atlas.config.json falls back to structural vault detection', () => {
    const repo = mkRepo()
    runInit(['--modules', 'backlog'], { cwd: repo, ...silentIo() })
    writeZone(vaultPath(repo), 'billing', ['src/billing/**'])
    fs.writeFileSync(path.join(repo, 'atlas.config.json'), '{ not: valid json')

    const ctx = { repoRoot: repo }
    assert.equal(adapter.ownsZone('src/billing/invoice.ts', ctx), 'billing')
    assert.ok(adapter.backlogPath(ctx))
  })

  test("generatedGlobs resolves the vault's map/index.md as a repo-relative glob", () => {
    const repo = mkRepo()
    runInit(['--modules', 'backlog'], { cwd: repo, ...silentIo() })

    const prevCwd = process.cwd()
    try {
      process.chdir(repo)
      assert.deepEqual(adapter.generatedGlobs(), [`${path.basename(repo)}-atlas/map/index.md`])
    } finally {
      process.chdir(prevCwd)
    }
  })
})
