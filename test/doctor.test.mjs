import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { renderOnrampBlock, upsertBlock } from '../lib/blocks.mjs'
import { runDoctor as runDoctorRaw } from '../lib/doctor.mjs'
import { defaultState, packageVersion, sha256, writeState } from '../lib/state.mjs'
import { CLAUDE_HOOK_CMD, GROK_HOOK_CMD, runWire as runWireRaw } from '../lib/wire.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const tmpDirs = []

/** Isolate from host ~/.claude/skills (may contain atlas skills). */
const EMPTY_USER_SKILLS = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-doctor-user-skills-'))
tmpDirs.push(EMPTY_USER_SKILLS)

function runDoctor(argv, opts = {}) {
  return runDoctorRaw(argv, { userSkillsDir: EMPTY_USER_SKILLS, ...opts })
}

function runWire(argv, opts = {}) {
  return runWireRaw(argv, { userSkillsDir: EMPTY_USER_SKILLS, ...opts })
}

function mkRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-doctor-'))
  fs.mkdirSync(path.join(dir, '.git'))
  const vault = path.join(dir, `${path.basename(dir)}-atlas`)
  fs.mkdirSync(path.join(vault, 'map', 'zones'), { recursive: true })
  fs.writeFileSync(path.join(vault, 'map', 'index.md'), '# index\n')
  fs.writeFileSync(
    path.join(dir, 'atlas.config.json'),
    `${JSON.stringify({ version: 1, vaultDir: path.basename(vault) }, null, 2)}\n`,
  )
  tmpDirs.push(dir)
  return dir
}

function mkGrokDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-doctor-grok-'))
  tmpDirs.push(dir)
  return dir
}

