/**
 * Golden before/after fixture harness for atlas migrate (r9 contract).
 *
 * For each case under test/fixtures/migrate/<case>/{before,after}/:
 *   copy before/ → temp, git init + commit, runMigrate(--write), deep-compare to after/.
 * State file atlasVersion (top-level and vendored[*].atlasVersion) is asserted
 * against packageVersion() and excluded from byte-compare so goldens stay
 * version-agnostic.
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { compareVersions, runMigrate } from '../lib/migrate.mjs'
import { MIGRATIONS } from '../lib/migrations/index.mjs'
import { packageVersion, STATE_FILE } from '../lib/state.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.join(__dirname, 'fixtures', 'migrate')
const tmpDirs = []

/**
 * Remap migration targets that are still ahead of the package version so
 * pre-release worktrees can exercise the golden suite before the version bump.
 * @returns {typeof MIGRATIONS}
 */
function registryForInstalled() {
  const installed = packageVersion()
  return MIGRATIONS.map((m) => ({
    ...m,
    target: compareVersions(m.target, installed) > 0 ? installed : m.target,
  }))
}

/**
 * List all files under dir as relative posix-ish paths (sorted).
 * @param {string} dir
 * @returns {string[]}
 */
function listFiles(dir) {
  const out = []
  function walk(rel) {
    const abs = path.join(dir, rel)
    for (const name of fs.readdirSync(abs).sort()) {
      if (name === '.git') continue
      const child = rel ? path.join(rel, name) : name
      const st = fs.statSync(path.join(dir, child))
      if (st.isDirectory()) walk(child)
      else out.push(child.split(path.sep).join('/'))
    }
  }
  walk('')
  return out.sort()
}

/**
 * Normalize .atlas-state.json for byte-compare: drop version fields that track
 * the installed package.
 * @param {string} raw
 * @returns {{ atlasVersion: string, normalized: string }}
 */
function normalizeState(raw) {
  const obj = JSON.parse(raw)
  const atlasVersion = obj.atlasVersion
  delete obj.atlasVersion
  if (obj.vendored && typeof obj.vendored === 'object') {
    for (const meta of Object.values(obj.vendored)) {
      if (meta && typeof meta === 'object') delete meta.atlasVersion
    }
  }
  return {
    atlasVersion,
    normalized: `${JSON.stringify(obj, null, 2)}\n`,
  }
}

/**
 * Deep-compare result tree to expected after/ tree.
 * @param {string} resultDir
 * @param {string} afterDir
 * @param {{ expectStateBump: boolean }} opts
 */
function compareTrees(resultDir, afterDir, { expectStateBump }) {
  const resultFiles = listFiles(resultDir)
  const afterFiles = listFiles(afterDir)
  assert.deepEqual(resultFiles, afterFiles, 'file set mismatch')

  for (const rel of afterFiles) {
    const got = fs.readFileSync(path.join(resultDir, rel), 'utf8')
    const exp = fs.readFileSync(path.join(afterDir, rel), 'utf8')
    if (rel === STATE_FILE || rel.endsWith(`/${STATE_FILE}`)) {
      const g = normalizeState(got)
      const e = normalizeState(exp)
      if (expectStateBump) {
        assert.equal(
          g.atlasVersion,
          packageVersion(),
          `${rel}: atlasVersion should equal packageVersion()`,
        )
      } else {
        assert.equal(g.atlasVersion, e.atlasVersion, `${rel}: atlasVersion preserved`)
      }
      assert.equal(g.normalized, e.normalized, `${rel}: state body mismatch`)
    } else {
      assert.equal(got, exp, `${rel}: content mismatch`)
    }
  }
}

/**
 * @param {string} beforeDir
 * @returns {string} temp repo path
 */
function materialize(beforeDir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-migrate-golden-'))
  tmpDirs.push(tmp)
  fs.cpSync(beforeDir, tmp, { recursive: true })
  execFileSync('git', ['init', '-q'], { cwd: tmp })
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tmp })
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmp })
  execFileSync('git', ['add', '-A'], { cwd: tmp })
  execFileSync('git', ['commit', '-q', '-m', 'fixture'], { cwd: tmp })
  return tmp
}

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('migrate golden fixtures', () => {
  const cases = fs
    .readdirSync(FIXTURES, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()

  test('fixture cases exist', () => {
    assert.ok(cases.includes('backfill-provenance'))
    assert.ok(cases.includes('up-to-date'))
  })

  for (const name of cases) {
    test(`case: ${name}`, () => {
      const beforeDir = path.join(FIXTURES, name, 'before')
      const afterDir = path.join(FIXTURES, name, 'after')
      assert.ok(fs.existsSync(beforeDir), `missing ${beforeDir}`)
      assert.ok(fs.existsSync(afterDir), `missing ${afterDir}`)

      const tmp = materialize(beforeDir)
      const hadState = fs.existsSync(path.join(tmp, STATE_FILE))

      const code = runMigrate(['--write'], {
        cwd: tmp,
        stdout: { write: () => {} },
        stderr: { write: () => {} },
        migrations: registryForInstalled(),
      })
      assert.equal(code, 0)

      // backfill creates state → expect packageVersion bump; up-to-date preserves
      const expectStateBump = name === 'backfill-provenance' || !hadState
      compareTrees(tmp, afterDir, {
        expectStateBump: expectStateBump && fs.existsSync(path.join(afterDir, STATE_FILE)),
      })
    })
  }

  test('harness detects wrong after content (self-check)', () => {
    const afterDir = path.join(FIXTURES, 'up-to-date', 'after')
    const poison = path.join(afterDir, 'POISON.txt')
    fs.writeFileSync(poison, 'should not be here\n')
    try {
      const tmp = materialize(path.join(FIXTURES, 'up-to-date', 'before'))
      runMigrate(['--write'], {
        cwd: tmp,
        stdout: { write: () => {} },
        stderr: { write: () => {} },
        migrations: registryForInstalled(),
      })
      assert.throws(
        () => compareTrees(tmp, afterDir, { expectStateBump: false }),
        /file set mismatch|content mismatch/,
      )
    } finally {
      fs.unlinkSync(poison)
    }
  })
})
