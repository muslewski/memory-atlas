import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { renderOnrampBlock, upsertBlock } from '../lib/blocks.mjs'
import { runDoctor } from '../lib/doctor.mjs'
import { defaultState, packageVersion, sha256, writeState } from '../lib/state.mjs'
import { CLAUDE_HOOK_CMD, GROK_HOOK_CMD, runWire } from '../lib/wire.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const tmpDirs = []

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
    const code = runDoctor([], { cwd: repo, grokHooksDir, stdout: io.stdout })
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
    runDoctor([], { cwd: repo, grokHooksDir, stdout: io.stdout })
    const text = io.text()
    assert.match(
      text,
      new RegExp(
        `⚠ update pending \\(installed ${packageVersion()}, wired 0\\.0\\.1\\) — run the atlas-update skill`,
      ),
    )
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
})
