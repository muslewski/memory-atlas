import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { runInit } from '../lib/init.mjs'
import { packageVersion, readState, STATE_FILE } from '../lib/state.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const tmpDirs = []

function mkRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-init-'))
  fs.mkdirSync(path.join(dir, '.git'))
  tmpDirs.push(dir)
  return dir
}

function silentIo() {
  const out = []
  const err = []
  return {
    stdout: { write: (s) => out.push(s) },
    stderr: { write: (s) => err.push(s) },
    out,
    err,
  }
}

function snapshotTree(root) {
  const entries = []
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name)
      const stat = fs.statSync(full)
      const rel = path.relative(root, full)
      if (stat.isDirectory()) {
        entries.push(`d:${rel}`)
        walk(full)
      } else {
        entries.push(`f:${rel}:${fs.readFileSync(full, 'utf8')}`)
      }
    }
  }
  walk(root)
  return entries
}

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('runInit', () => {
  test('creates the SPEC.md §2 core skeleton and atlas.config.json', () => {
    const repo = mkRepo()
    const io = silentIo()

    const code = runInit([], { cwd: repo, ...io })

    assert.equal(code, 0)
    const vault = path.join(repo, `${path.basename(repo)}-atlas`)
    for (const rel of [
      'map/zones',
      'map/decisions',
      'specs',
      'plans',
      'ideas',
      'tech-debt',
      'templates',
    ]) {
      assert.ok(fs.statSync(path.join(vault, rel)).isDirectory(), `${rel} should exist`)
    }
    assert.ok(fs.existsSync(path.join(vault, 'README.md')))
    assert.ok(fs.existsSync(path.join(vault, 'map', 'index.md')))
    assert.ok(fs.existsSync(path.join(repo, 'atlas.config.json')))

    for (const name of [
      'zone.md',
      'flow.md',
      'decision.md',
      'spec.md',
      'plan.md',
      'program.md',
      'idea.md',
      'debt.md',
      'pillar.md',
      'report.md',
    ]) {
      assert.ok(fs.existsSync(path.join(vault, 'templates', name)), `${name} template should exist`)
    }
  })

  test('substitutes {{DATE}} in copied note templates', () => {
    const repo = mkRepo()
    const io = silentIo()

    runInit([], { cwd: repo, ...io })

    const vault = path.join(repo, `${path.basename(repo)}-atlas`)
    const zone = fs.readFileSync(path.join(vault, 'templates', 'zone.md'), 'utf8')
    assert.match(zone, /created: \d{4}-\d{2}-\d{2}/)
    assert.match(zone, /updated: \d{4}-\d{2}-\d{2}/)
    assert.ok(!zone.includes('{{DATE}}'))
  })

  test('the config file points vaultDir at the created vault', () => {
    const repo = mkRepo()
    const io = silentIo()

    runInit([], { cwd: repo, ...io })

    const config = JSON.parse(fs.readFileSync(path.join(repo, 'atlas.config.json'), 'utf8'))
    assert.equal(config.vaultDir, `${path.basename(repo)}-atlas`)
    assert.equal(config.modules.backlog, false)
  })

  test('re-running is idempotent: byte-identical tree', () => {
    const repo = mkRepo()
    const io1 = silentIo()
    runInit([], { cwd: repo, ...io1 })

    const before = snapshotTree(repo)

    const io2 = silentIo()
    const code = runInit([], { cwd: repo, ...io2 })

    const after1 = snapshotTree(repo)

    assert.equal(code, 0)
    assert.deepEqual(after1, before)
    assert.ok(io2.out.some((line) => line.includes('existing vault detected')))
    assert.ok(io2.out.every((line) => !line.startsWith('created:')))
  })

  test('--modules backlog,drafts creates BACKLOG.md and drafts/README.md', () => {
    const repo = mkRepo()
    const io = silentIo()

    const code = runInit(['--modules', 'backlog,drafts'], { cwd: repo, ...io })

    assert.equal(code, 0)
    const vault = path.join(repo, `${path.basename(repo)}-atlas`)
    assert.ok(fs.existsSync(path.join(vault, 'BACKLOG.md')))
    const backlog = fs.readFileSync(path.join(vault, 'BACKLOG.md'), 'utf8')
    assert.ok(backlog.includes('| ID | Status | Mission | Lands |'))
    assert.ok(backlog.includes('🟡 claimed · ⬜ open · ✅ done'))
    assert.ok(fs.existsSync(path.join(vault, 'drafts', 'README.md')))

    const config = JSON.parse(fs.readFileSync(path.join(repo, 'atlas.config.json'), 'utf8'))
    assert.equal(config.modules.backlog, true)
    assert.equal(config.modules.drafts, true)
    assert.equal(config.modules.flows, false)
  })

  test('--modules reports creates reports/ and README stub', () => {
    const repo = mkRepo()
    const io = silentIo()

    const code = runInit(['--modules', 'reports'], { cwd: repo, ...io })

    assert.equal(code, 0)
    const vault = path.join(repo, `${path.basename(repo)}-atlas`)
    assert.ok(fs.statSync(path.join(vault, 'reports')).isDirectory())
    const readme = fs.readFileSync(path.join(vault, 'reports', 'README.md'), 'utf8')
    assert.ok(readme.startsWith('# Reports\n'))
    assert.ok(readme.includes('type: report'))
    assert.ok(readme.includes('status: snapshot'))
    assert.ok(readme.includes('YYYY-MM-DD-<topic>.md'))
    assert.ok(readme.includes('commits to nothing'))

    const config = JSON.parse(fs.readFileSync(path.join(repo, 'atlas.config.json'), 'utf8'))
    assert.equal(config.modules.reports, true)
  })

  test('init without --modules reports does not create reports/', () => {
    const repo = mkRepo()
    const io = silentIo()

    const code = runInit([], { cwd: repo, ...io })

    assert.equal(code, 0)
    const vault = path.join(repo, `${path.basename(repo)}-atlas`)
    assert.ok(!fs.existsSync(path.join(vault, 'reports')))

    const config = JSON.parse(fs.readFileSync(path.join(repo, 'atlas.config.json'), 'utf8'))
    assert.equal(config.modules.reports, false)
  })

  test('unknown module name exits 1 and creates nothing', () => {
    const repo = mkRepo()
    const io = silentIo()

    const code = runInit(['--modules', 'bogus'], { cwd: repo, ...io })

    assert.equal(code, 1)
    assert.ok(io.err.some((line) => line.includes('bogus')))
    const vault = path.join(repo, `${path.basename(repo)}-atlas`)
    assert.ok(!fs.existsSync(vault))
    assert.ok(!fs.existsSync(path.join(repo, 'atlas.config.json')))
  })

  test('--dry-run prints would: actions and writes nothing', () => {
    const repo = mkRepo()
    const io = silentIo()

    const code = runInit(['--dry-run'], { cwd: repo, ...io })

    assert.equal(code, 0)
    assert.ok(io.out.some((line) => line.includes('would create:')))
    const vault = path.join(repo, `${path.basename(repo)}-atlas`)
    assert.ok(!fs.existsSync(vault))
    assert.ok(!fs.existsSync(path.join(repo, 'atlas.config.json')))
    assert.ok(!fs.existsSync(path.join(repo, STATE_FILE)))
  })

  test('fresh init creates .atlas-state.json with modules and atlasVersion', () => {
    const repo = mkRepo()
    const io = silentIo()

    const code = runInit(['--modules', 'backlog,drafts'], { cwd: repo, ...io })

    assert.equal(code, 0)
    const state = readState(repo)
    assert.ok(state)
    assert.equal(state.atlasVersion, packageVersion())
    assert.deepEqual(state.modules, ['backlog', 'drafts'])
    assert.equal(state.configVersion, 1)
    assert.equal(state.specVersion, '0.1')
  })

  test('re-init leaves an existing state file byte-identical (create-if-missing only)', () => {
    const repo = mkRepo()
    runInit(['--modules', 'backlog'], { cwd: repo, ...silentIo() })

    const statePath = path.join(repo, STATE_FILE)
    const before = fs.readFileSync(statePath, 'utf8')
    // Mutate so we can prove re-init does not rewrite
    const mutated = JSON.parse(before)
    mutated.atlasVersion = '9.9.9'
    mutated.wired = { claude: true, grok: true, rootBlocks: ['CLAUDE.md'] }
    const mutatedRaw = `${JSON.stringify(mutated, null, 2)}\n`
    fs.writeFileSync(statePath, mutatedRaw)

    const code = runInit([], { cwd: repo, ...silentIo() })
    assert.equal(code, 0)
    assert.equal(fs.readFileSync(statePath, 'utf8'), mutatedRaw)
  })
})
