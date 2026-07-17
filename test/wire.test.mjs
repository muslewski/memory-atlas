import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { BLOCK_BEGIN, BLOCK_END } from '../lib/blocks.mjs'
import { runDoctor } from '../lib/doctor.mjs'
import { readState, STATE_FILE } from '../lib/state.mjs'
import { runWire } from '../lib/wire.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const EXPECTED_SKILLS = ['atlas-nav', 'atlas-recollection', 'atlas-update', 'writing-for-retrieval']

const tmpDirs = []

function mkRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-wire-'))
  fs.mkdirSync(path.join(dir, '.git'))
  // Minimal vault so vaultName resolves to a real basename
  const vault = path.join(dir, `${path.basename(dir)}-atlas`)
  fs.mkdirSync(path.join(vault, 'map', 'zones'), { recursive: true })
  fs.writeFileSync(path.join(vault, 'map', 'index.md'), '# index\n')
  tmpDirs.push(dir)
  return dir
}

function mkGrokDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-grok-hooks-'))
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

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('runWire', () => {
  test('fresh wire-all creates settings, grok drop-in, both blocks, and state', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const io = silentIo()

    const code = runWire(['all'], { cwd: repo, grokHooksDir, ...io })

    assert.equal(code, 0)

    // Claude settings
    const settingsPath = path.join(repo, '.claude', 'settings.json')
    assert.ok(fs.existsSync(settingsPath))
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    const sessionStart = settings.hooks?.SessionStart
    assert.ok(Array.isArray(sessionStart))
    const cmds = sessionStart.flatMap((g) => (g.hooks || []).map((h) => h.command))
    assert.ok(cmds.some((c) => c === 'npx --no-install atlas status --hook'))

    // Grok drop-in
    const grokPath = path.join(grokHooksDir, 'atlas.json')
    assert.ok(fs.existsSync(grokPath))
    const grok = JSON.parse(fs.readFileSync(grokPath, 'utf8'))
    const grokCmds = (grok.hooks?.SessionStart || []).flatMap((g) =>
      (g.hooks || []).map((h) => h.command),
    )
    assert.ok(
      grokCmds.some(
        (c) => c.includes('npx --no-install atlas status --hook') && c.includes('|| true'),
      ),
    )

    // Root blocks
    assert.ok(fs.existsSync(path.join(repo, 'CLAUDE.md')))
    assert.ok(fs.existsSync(path.join(repo, 'AGENTS.md')))
    const claude = fs.readFileSync(path.join(repo, 'CLAUDE.md'), 'utf8')
    const agents = fs.readFileSync(path.join(repo, 'AGENTS.md'), 'utf8')
    assert.ok(claude.includes(BLOCK_BEGIN) && claude.includes(BLOCK_END))
    assert.ok(agents.includes(BLOCK_BEGIN) && agents.includes(BLOCK_END))

    // State
    const state = readState(repo)
    assert.ok(state)
    assert.equal(state.wired.claude, true)
    assert.equal(state.wired.grok, true)
    assert.ok(state.wired.rootBlocks.includes('CLAUDE.md'))
    assert.ok(state.wired.rootBlocks.includes('AGENTS.md'))
    assert.ok(state.vendored['CLAUDE.md#atlas:onramp']?.sha256)
    assert.ok(state.vendored['AGENTS.md#atlas:onramp']?.sha256)
    assert.ok(state.vendored['CLAUDE.md#atlas:onramp']?.atlasVersion)
  })

  test('second wire-all → zero changes, no .bak', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    runWire(['all'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })

    const settingsPath = path.join(repo, '.claude', 'settings.json')
    const settingsBefore = fs.readFileSync(settingsPath, 'utf8')
    const grokPath = path.join(grokHooksDir, 'atlas.json')
    const grokBefore = fs.readFileSync(grokPath, 'utf8')
    const claudeBefore = fs.readFileSync(path.join(repo, 'CLAUDE.md'), 'utf8')
    const agentsBefore = fs.readFileSync(path.join(repo, 'AGENTS.md'), 'utf8')
    const stateBefore = fs.readFileSync(path.join(repo, STATE_FILE), 'utf8')

    const io = silentIo()
    const code = runWire(['all'], { cwd: repo, grokHooksDir, ...io })
    assert.equal(code, 0)

    assert.equal(fs.readFileSync(settingsPath, 'utf8'), settingsBefore)
    assert.equal(fs.readFileSync(grokPath, 'utf8'), grokBefore)
    assert.equal(fs.readFileSync(path.join(repo, 'CLAUDE.md'), 'utf8'), claudeBefore)
    assert.equal(fs.readFileSync(path.join(repo, 'AGENTS.md'), 'utf8'), agentsBefore)
    assert.equal(fs.readFileSync(path.join(repo, STATE_FILE), 'utf8'), stateBefore)

    assert.ok(!fs.existsSync(`${settingsPath}.bak`))
    assert.ok(!fs.existsSync(`${grokPath}.bak`))
  })

  test('pre-existing settings with foreign hooks preserved; .bak created on first change', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const settingsPath = path.join(repo, '.claude', 'settings.json')
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    const foreign = {
      hooks: {
        SessionStart: [
          {
            hooks: [{ type: 'command', command: 'node scripts/nav-refresh-index.mjs' }],
          },
        ],
        Stop: [{ hooks: [{ type: 'command', command: 'echo stop' }] }],
      },
    }
    fs.writeFileSync(settingsPath, `${JSON.stringify(foreign, null, 2)}\n`)
    const foreignRaw = fs.readFileSync(settingsPath, 'utf8')

    const code = runWire(['claude'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    assert.equal(code, 0)

    assert.ok(fs.existsSync(`${settingsPath}.bak`))
    assert.equal(fs.readFileSync(`${settingsPath}.bak`, 'utf8'), foreignRaw)

    const after = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    // Foreign SessionStart entry preserved
    const sessionCmds = after.hooks.SessionStart.flatMap((g) =>
      (g.hooks || []).map((h) => h.command),
    )
    assert.ok(sessionCmds.includes('node scripts/nav-refresh-index.mjs'))
    assert.ok(sessionCmds.includes('npx --no-install atlas status --hook'))
    // Foreign Stop event preserved byte-identical in structure
    assert.deepEqual(after.hooks.Stop, foreign.hooks.Stop)
  })

  test('malformed settings JSON → exit 1, file untouched, clear stderr', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const settingsPath = path.join(repo, '.claude', 'settings.json')
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    const bad = '{not valid json\n'
    fs.writeFileSync(settingsPath, bad)

    const io = silentIo()
    const code = runWire(['claude'], { cwd: repo, grokHooksDir, ...io })
    assert.equal(code, 1)
    assert.equal(fs.readFileSync(settingsPath, 'utf8'), bad)
    assert.ok(io.err.some((line) => /malformed/i.test(line)))
  })

  test('wire grok alone touches nothing Claude-side', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()

    const code = runWire(['grok'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    assert.equal(code, 0)

    assert.ok(!fs.existsSync(path.join(repo, '.claude', 'settings.json')))
    assert.ok(!fs.existsSync(path.join(repo, 'CLAUDE.md')))
    assert.ok(fs.existsSync(path.join(grokHooksDir, 'atlas.json')))
    assert.ok(fs.existsSync(path.join(repo, 'AGENTS.md')))

    const state = readState(repo)
    assert.equal(state.wired.claude, false)
    assert.equal(state.wired.grok, true)
    assert.ok(state.vendored['AGENTS.md#atlas:onramp'])
    assert.ok(!state.vendored['CLAUDE.md#atlas:onramp'])
  })

  test('fresh wire vendors package skills + records hashes; second wire no skill changes', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const code = runWire(['all'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    assert.equal(code, 0)

    const skillsRoot = path.join(repo, '.claude', 'skills')
    for (const name of EXPECTED_SKILLS) {
      const skillPath = path.join(skillsRoot, name, 'SKILL.md')
      assert.ok(fs.existsSync(skillPath), `expected ${skillPath}`)
    }

    const state = readState(repo)
    for (const name of EXPECTED_SKILLS) {
      const key = `skills/${name}/SKILL.md`
      assert.ok(state.vendored[key]?.sha256, `missing vendored hash for ${key}`)
    }

    // Snapshot skill files
    const skillSnapshots = {}
    for (const name of EXPECTED_SKILLS) {
      skillSnapshots[name] = fs.readFileSync(path.join(skillsRoot, name, 'SKILL.md'), 'utf8')
    }
    const stateBefore = fs.readFileSync(path.join(repo, STATE_FILE), 'utf8')

    const code2 = runWire(['all'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    assert.equal(code2, 0)
    for (const name of EXPECTED_SKILLS) {
      assert.equal(
        fs.readFileSync(path.join(skillsRoot, name, 'SKILL.md'), 'utf8'),
        skillSnapshots[name],
      )
    }
    assert.equal(fs.readFileSync(path.join(repo, STATE_FILE), 'utf8'), stateBefore)
  })

  test('locally edited skill copy left byte-identical; doctor flags not pristine', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    runWire(['all'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })

    const skillPath = path.join(repo, '.claude', 'skills', 'atlas-nav', 'SKILL.md')
    const original = fs.readFileSync(skillPath, 'utf8')
    const edited = `${original}\n\n<!-- local edit -->\n`
    fs.writeFileSync(skillPath, edited)

    runWire(['all'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    assert.equal(fs.readFileSync(skillPath, 'utf8'), edited)

    const out = []
    runDoctor([], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: (s) => out.push(s) },
    })
    const text = out.join('')
    assert.match(text, /⚠ skills\/atlas-nav\/SKILL\.md: locally edited/)
  })
})
