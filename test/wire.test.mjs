import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { BLOCK_BEGIN, BLOCK_END } from '../lib/blocks.mjs'
import { runDoctor } from '../lib/doctor.mjs'
import { readState, STATE_FILE } from '../lib/state.mjs'
import { isWorkingTreeDirty, runWire, wireMergeDriver } from '../lib/wire.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const EXPECTED_SKILLS = [
  'atlas-adopt',
  'atlas-nav',
  'atlas-recollection',
  'atlas-update',
  'writing-for-retrieval',
]

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

  test('custom skills.dir is substituted into the AGENTS.md on-ramp block', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    fs.writeFileSync(
      path.join(repo, 'atlas.config.json'),
      `${JSON.stringify({ skills: { dir: '.agents/skills' } }, null, 2)}\n`,
    )

    const code = runWire(['grok'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    assert.equal(code, 0)

    const agents = fs.readFileSync(path.join(repo, 'AGENTS.md'), 'utf8')
    assert.ok(
      agents.includes(
        'plain markdown files under `.agents/skills/<name>/SKILL.md` — read the matching one before doing those tasks',
      ),
      'wire must pass config.skills.dir into the AGENTS.md block',
    )
    assert.ok(!agents.includes('`.claude/skills/<name>/SKILL.md`'))
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

  test('visuals disabled: wire does not require peer and does not log visuals skip', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const io = silentIo()
    const code = runWire(['claude'], { cwd: repo, grokHooksDir, ...io })
    assert.equal(code, 0)
    assert.ok(!io.out.some((l) => /visuals skills/.test(l)))
    assert.ok(!fs.existsSync(path.join(repo, '.claude', 'skills', 'atlas-skin')))
  })

  test('visuals enabled + peer missing → fail-open, logs skip, exit 0', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    fs.writeFileSync(
      path.join(repo, 'atlas.config.json'),
      `${JSON.stringify({ visuals: { enabled: true } }, null, 2)}\n`,
    )
    const io = silentIo()
    const code = runWire(['claude'], { cwd: repo, grokHooksDir, ...io })
    assert.equal(code, 0)
    assert.ok(
      io.out.some((l) =>
        /visuals skills: peer memory-atlas-visuals missing — skip/.test(l),
      ),
      `expected skip log, got: ${io.out.join('')}`,
    )
    // Core skills still vendored
    assert.ok(fs.existsSync(path.join(repo, '.claude', 'skills', 'atlas-nav', 'SKILL.md')))
    assert.ok(!fs.existsSync(path.join(repo, '.claude', 'skills', 'atlas-skin')))
  })

  test('visuals enabled + peer skills → vendors peer skills + records hashes', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    fs.writeFileSync(
      path.join(repo, 'atlas.config.json'),
      `${JSON.stringify({ visuals: { enabled: true } }, null, 2)}\n`,
    )

    const peerSkills = path.join(repo, 'node_modules', 'memory-atlas-visuals', 'skills')
    for (const name of ['atlas-skin', 'atlas-visuals-kit']) {
      const d = path.join(peerSkills, name)
      fs.mkdirSync(d, { recursive: true })
      fs.writeFileSync(path.join(d, 'SKILL.md'), `# ${name} from peer\n`)
    }
    fs.writeFileSync(
      path.join(repo, 'node_modules', 'memory-atlas-visuals', 'package.json'),
      `${JSON.stringify({ name: 'memory-atlas-visuals', version: '9.9.9' })}\n`,
    )

    const io = silentIo()
    const code = runWire(['all'], { cwd: repo, grokHooksDir, ...io })
    assert.equal(code, 0)

    const skillsRoot = path.join(repo, '.claude', 'skills')
    assert.ok(fs.existsSync(path.join(skillsRoot, 'atlas-skin', 'SKILL.md')))
    assert.ok(fs.existsSync(path.join(skillsRoot, 'atlas-visuals-kit', 'SKILL.md')))
    assert.equal(
      fs.readFileSync(path.join(skillsRoot, 'atlas-skin', 'SKILL.md'), 'utf8'),
      '# atlas-skin from peer\n',
    )

    const state = readState(repo)
    assert.ok(state.vendored['skills/atlas-skin/SKILL.md']?.sha256)
    assert.ok(state.vendored['skills/atlas-visuals-kit/SKILL.md']?.sha256)

    // Second wire: no skill rewrites
    const before = fs.readFileSync(path.join(skillsRoot, 'atlas-skin', 'SKILL.md'), 'utf8')
    const stateBefore = fs.readFileSync(path.join(repo, STATE_FILE), 'utf8')
    runWire(['all'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    assert.equal(fs.readFileSync(path.join(skillsRoot, 'atlas-skin', 'SKILL.md'), 'utf8'), before)
    assert.equal(fs.readFileSync(path.join(repo, STATE_FILE), 'utf8'), stateBefore)
  })

  test('visuals.skills false → peer present but skills not vendored', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    fs.writeFileSync(
      path.join(repo, 'atlas.config.json'),
      `${JSON.stringify({ visuals: { enabled: true, skills: false } }, null, 2)}\n`,
    )
    const peerSkill = path.join(
      repo,
      'node_modules',
      'memory-atlas-visuals',
      'skills',
      'atlas-skin',
    )
    fs.mkdirSync(peerSkill, { recursive: true })
    fs.writeFileSync(path.join(peerSkill, 'SKILL.md'), '# should not vendor\n')

    const io = silentIo()
    const code = runWire(['claude'], { cwd: repo, grokHooksDir, ...io })
    assert.equal(code, 0)
    assert.ok(!io.out.some((l) => /visuals skills/.test(l)))
    assert.ok(!fs.existsSync(path.join(repo, '.claude', 'skills', 'atlas-skin')))
  })

  test('visuals peer skill locally edited is left byte-identical on rewire', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    fs.writeFileSync(
      path.join(repo, 'atlas.config.json'),
      `${JSON.stringify({ visuals: { enabled: true } }, null, 2)}\n`,
    )
    const peerSkill = path.join(
      repo,
      'node_modules',
      'memory-atlas-visuals',
      'skills',
      'atlas-skin',
    )
    fs.mkdirSync(peerSkill, { recursive: true })
    fs.writeFileSync(path.join(peerSkill, 'SKILL.md'), '# peer original\n')

    runWire(['claude'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })

    const dest = path.join(repo, '.claude', 'skills', 'atlas-skin', 'SKILL.md')
    const edited = '# peer original\n\n<!-- local -->\n'
    fs.writeFileSync(dest, edited)

    runWire(['claude'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    assert.equal(fs.readFileSync(dest, 'utf8'), edited)
  })
})

