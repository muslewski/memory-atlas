import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { BLOCK_BEGIN, BLOCK_END } from '../lib/blocks.mjs'
import { runDoctor } from '../lib/doctor.mjs'
import { runGate } from '../lib/gate.mjs'
import {
  collectRevendorFindings,
  resolveUserSkillsDir,
  SOURCE_REPO,
  SOURCE_USER_SCOPE,
  USER_SKILLS_ENV,
} from '../lib/skills.mjs'
import { readState, sha256, STATE_FILE } from '../lib/state.mjs'
import { isWorkingTreeDirty, runWire, wireMergeDriver } from '../lib/wire.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const EXPECTED_SKILLS = [
  'atlas-adopt',
  'atlas-nav',
  'atlas-recollection',
  'atlas-update',
  'writing-for-retrieval',
]

const PACKAGE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const PACKAGE_SKILLS = path.join(PACKAGE_ROOT, 'skills')

const tmpDirs = []

/** Empty user-scope skills root — isolates tests from the host ~/.claude/skills. */
const EMPTY_USER_SKILLS = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-user-skills-empty-'))
tmpDirs.push(EMPTY_USER_SKILLS)

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

/** Populate a temp user-scope skills dir with copies of package skills (subset or all). */
function mkUserSkills(names = EXPECTED_SKILLS) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-user-skills-'))
  tmpDirs.push(dir)
  for (const name of names) {
    const src = path.join(PACKAGE_SKILLS, name, 'SKILL.md')
    if (!fs.existsSync(src)) continue
    const destDir = path.join(dir, name)
    fs.mkdirSync(destDir, { recursive: true })
    fs.copyFileSync(src, path.join(destDir, 'SKILL.md'))
  }
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

/** Default isolation: empty user-scope so legacy vendoring tests stay deterministic. */
function wire(argv, opts = {}) {
  return runWire(argv, { userSkillsDir: EMPTY_USER_SKILLS, ...opts })
}