function capture() {
  const out = []
  return {
    stdout: { write: (s) => out.push(s) },
    lines: () => out.join('').split('\n').filter(Boolean),
    text: () => out.join(''),
  }
}

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('runDoctor', () => {
  test('full-healthy fixture → all ✓', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    runWire(['all'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })

    const io = capture()
    const code = runDoctor([], {
      cwd: repo,
      grokHooksDir,
      stdout: io.stdout,
      // Pin registry so healthy fixture does not depend on live npm.
      fetchLatest: () => packageVersion(),
    })
    assert.equal(code, 0)
    const text = io.text()
    assert.match(text, /✓ lockfile/)
    assert.match(text, /✓ version/)
    assert.match(text, /✓ claude wiring/)
    assert.match(text, /✓ grok wiring/)
    assert.match(text, /✓.*pristine/)
    assert.match(text, /✓ config/)
    assert.ok(!text.includes('✗'))
    assert.ok(!text.includes('⚠'))
  })

  test('missing state → ✗ lockfile line; version line still prints', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const io = capture()
    const code = runDoctor([], { cwd: repo, grokHooksDir, stdout: io.stdout })
    assert.equal(code, 0)
    const text = io.text()
    assert.match(text, /✗ no \.atlas-state\.json — run atlas wire/)
    assert.match(text, new RegExp(`version:.*installed ${packageVersion()}`))
  })

  test('version drift line when state.atlasVersion differs from installed', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const state = defaultState({ atlasVersion: '0.0.1' })
    writeState(repo, state)

    const io = capture()
    runDoctor([], { cwd: repo, grokHooksDir, stdout: io.stdout, migrations: [] })
    const text = io.text()
    assert.match(
      text,
      new RegExp(
        `⚠ update pending \\(installed ${packageVersion()}, wired 0\\.0\\.1\\) — run the atlas-update skill`,
      ),
    )
    // Zero pending → no migration-pending line
    assert.ok(!/migration\(s\) pending/.test(text))
  })

  test('pending migrations line after version-drift when registry has work', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    writeState(repo, defaultState({ atlasVersion: '0.0.1' }))
    const stubs = [
      {
        id: '0001-a',
        target: packageVersion(),
        describe: 'a',
        plan: () => [],
        apply: () => ({ changed: [] }),
      },
      {
        id: '0002-b',
        target: packageVersion(),
        describe: 'b',
        plan: () => [],
        apply: () => ({ changed: [] }),
      },
    ]

    const io = capture()
    runDoctor([], { cwd: repo, grokHooksDir, stdout: io.stdout, migrations: stubs })
    const text = io.text()
    assert.match(text, /⚠ update pending \(installed/)
    assert.match(text, /⚠ 2 migration\(s\) pending — run atlas migrate/)
    // Order: version-drift line before pending-migration line
    const driftIdx = text.indexOf('update pending (installed')
    const migIdx = text.indexOf('migration(s) pending')
    assert.ok(driftIdx >= 0 && migIdx > driftIdx)
  })

  test('zero pending migrations prints no pending-migration line', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    runWire(['all'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    const io = capture()
    runDoctor([], { cwd: repo, grokHooksDir, stdout: io.stdout, migrations: [] })
    assert.ok(!/migration\(s\) pending/.test(io.text()))
  })

  test('edited block detected via hash mismatch', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    runWire(['claude'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })

    // Edit inside markers
    const claudePath = path.join(repo, 'CLAUDE.md')
    let raw = fs.readFileSync(claudePath, 'utf8')
    raw = raw.replace('Orient Atlas-first', 'ORIENT EDITED')
    fs.writeFileSync(claudePath, raw)

    const io = capture()
    runDoctor([], { cwd: repo, grokHooksDir, stdout: io.stdout })
    assert.match(io.text(), /⚠.*locally edited \(AI-merge on update\)/)
  })

  test('missing grok drop-in flagged while claude ✓', () => {
    const repo = mkRepo()
    const emptyGrok = mkGrokDir()
    // Wire only claude against a throwaway grok dir, then doctor with a different empty dir
    runWire(['claude'], {
      cwd: repo,
      grokHooksDir: emptyGrok,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    const otherGrok = mkGrokDir()

    const io = capture()
    runDoctor([], { cwd: repo, grokHooksDir: otherGrok, stdout: io.stdout })
    const text = io.text()
    assert.match(text, /✓ claude wiring/)
    assert.match(text, /✗ grok wiring/)
  })

  test('vendored missing block → ✗ missing', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const block = renderOnrampBlock('claude', { vaultName: 'x-atlas' })
    writeState(
      repo,
      defaultState({
        wired: { claude: true, grok: false, rootBlocks: ['CLAUDE.md'] },
        vendored: {
          'CLAUDE.md#atlas:onramp': {
            sha256: sha256(block),
            atlasVersion: packageVersion(),
          },
        },
      }),
    )
    // No CLAUDE.md on disk

    const io = capture()
    runDoctor([], { cwd: repo, grokHooksDir, stdout: io.stdout })
    assert.match(io.text(), /✗.*missing/)
  })

  // Sanity: exported commands used in fixture setup remain the expected strings
  test('hook command constants are the ones doctor looks for', () => {
    assert.match(CLAUDE_HOOK_CMD, /atlas status --hook/)
    assert.match(GROK_HOOK_CMD, /atlas status --hook/)
    // upsertBlock still works (used by wire under the hood)
    const dir = mkRepo()
    const p = path.join(dir, 'tmp.md')
    const b = renderOnrampBlock('agents', { vaultName: 'v' })
    upsertBlock(p, b)
    assert.ok(fs.existsSync(p))
  })

  test('visuals disabled (default) → no visuals inventory lines', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const io = capture()
    runDoctor([], { cwd: repo, grokHooksDir, stdout: io.stdout })
    const text = io.text()
    assert.ok(!/visuals enabled/.test(text))
    assert.ok(!/visuals dir missing/.test(text))
    assert.ok(!/atlas-skin/.test(text))
  })

  test('visuals enabled + peer missing → ⚠ peer + ⚠ dir + ⚠ skills', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const vaultName = fs
      .readdirSync(repo)
      .find((n) => fs.existsSync(path.join(repo, n, 'map', 'index.md')))
    fs.writeFileSync(
      path.join(repo, 'atlas.config.json'),
      `${JSON.stringify({ version: 1, vaultDir: vaultName, visuals: { enabled: true } }, null, 2)}\n`,
    )

    const io = capture()
    const code = runDoctor([], { cwd: repo, grokHooksDir, stdout: io.stdout })
    assert.equal(code, 0)
    const text = io.text()
    assert.match(text, /⚠ visuals enabled but peer missing — npm i -D memory-atlas-visuals/)
    assert.match(text, /⚠ visuals dir missing — atlas visuals init --write/)
    assert.match(text, /⚠ skills\/atlas-skin: missing — run atlas wire/)
    assert.match(text, /⚠ skills\/atlas-visuals-kit: missing — run atlas wire/)
    assert.match(text, /⚠ skills\/excalidraw-diagrams: missing — run atlas wire/)
  })

  test('visuals enabled + peer present + visuals dir + skills → ✓ lines', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const vaultName = fs
      .readdirSync(repo)
      .find((n) => fs.existsSync(path.join(repo, n, 'map', 'index.md')))
    fs.writeFileSync(
      path.join(repo, 'atlas.config.json'),
      `${JSON.stringify({ version: 1, vaultDir: vaultName, visuals: { enabled: true } }, null, 2)}\n`,
    )

    // Fake peer package
    const peerRoot = path.join(repo, 'node_modules', 'memory-atlas-visuals')
    fs.mkdirSync(peerRoot, { recursive: true })
    fs.writeFileSync(
      path.join(peerRoot, 'package.json'),
      `${JSON.stringify({ name: 'memory-atlas-visuals', version: '1.2.3' })}\n`,
    )

    // visuals dir under vault
    fs.mkdirSync(path.join(repo, vaultName, 'visuals'), { recursive: true })

    // Present skills
    for (const name of ['atlas-skin', 'atlas-visuals-kit', 'excalidraw-diagrams']) {
      const d = path.join(repo, '.claude', 'skills', name)
      fs.mkdirSync(d, { recursive: true })
      fs.writeFileSync(path.join(d, 'SKILL.md'), `# ${name}\n`)
    }

    const io = capture()
    runDoctor([], { cwd: repo, grokHooksDir, stdout: io.stdout })
    const text = io.text()
    assert.match(text, /✓ visuals enabled · peer memory-atlas-visuals@1\.2\.3/)
    assert.ok(!/visuals dir missing/.test(text))
    assert.ok(!/peer missing/.test(text))
    assert.match(text, /✓ skills\/atlas-skin: present/)
    assert.match(text, /✓ skills\/atlas-visuals-kit: present/)
    assert.match(text, /✓ skills\/excalidraw-diagrams: present/)
  })

  test('visuals.skills false skips skill inventory lines', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const vaultName = fs
      .readdirSync(repo)
      .find((n) => fs.existsSync(path.join(repo, n, 'map', 'index.md')))
    fs.writeFileSync(
      path.join(repo, 'atlas.config.json'),
      `${JSON.stringify(
        { version: 1, vaultDir: vaultName, visuals: { enabled: true, skills: false } },
        null,
        2,
      )}\n`,
    )
    fs.mkdirSync(path.join(repo, vaultName, 'visuals'), { recursive: true })

    const io = capture()
    runDoctor([], { cwd: repo, grokHooksDir, stdout: io.stdout })
    const text = io.text()
    assert.match(text, /visuals enabled but peer missing/)
    assert.ok(!/atlas-skin/.test(text))
    assert.ok(!/atlas-visuals-kit/.test(text))
  })
})