describe('wire merge-driver installer', () => {
  function mkRealGitRepo() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-wire-md-'))
    tmpDirs.push(dir)
    execFileSync('git', ['init', '-q'], { cwd: dir })
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir })
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir })
    const vault = path.join(dir, 'atlas')
    fs.mkdirSync(path.join(vault, 'map', 'zones'), { recursive: true })
    fs.writeFileSync(path.join(vault, 'map', 'index.md'), '# index\n')
    fs.writeFileSync(
      path.join(dir, 'atlas.config.json'),
      JSON.stringify({ vaultDir: 'atlas' }, null, 2) + '\n',
    )
    execFileSync('git', ['add', 'atlas.config.json', 'atlas'], { cwd: dir })
    execFileSync('git', ['commit', '-q', '-m', 'base'], { cwd: dir })
    return dir
  }

  test('report-first default: without --write, nothing on disk changes', () => {
    const repo = mkRealGitRepo()
    const beforeAttr = fs.existsSync(path.join(repo, '.gitattributes'))
      ? fs.readFileSync(path.join(repo, '.gitattributes'), 'utf8')
      : null
    const io = silentIo()
    const code = runWire(['merge-driver'], { cwd: repo, ...io })
    assert.equal(code, 0)
    assert.match(io.out.join(''), /dry-run|would/i)
    const afterAttr = fs.existsSync(path.join(repo, '.gitattributes'))
      ? fs.readFileSync(path.join(repo, '.gitattributes'), 'utf8')
      : null
    assert.equal(afterAttr, beforeAttr)
    // Local git config must also stay unset without --write
    let cfg = ''
    try {
      cfg = execFileSync('git', ['config', '--get', 'merge.atlas-index.driver'], {
        cwd: repo,
        encoding: 'utf8',
      })
    } catch {
      cfg = ''
    }
    assert.equal(cfg.trim(), '')
  })

  test('installer refuses a dirty tree and says why', () => {
    const repo = mkRealGitRepo()
    fs.writeFileSync(path.join(repo, 'dirty.txt'), 'uncommitted\n')
    assert.equal(isWorkingTreeDirty(repo), true)
    const io = silentIo()
    const code = runWire(['merge-driver', '--write'], { cwd: repo, ...io })
    assert.equal(code, 1)
    assert.match(io.err.join(''), /dirty/i)
    assert.match(io.err.join(''), /allow-dirty|unfinished/i)
    assert.ok(!fs.existsSync(path.join(repo, '.gitattributes')))
  })

  test('installer is idempotent: second --write reports no changes and writes nothing new', () => {
    const repo = mkRealGitRepo()
    const io1 = silentIo()
    assert.equal(runWire(['merge-driver', '--write'], { cwd: repo, ...io1 }), 0)
    assert.ok(fs.existsSync(path.join(repo, '.gitattributes')))
    const attr1 = fs.readFileSync(path.join(repo, '.gitattributes'), 'utf8')
    assert.match(attr1, /merge=atlas-index/)
    assert.match(attr1, /merge=atlas-zone/)

    // Commit attrs so tree is clean for second write
    execFileSync('git', ['add', '.gitattributes'], { cwd: repo })
    execFileSync('git', ['commit', '-q', '-m', 'attrs'], { cwd: repo })

    const mtime1 = fs.statSync(path.join(repo, '.gitattributes')).mtimeMs
    const io2 = silentIo()
    assert.equal(runWire(['merge-driver', '--write'], { cwd: repo, ...io2 }), 0)
    const out2 = io2.out.join('')
    assert.match(out2, /already wired/i)
    const attr2 = fs.readFileSync(path.join(repo, '.gitattributes'), 'utf8')
    assert.equal(attr2, attr1)
    // Content identical; mtime may refresh on some FS — content is the contract
    void mtime1
  })

  test('--allow-dirty escape hatch writes into a dirty tree', () => {
    const repo = mkRealGitRepo()
    fs.writeFileSync(path.join(repo, 'dirty.txt'), 'uncommitted\n')
    const io = silentIo()
    const code = wireMergeDriver(repo, {
      ...io,
      log: (m) => io.stdout.write(`${m}\n`),
      write: true,
      allowDirty: true,
    })
    assert.equal(code, 0)
    assert.ok(fs.existsSync(path.join(repo, '.gitattributes')))
  })
})