function doctor(argv, opts = {}) {
  return runDoctor(argv, { userSkillsDir: EMPTY_USER_SKILLS, ...opts })
}

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('runWire', () => {
  test('fresh wire-all creates settings, grok drop-in, both blocks, and state', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const io = silentIo()

    const code = wire(['all'], { cwd: repo, grokHooksDir, ...io })

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
    wire(['all'], {
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
    const code = wire(['all'], { cwd: repo, grokHooksDir, ...io })
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

    const code = wire(['claude'], {
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
    const code = wire(['claude'], { cwd: repo, grokHooksDir, ...io })
    assert.equal(code, 1)
    assert.equal(fs.readFileSync(settingsPath, 'utf8'), bad)
    assert.ok(io.err.some((line) => /malformed/i.test(line)))
  })

  test('wire grok alone touches nothing Claude-side', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()

    const code = wire(['grok'], {
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
    const code = wire(['all'], {
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

    const code2 = wire(['all'], {
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

    const code = wire(['grok'], {
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
    wire(['all'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })

    const skillPath = path.join(repo, '.claude', 'skills', 'atlas-nav', 'SKILL.md')
    const original = fs.readFileSync(skillPath, 'utf8')
    const edited = `${original}\n\n<!-- local edit -->\n`
    fs.writeFileSync(skillPath, edited)

    wire(['all'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    assert.equal(fs.readFileSync(skillPath, 'utf8'), edited)

    const out = []
    doctor([], {
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
    const code = wire(['claude'], { cwd: repo, grokHooksDir, ...io })
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
    const code = wire(['claude'], { cwd: repo, grokHooksDir, ...io })
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
    const code = wire(['all'], { cwd: repo, grokHooksDir, ...io })
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
    wire(['all'], {
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
    const code = wire(['claude'], { cwd: repo, grokHooksDir, ...io })
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

    wire(['claude'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })

    const dest = path.join(repo, '.claude', 'skills', 'atlas-skin', 'SKILL.md')
    const edited = '# peer original\n\n<!-- local -->\n'
    fs.writeFileSync(dest, edited)

    wire(['claude'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    assert.equal(fs.readFileSync(dest, 'utf8'), edited)
  })
})

describe('user-scope skills', () => {
  test('resolveUserSkillsDir: default under home, env override, opts override', () => {
    const fakeHome = () => '/tmp/fake-home-atlas-skills'
    assert.equal(
      resolveUserSkillsDir({ homedir: fakeHome, env: {} }),
      path.join('/tmp/fake-home-atlas-skills', '.claude', 'skills'),
    )
    assert.equal(
      resolveUserSkillsDir({
        homedir: fakeHome,
        env: { [USER_SKILLS_ENV]: '/custom/user-skills' },
      }),
      path.resolve('/custom/user-skills'),
    )
    assert.equal(
      resolveUserSkillsDir({
        userSkillsDir: '/opts/wins',
        env: { [USER_SKILLS_ENV]: '/custom/user-skills' },
        homedir: fakeHome,
      }),
      path.resolve('/opts/wins'),
    )
  })

  test('user-scope present + repo clean → wire does not vendor; state source=user-scope', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const userSkills = mkUserSkills(EXPECTED_SKILLS)
    const io = silentIo()

    const code = wire(['all'], {
      cwd: repo,
      grokHooksDir,
      userSkillsDir: userSkills,
      ...io,
    })
    assert.equal(code, 0)

    for (const name of EXPECTED_SKILLS) {
      assert.ok(
        !fs.existsSync(path.join(repo, '.claude', 'skills', name, 'SKILL.md')),
        `must not vendor ${name} when user-scope has it`,
      )
    }

    const state = readState(repo)
    for (const name of EXPECTED_SKILLS) {
      const key = `skills/${name}/SKILL.md`
      assert.equal(state.vendored[key]?.source, SOURCE_USER_SCOPE, key)
      assert.ok(state.vendored[key]?.sha256)
    }
    assert.ok(io.out.some((l) => /user-scope satisfies/.test(l)))
  })

  test('user-scope absent → existing vendor behaviour unchanged', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    // EMPTY_USER_SKILLS via wire() default
    const code = wire(['all'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    assert.equal(code, 0)
    for (const name of EXPECTED_SKILLS) {
      assert.ok(fs.existsSync(path.join(repo, '.claude', 'skills', name, 'SKILL.md')))
    }
    const state = readState(repo)
    for (const name of EXPECTED_SKILLS) {
      const key = `skills/${name}/SKILL.md`
      assert.equal(state.vendored[key]?.source, SOURCE_REPO)
    }
  })

  test('skills.vendorInRepo true forces vendoring even when user-scope has the skill', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const userSkills = mkUserSkills(['atlas-nav'])
    fs.writeFileSync(
      path.join(repo, 'atlas.config.json'),
      `${JSON.stringify({ skills: { vendorInRepo: true } }, null, 2)}\n`,
    )
    const code = wire(['claude'], {
      cwd: repo,
      grokHooksDir,
      userSkillsDir: userSkills,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    assert.equal(code, 0)
    assert.ok(fs.existsSync(path.join(repo, '.claude', 'skills', 'atlas-nav', 'SKILL.md')))
    const state = readState(repo)
    assert.equal(state.vendored['skills/atlas-nav/SKILL.md']?.source, SOURCE_REPO)
    // Opt-in: re-vendor findings suppressed
    const findings = collectRevendorFindings(
      repo,
      '.claude/skills',
      { skills: { vendorInRepo: true } },
      { userSkillsDir: userSkills },
    )
    assert.equal(findings.length, 0)
  })

  test('redundant vendored copy (identical to user-scope) is reported', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    // Vendor first with empty user-scope
    wire(['claude'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    // Then install matching user-scope copies
    const userSkills = mkUserSkills(EXPECTED_SKILLS)

    const findings = collectRevendorFindings(
      repo,
      '.claude/skills',
      { skills: { vendorInRepo: false } },
      { userSkillsDir: userSkills },
    )
    assert.ok(findings.length >= EXPECTED_SKILLS.length)
    for (const f of findings) {
      assert.equal(f.kind, 'redundant')
      assert.match(f.message, /redundant/)
      assert.match(f.message, /safe to delete/)
      assert.equal(f.repoHash, f.userHash)
    }

    const io = silentIo()
    doctor([], { cwd: repo, grokHooksDir, userSkillsDir: userSkills, ...io })
    assert.match(io.out.join(''), /redundant vendored copy/)

    const gateIo = silentIo()
    const gateCode = runGate([], {
      cwd: repo,
      userSkillsDir: userSkills,
      fetchLatest: () => null,
      ...gateIo,
    })
    assert.equal(gateCode, 0)
    assert.match(gateIo.out.join(''), /redundant vendored copy/)
  })

  test('divergent vendored copy reports DRIFT with both hashes and no newer-side claim', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    wire(['claude'], {
      cwd: repo,
      grokHooksDir,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })

    const userSkills = mkUserSkills(['atlas-nav'])
    // Diverge user-scope content
    const userPath = path.join(userSkills, 'atlas-nav', 'SKILL.md')
    fs.writeFileSync(userPath, '# divergent user-scope atlas-nav\n')
    const userHash = sha256(fs.readFileSync(userPath, 'utf8'))
    const repoPath = path.join(repo, '.claude', 'skills', 'atlas-nav', 'SKILL.md')
    const repoHash = sha256(fs.readFileSync(repoPath, 'utf8'))
    assert.notEqual(userHash, repoHash)

    const findings = collectRevendorFindings(
      repo,
      '.claude/skills',
      {},
      { userSkillsDir: userSkills },
    )
    const drift = findings.find((f) => f.name === 'atlas-nav')
    assert.ok(drift)
    assert.equal(drift.kind, 'drift')
    assert.equal(drift.repoHash, repoHash)
    assert.equal(drift.userHash, userHash)
    assert.match(drift.message, /DRIFT/)
    assert.match(drift.message, /neither side is assumed newer/)
    assert.ok(!/user-scope is newer|repo is newer|prefer user|prefer repo/i.test(drift.message))

    const io = silentIo()
    doctor([], { cwd: repo, grokHooksDir, userSkillsDir: userSkills, ...io })
    const text = io.out.join('')
    assert.match(text, /DRIFT/)
    assert.match(text, /neither side is assumed newer/)
  })

  test('ATLAS_USER_SKILLS_DIR env override is honoured by wire', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const userSkills = mkUserSkills(['atlas-nav'])
    const env = { ...process.env, [USER_SKILLS_ENV]: userSkills }
    // Do not pass userSkillsDir — only env
    const code = runWire(['claude'], {
      cwd: repo,
      grokHooksDir,
      env,
      // empty homedir skills so only env matters if env broken
      homedir: () => {
        const h = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-home-'))
        tmpDirs.push(h)
        return h
      },
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    assert.equal(code, 0)
    assert.ok(!fs.existsSync(path.join(repo, '.claude', 'skills', 'atlas-nav', 'SKILL.md')))
    const state = readState(repo)
    assert.equal(state.vendored['skills/atlas-nav/SKILL.md']?.source, SOURCE_USER_SCOPE)
    // Other package skills still vendor (not in user-scope)
    assert.ok(fs.existsSync(path.join(repo, '.claude', 'skills', 'atlas-adopt', 'SKILL.md')))
  })

  test('doctor reports user-scope pristine for source=user-scope entries', () => {
    const repo = mkRepo()
    const grokHooksDir = mkGrokDir()
    const userSkills = mkUserSkills(['atlas-nav'])
    wire(['claude'], {
      cwd: repo,
      grokHooksDir,
      userSkillsDir: userSkills,
      stdout: { write: () => {} },
      stderr: { write: () => {} },
    })
    const io = silentIo()
    doctor([], { cwd: repo, grokHooksDir, userSkillsDir: userSkills, ...io })
    assert.match(io.out.join(''), /skills\/atlas-nav\/SKILL\.md: user-scope pristine/)
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
    const code = wire(['merge-driver'], { cwd: repo, ...io })
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
    const code = wire(['merge-driver', '--write'], { cwd: repo, ...io })
    assert.equal(code, 1)
    assert.match(io.err.join(''), /dirty/i)
    assert.match(io.err.join(''), /allow-dirty|unfinished/i)
    assert.ok(!fs.existsSync(path.join(repo, '.gitattributes')))
  })

  test('installer is idempotent: second --write reports no changes and writes nothing new', () => {
    const repo = mkRealGitRepo()
    const io1 = silentIo()
    assert.equal(wire(['merge-driver', '--write'], { cwd: repo, ...io1 }), 0)
    assert.ok(fs.existsSync(path.join(repo, '.gitattributes')))
    const attr1 = fs.readFileSync(path.join(repo, '.gitattributes'), 'utf8')
    assert.match(attr1, /merge=atlas-index/)
    assert.match(attr1, /merge=atlas-zone/)

    // Commit attrs so tree is clean for second write
    execFileSync('git', ['add', '.gitattributes'], { cwd: repo })
    execFileSync('git', ['commit', '-q', '-m', 'attrs'], { cwd: repo })

    const mtime1 = fs.statSync(path.join(repo, '.gitattributes')).mtimeMs
    const io2 = silentIo()
    assert.equal(wire(['merge-driver', '--write'], { cwd: repo, ...io2 }), 0)
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
