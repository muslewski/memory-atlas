import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { runStamp } from '../lib/stamp.mjs'
import { packageVersion, readState, writeState } from '../lib/state.mjs'
import { runStatus } from '../lib/status.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.dirname(__dirname)
const BIN = path.join(REPO_ROOT, 'bin', 'atlas.mjs')

const tmpDirs = []

function mkRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-integration-'))
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

function atlas(repo, args) {
  // spawnSync (not execFileSync) so success-path stderr is captured too —
  // graphWarnings print via stderr.write while exit code stays 0.
  const r = spawnSync('node', [BIN, ...args], { cwd: repo, encoding: 'utf8' })
  return {
    code: r.status ?? 1,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  }
}

function writeZone(
  vault,
  slug,
  frontmatterExtra,
  { status = 'seeded', verifiedAt = 'unverified' } = {},
) {
  // JSON.stringify keeps all-digit short SHAs as quoted YAML strings so the
  // frontmatter subset does not parse them as Numbers (flake root cause).
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
    - "src/${slug}/**"
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
${frontmatterExtra ?? ''}
`
  fs.mkdirSync(path.join(vault, 'map', 'zones'), { recursive: true })
  fs.writeFileSync(path.join(vault, 'map', 'zones', `${slug}.md`), content)
}

/**
 * Like `writeZone`, but writes the card under an arbitrary vault-relative
 * directory instead of the default `map/zones` — for exercising a vault
 * whose `atlas.config.json` remaps `folders.zones`.
 */
function writeZoneAt(
  vault,
  zonesDir,
  slug,
  frontmatterExtra,
  { status = 'seeded', verifiedAt = 'unverified' } = {},
) {
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
    - "src/${slug}/**"
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
${frontmatterExtra ?? ''}
`
  fs.mkdirSync(path.join(vault, zonesDir), { recursive: true })
  fs.writeFileSync(path.join(vault, zonesDir, `${slug}.md`), content)
}

function vaultPath(repo) {
  return path.join(repo, `${path.basename(repo)}-atlas`)
}

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('atlas build — scaffold-to-index (Step 3 scaffold)', () => {
  test('init -> author one zone with verifiedAt = current commit -> build writes an index with 1 row ok', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'checkout'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'checkout', 'index.js'), 'module.exports = {}\n')
    commitAll(repo, 'init tree')
    const sha = shaOf(repo)

    const init = atlas(repo, ['init'])
    assert.equal(init.code, 0)

    const vault = vaultPath(repo)
    writeZone(vault, 'checkout', '', { status: 'active', verifiedAt: sha })

    const build = atlas(repo, ['build'])
    assert.equal(build.code, 0)
    assert.match(build.stdout, /Atlas map rebuilt: 1 zones, 0 gap\(s\)\./)

    const index = fs.readFileSync(path.join(vault, 'map', 'index.md'), 'utf8')
    assert.match(index, /\| checkout \| active \| ok \| the checkout flow \|/)
  })
})

describe('atlas build/check — stale flow (Step 4)', () => {
  test('touching an owned file after stamping flips the row to stale; --strict does not harden it', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'billing'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'billing', 'index.js'), '// v1\n')
    commitAll(repo, 'init tree')

    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'billing', '', { status: 'active', verifiedAt: shaOf(repo) })

    const build1 = atlas(repo, ['build'])
    assert.equal(build1.code, 0)
    commitAll(repo, 'atlas: seed billing zone + index')

    const check1 = atlas(repo, ['check'])
    assert.equal(check1.code, 0)

    // Touch the owned file after the stamp/build/commit above.
    fs.writeFileSync(path.join(repo, 'src', 'billing', 'index.js'), '// v2\n')
    commitAll(repo, 'billing: v2')

    const build2 = atlas(repo, ['build'])
    assert.equal(build2.code, 0)
    const index2 = fs.readFileSync(path.join(vault, 'map', 'index.md'), 'utf8')
    assert.match(index2, /\| billing \| active \| ⚠ stale \|/)
    commitAll(repo, 'atlas: rebuild index (stale)')

    const checkLoose = atlas(repo, ['check'])
    assert.equal(checkLoose.code, 0, 'staleness alone must not fail plain check')
    assert.match(checkLoose.stderr, /stale zone\(s\): billing/)

    // Owner decision 3: --strict never hardens freshness — only config does.
    const checkStrict = atlas(repo, ['check', '--strict'])
    assert.equal(checkStrict.code, 0, 'a stale row must NOT fail check --strict')
    assert.match(checkStrict.stderr, /stale zone\(s\): billing/)

    const cfgPath = path.join(repo, 'atlas.config.json')
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
    cfg.check = { ...(cfg.check ?? {}), strictFreshness: true }
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))

    const checkHard = atlas(repo, ['check'])
    assert.equal(checkHard.code, 1, 'check.strictFreshness: true must fail on stale')
    assert.match(checkHard.stderr, /1 stale zone\(s\): billing/)
  })

  test('check fails when the committed index is out of date with the working tree', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'auth'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'auth', 'index.js'), '// v1\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'auth', '', { status: 'active', verifiedAt: shaOf(repo) })
    atlas(repo, ['build'])
    commitAll(repo, 'atlas: seed auth zone + index')

    // Change owned code without rebuilding+recommitting the index.
    fs.writeFileSync(path.join(repo, 'src', 'auth', 'index.js'), '// v2\n')
    commitAll(repo, 'auth: v2')
    // Manually rewrite the committed index.md's content to something stale
    // relative to what `atlas build` would regenerate, without committing —
    // this simulates "forgot to run atlas build before committing".
    fs.writeFileSync(path.join(vault, 'map', 'index.md'), '<!-- stale placeholder -->\n')
    commitAll(repo, 'atlas: hand-edit index (bad)')

    const check = atlas(repo, ['check'])
    assert.equal(check.code, 1)
    assert.match(check.stderr, /map\/index\.md is out of date/)
  })
})

describe('atlas stamp — explicit-slugs-only + seeded->active flip (Step 4)', () => {
  test('stamps a seeded zone: verifiedAt becomes HEAD sha, status flips to active', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'search'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'search', 'index.js'), '// v1\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'search', '', { status: 'seeded', verifiedAt: 'unverified' })

    const result = runStamp(['search'], { cwd: repo })
    assert.equal(result, 0)

    const raw = fs.readFileSync(path.join(vault, 'map', 'zones', 'search.md'), 'utf8')
    assert.match(raw, /status: active/)
    // All-digit short SHAs are YAML-quoted by stamp; others stay bare.
    assert.match(raw, new RegExp(`verifiedAt: "?${shaOf(repo)}"?`))
    assert.match(raw, /## What this is/, 'body must survive untouched')
  })

  test('no args and --all both exit 1 with the blanket-refusal message; nothing is touched', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'x.js'), '// v1\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'x', '', { status: 'seeded', verifiedAt: 'unverified' })
    const before = fs.readFileSync(path.join(vault, 'map', 'zones', 'x.md'), 'utf8')

    const stderrLines = []
    const stderr = { write: (s) => stderrLines.push(s) }

    const noArgs = runStamp([], { cwd: repo, stderr })
    assert.equal(noArgs, 1)
    const allFlag = runStamp(['--all'], { cwd: repo, stderr })
    assert.equal(allFlag, 1)
    assert.ok(stderrLines.every((l) => l.includes('blanket re-stamping defeats verification')))

    const after1 = fs.readFileSync(path.join(vault, 'map', 'zones', 'x.md'), 'utf8')
    assert.equal(after1, before, 'stamp must not touch any file on a rejected blanket attempt')
  })

  test('refuses a slug that does not exist, exits 1', () => {
    const repo = mkRepo()
    execFileSync('git', ['commit', '--allow-empty', '-q', '-m', 'init'], { cwd: repo })
    atlas(repo, ['init'])
    const result = runStamp(['ghost'], { cwd: repo, stderr: { write: () => {} } })
    assert.equal(result, 1)
  })
})

describe('atlas stamp / build — unmounted zone amendment (SPEC.md verifiedAt rule)', () => {
  test('atlas stamp refuses to stamp an unmounted zone and exits non-zero, leaving it untouched', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'legacy'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'legacy', 'index.js'), '// old\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'legacy', '', { status: 'unmounted', verifiedAt: 'unverified' })
    const before = fs.readFileSync(path.join(vault, 'map', 'zones', 'legacy.md'), 'utf8')

    const stderrLines = []
    const result = runStamp(['legacy'], {
      cwd: repo,
      stderr: { write: (s) => stderrLines.push(s) },
    })

    assert.notEqual(result, 0)
    assert.ok(stderrLines.some((l) => l.includes('unmounted') && l.includes('refusing to stamp')))
    const after1 = fs.readFileSync(path.join(vault, 'map', 'zones', 'legacy.md'), 'utf8')
    assert.equal(after1, before)
  })

  test('an unmounted zone with a SHA verifiedAt survives build unchanged (no error, attic only, no staleness run)', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'legacy'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'legacy', 'index.js'), '// old\n')
    commitAll(repo, 'init tree')
    const sha = shaOf(repo)
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'legacy', '', { status: 'unmounted', verifiedAt: sha })

    // Now change the owned file again WITHOUT re-stamping — if staleness ran
    // against this unmounted zone it would report stale; it must not run at all.
    fs.writeFileSync(path.join(repo, 'src', 'legacy', 'index.js'), '// changed after unmount\n')
    commitAll(repo, 'legacy: change after unmount')

    const build = atlas(repo, ['build'])
    assert.equal(build.code, 0)
    const index = fs.readFileSync(path.join(vault, 'map', 'index.md'), 'utf8')
    assert.doesNotMatch(index, /legacy.*stale/i)
    assert.match(index, /- legacy \(zone\) — the legacy flow/)
  })

  test('an unmounted zone with verifiedAt "unverified" is also legal and produces no error', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'legacy'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'legacy', 'index.js'), '// old\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'legacy', '', { status: 'unmounted', verifiedAt: 'unverified' })

    const build = atlas(repo, ['build'])
    assert.equal(build.code, 0)
    assert.match(build.stdout, /0 gap\(s\)\./)
  })

  test('the canonical tombstone case: an unmounted zone whose owns.globs match no tracked files (the owned code was actually deleted) must not hard-error the glob-existence check', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'legacy'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'legacy', 'index.js'), '// old\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])
    const vault = vaultPath(repo)

    // SPEC.md's "tombstone over delete" ritual: the zone goes unmounted
    // *because* its owned code is gone, so owns.globs now matches nothing.
    fs.rmSync(path.join(repo, 'src', 'legacy'), { recursive: true, force: true })
    commitAll(repo, 'legacy: delete owned code')

    writeZone(vault, 'legacy', '', { status: 'unmounted', verifiedAt: 'unverified' })

    const build = atlas(repo, ['build'])
    assert.equal(
      build.code,
      0,
      'build must not hard-error on an unmounted zone whose globs match no tracked files',
    )
    assert.doesNotMatch(build.stderr, /matches no tracked files/)
    assert.match(build.stdout, /0 gap\(s\)\./)
    commitAll(repo, 'atlas: build index for tombstoned zone')

    const check = atlas(repo, ['check'])
    assert.equal(check.code, 0, 'check must exit 0 for the canonical tombstoned-zone case')
  })
})

describe('atlas build — decisions reach validate() in production', () => {
  test('atlas build surfaces decision graph results', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'checkout'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'checkout', 'index.js'), 'module.exports = {}\n')
    commitAll(repo, 'init tree')
    const sha = shaOf(repo)
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'checkout', '', { status: 'active', verifiedAt: sha })

    fs.mkdirSync(path.join(vault, 'map', 'decisions'), { recursive: true })
    fs.writeFileSync(
      path.join(vault, 'map', 'decisions', '0001-x.md'),
      `---
type: decision
summary: "choice with a broken link"
tags: []
status: active
created: 2026-07-09
updated: 2026-07-09
decided: 2026-07-09
supersededBy: ""
zones: []
related:
  - "[[does-not-exist]]"
sources: []
---

## Context
`,
    )

    const build = atlas(repo, ['build'])
    assert.equal(build.code, 0)
    assert.match(build.stderr, /decision 0001-x: dangling link \[\[does-not-exist\]\] in related/)
    const index = fs.readFileSync(path.join(vault, 'map', 'index.md'), 'utf8')
    assert.match(index, /decision 0001-x: dangling link \[\[does-not-exist\]\] in related/)
  })

  test('unmounted decision appears in the attic', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'checkout'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'checkout', 'index.js'), 'module.exports = {}\n')
    commitAll(repo, 'init tree')
    const sha = shaOf(repo)
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'checkout', '', { status: 'active', verifiedAt: sha })

    fs.mkdirSync(path.join(vault, 'map', 'decisions'), { recursive: true })
    fs.writeFileSync(
      path.join(vault, 'map', 'decisions', '0002-retired.md'),
      `---
type: decision
summary: "superseded choice"
tags: []
status: unmounted
created: 2026-07-09
updated: 2026-07-09
decided: 2026-07-09
supersededBy: ""
zones: []
related: []
sources: []
---

## Context
`,
    )

    const build = atlas(repo, ['build'])
    assert.equal(build.code, 0)
    const index = fs.readFileSync(path.join(vault, 'map', 'index.md'), 'utf8')
    assert.match(index, /- 0002-retired \(decision\) — superseded choice/)
  })
})

describe('loadVault — optional modules join the wikilink graph', () => {
  test('enabled reports module enters the wikilink graph', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'checkout'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'checkout', 'index.js'), 'module.exports = {}\n')
    commitAll(repo, 'init tree')
    const sha = shaOf(repo)
    atlas(repo, ['init'])

    const configPath = path.join(repo, 'atlas.config.json')
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    config.modules.reports = true
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    const vault = vaultPath(repo)
    fs.mkdirSync(path.join(vault, 'reports'), { recursive: true })
    fs.writeFileSync(
      path.join(vault, 'reports', '2026-07-17-example.md'),
      `---
type: report
summary: "example report"
status: snapshot
created: 2026-07-17
updated: 2026-07-17
---

## Snapshot
`,
    )
    // Zone links the report via related (graph pass scans frontmatter fields).
    const zonePath = path.join(vault, 'map', 'zones', 'checkout.md')
    fs.mkdirSync(path.dirname(zonePath), { recursive: true })
    fs.writeFileSync(
      zonePath,
      `---
type: zone
summary: "the checkout flow"
tags: []
status: active
created: 2026-07-09
updated: 2026-07-09
verifiedAt: ${JSON.stringify(sha)}
owns:
  globs:
    - "src/checkout/**"
  routes: []
  testids: []
  tools: []
depends: []
invariants: []
skills: []
advances: []
related:
  - "[[2026-07-17-example]]"
sources: []
---

## What this is
`,
    )

    const build = atlas(repo, ['build'])
    assert.equal(build.code, 0)
    assert.doesNotMatch(build.stderr, /dangling link \[\[2026-07-17-example\]\]/)
    const index = fs.readFileSync(path.join(vault, 'map', 'index.md'), 'utf8')
    assert.doesNotMatch(index, /dangling link \[\[2026-07-17-example\]\]/)
  })

  test('disabled modules are not walked', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'checkout'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'checkout', 'index.js'), 'module.exports = {}\n')
    commitAll(repo, 'init tree')
    const sha = shaOf(repo)
    atlas(repo, ['init'])

    // reports defaults to false — leave it off (conservative default intact).
    const vault = vaultPath(repo)
    fs.mkdirSync(path.join(vault, 'reports'), { recursive: true })
    fs.writeFileSync(
      path.join(vault, 'reports', '2026-07-17-example.md'),
      `---
type: report
summary: "example report"
status: snapshot
created: 2026-07-17
updated: 2026-07-17
---

## Snapshot
`,
    )
    const zonePath = path.join(vault, 'map', 'zones', 'checkout.md')
    fs.mkdirSync(path.dirname(zonePath), { recursive: true })
    fs.writeFileSync(
      zonePath,
      `---
type: zone
summary: "the checkout flow"
tags: []
status: active
created: 2026-07-09
updated: 2026-07-09
verifiedAt: ${JSON.stringify(sha)}
owns:
  globs:
    - "src/checkout/**"
  routes: []
  testids: []
  tools: []
depends: []
invariants: []
skills: []
advances: []
related:
  - "[[2026-07-17-example]]"
sources: []
---

## What this is
`,
    )

    const build = atlas(repo, ['build'])
    assert.equal(build.code, 0)
    assert.match(build.stderr, /dangling link \[\[2026-07-17-example\]\]/)
  })

  test('enabled reference and archive modules enter the wikilink graph', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'checkout'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'checkout', 'index.js'), 'module.exports = {}\n')
    commitAll(repo, 'init tree')
    const sha = shaOf(repo)
    atlas(repo, ['init'])

    const configPath = path.join(repo, 'atlas.config.json')
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    config.modules.reference = true
    config.modules.archive = true
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    const vault = vaultPath(repo)
    fs.mkdirSync(path.join(vault, 'reference'), { recursive: true })
    fs.writeFileSync(
      path.join(vault, 'reference', 'glossary.md'),
      `---
type: reference
summary: "terms"
---

## Terms
`,
    )
    // archive is nested (retired trees).
    fs.mkdirSync(path.join(vault, 'archive', 'old-specs'), { recursive: true })
    fs.writeFileSync(
      path.join(vault, 'archive', 'old-specs', 'retired-spec.md'),
      `---
type: spec
summary: "retired"
status: done
---

## Old
`,
    )

    const zonePath = path.join(vault, 'map', 'zones', 'checkout.md')
    fs.mkdirSync(path.dirname(zonePath), { recursive: true })
    fs.writeFileSync(
      zonePath,
      `---
type: zone
summary: "the checkout flow"
tags: []
status: active
created: 2026-07-09
updated: 2026-07-09
verifiedAt: ${JSON.stringify(sha)}
owns:
  globs:
    - "src/checkout/**"
  routes: []
  testids: []
  tools: []
depends: []
invariants: []
skills: []
advances: []
related:
  - "[[glossary]]"
  - "[[retired-spec]]"
sources: []
---

## What this is
`,
    )

    const build = atlas(repo, ['build'])
    assert.equal(build.code, 0)
    assert.doesNotMatch(build.stderr, /dangling link \[\[glossary\]\]/)
    assert.doesNotMatch(build.stderr, /dangling link \[\[retired-spec\]\]/)
  })
})

describe('atlas build — ledger section in generated index', () => {
  test('build index includes Ledger section when specs exist', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'checkout'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'checkout', 'index.js'), 'module.exports = {}\n')
    commitAll(repo, 'init tree')
    const sha = shaOf(repo)
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'checkout', '', { status: 'active', verifiedAt: sha })
    fs.mkdirSync(path.join(vault, 'specs'), { recursive: true })
    fs.writeFileSync(
      path.join(vault, 'specs', '2026-07-17-checkout.md'),
      `---
type: spec
summary: "checkout design"
status: draft
created: 2026-07-17
updated: 2026-07-17
---

## Design
`,
    )

    const build = atlas(repo, ['build'])
    assert.equal(build.code, 0)
    const index = fs.readFileSync(path.join(vault, 'map', 'index.md'), 'utf8')
    assert.match(index, /## Ledger/)
    assert.match(index, /specs: 1 \(draft 1\)/)
    assert.match(index, /\[\[2026-07-17-checkout\]\]/)
  })
})

describe('atlas check --report — ledger coverage summary (Step 5)', () => {
  test('--report prints the ledger coverage line; without it the line is absent', () => {
    const repo = mkRepo()
    execFileSync('git', ['commit', '--allow-empty', '-q', '-m', 'init'], { cwd: repo })
    atlas(repo, ['init'])
    commitAll(repo, 'atlas: init vault')

    const build = atlas(repo, ['build'])
    assert.equal(build.code, 0)
    // init already writes a render-matching empty index (check-ready vault);
    // only commit when build actually dirtied the tree.
    const dirty = execFileSync('git', ['status', '--porcelain'], {
      cwd: repo,
      encoding: 'utf8',
    }).trim()
    if (dirty) commitAll(repo, 'atlas: build index')

    const withoutReport = atlas(repo, ['check'])
    assert.equal(withoutReport.code, 0)
    assert.doesNotMatch(withoutReport.stdout, /ledger: \d+\/\d+ clean/)

    const withReport = atlas(repo, ['check', '--report'])
    assert.equal(withReport.code, 0)
    assert.match(withReport.stdout, /ledger: \d+\/\d+ clean \(\d+(\.\d+)?%\)/)
  })
})

/**
 * Write a zone card with full template headers + optional body/summary overrides
 * for corpus-quality integration fixtures.
 */
function writeCorpusZone(
  vault,
  slug,
  { summary, bodyExtra = '', status = 'seeded', verifiedAt = 'unverified' } = {},
) {
  const sum = summary ?? `the ${slug} flow`
  const content = `---
type: zone
summary: ${JSON.stringify(sum)}
tags: []
status: ${status}
created: 2026-07-09
updated: 2026-07-09
verifiedAt: ${JSON.stringify(verifiedAt)}
owns:
  globs:
    - "src/${slug}/**"
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

Zone body for ${slug}.

## Anchors

Owns src/${slug}/**

## Invariants

None yet.

## Lineage

${bodyExtra}
`
  fs.mkdirSync(path.join(vault, 'map', 'zones'), { recursive: true })
  fs.writeFileSync(path.join(vault, 'map', 'zones', `${slug}.md`), content)
}

describe('atlas check — ownership SSOT is always hard', () => {
  test('ownership conflict fails check with and without --strict', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'shared'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'shared', 'x.js'), '// x\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    const sha = shaOf(repo)

    // Two zones both claim src/shared/**
    for (const slug of ['alpha', 'beta']) {
      const content = `---
type: zone
summary: "the ${slug} flow"
tags: []
status: active
created: 2026-07-09
updated: 2026-07-09
verifiedAt: ${JSON.stringify(sha)}
owns:
  globs:
    - "src/shared/**"
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
    atlas(repo, ['build'])
    commitAll(repo, 'atlas: conflicting owners')

    const loose = atlas(repo, ['check'])
    assert.equal(loose.code, 1, 'ownership conflict must fail plain check')
    assert.match(loose.stderr, /owned by|src\/shared/)

    const strict = atlas(repo, ['check', '--strict'])
    assert.equal(strict.code, 1, 'ownership conflict must fail --strict too')
    assert.match(strict.stderr, /owned by|src\/shared/)
  })
})

describe('atlas check — corpus-quality gate (opt-in)', () => {
  test('corpus disabled (default): retrieval-shape violations are invisible; check exits 0', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'messy'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'messy', 'a.js'), '// a\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    // Over-cap summary, broken body link, orphan — all would fail if corpus were on.
    writeCorpusZone(vault, 'messy', {
      summary: 'x'.repeat(501),
      bodyExtra: 'See [[nowhere-at-all]].\n',
      status: 'active',
      verifiedAt: shaOf(repo),
    })
    atlas(repo, ['build'])
    commitAll(repo, 'atlas: seed messy zone')

    const check = atlas(repo, ['check'])
    assert.equal(check.code, 0, `default corpus off must not fail: ${check.stderr}`)
    assert.doesNotMatch(check.stderr, /\[summary\]|\[headers\]|\[broken-link\]|\[orphan\]/)
  })

  test('corpus enabled via config: atlas check exit 1 with corpus violations', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'messy'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'messy', 'a.js'), '// a\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])

    const cfgPath = path.join(repo, 'atlas.config.json')
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
    cfg.check = { ...(cfg.check ?? {}), corpus: { enabled: true, maxSummaryLen: 500 } }
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))

    const vault = vaultPath(repo)
    writeCorpusZone(vault, 'messy', {
      summary: 'x'.repeat(501),
      bodyExtra: 'See [[nowhere-at-all]].\n',
      status: 'active',
      verifiedAt: shaOf(repo),
    })
    atlas(repo, ['build'])
    commitAll(repo, 'atlas: seed messy zone + corpus on')

    const check = atlas(repo, ['check'])
    assert.equal(check.code, 1, `corpus on must fail: ${check.stderr}`)
    assert.match(check.stderr, /\[summary\]/)
    assert.match(check.stderr, /\[broken-link\]/)
    assert.match(check.stderr, /\[orphan\]/)
  })

  test('corpus enabled + linked zones with crisp summaries pass', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'alpha'), { recursive: true })
    fs.mkdirSync(path.join(repo, 'src', 'beta'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'alpha', 'a.js'), '// a\n')
    fs.writeFileSync(path.join(repo, 'src', 'beta', 'b.js'), '// b\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])

    const cfgPath = path.join(repo, 'atlas.config.json')
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
    cfg.check = { ...(cfg.check ?? {}), corpus: { enabled: true, maxSummaryLen: 500 } }
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))

    const vault = vaultPath(repo)
    const sha = shaOf(repo)
    writeCorpusZone(vault, 'alpha', {
      summary: 'alpha zone',
      bodyExtra: 'See [[beta]].\n',
      status: 'active',
      verifiedAt: sha,
    })
    writeCorpusZone(vault, 'beta', {
      summary: 'beta zone',
      bodyExtra: 'See [[alpha]].\n',
      status: 'active',
      verifiedAt: sha,
    })
    atlas(repo, ['build'])
    commitAll(repo, 'atlas: two linked zones')

    const check = atlas(repo, ['check'])
    assert.equal(check.code, 0, `linked clean corpus vault must pass: ${check.stderr}`)
  })
})

describe('atlas status — one line, tolerant, zero side effects', () => {
  test('silently exits 0 when there is no git repo', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-nogit-'))
    tmpDirs.push(dir)
    const lines = []
    const code = runStatus([], { cwd: dir, stdout: { write: (s) => lines.push(s) } })
    assert.equal(code, 0)
    assert.deepEqual(lines, [])
  })

  test('silently exits 0 when there is a repo but no vault', () => {
    const repo = mkRepo()
    execFileSync('git', ['commit', '--allow-empty', '-q', '-m', 'init'], { cwd: repo })
    const lines = []
    const code = runStatus([], { cwd: repo, stdout: { write: (s) => lines.push(s) } })
    assert.equal(code, 0)
    assert.deepEqual(lines, [])
  })

  test('reports zone/seeded/stale counts once a vault exists', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'x.js'), '// v1\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'one', '', { status: 'seeded', verifiedAt: 'unverified' })

    // Pin registry inject so CI does not depend on live npm latest.
    const current = packageVersion()
    const lines = []
    const code = runStatus([], {
      cwd: repo,
      stdout: { write: (s) => lines.push(s) },
      fetchLatest: () => current,
    })
    assert.equal(code, 0)
    assert.equal(lines.length, 1)
    assert.match(
      lines[0],
      /🧭 .*-atlas: 1 zones \(1 seeded\) · 0 specs · 0 plans · ⚠ 0 open debt · 0 stale/,
    )
  })

  test('update nudge when state.atlasVersion is older than installed', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'x.js'), '// v1\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'one', '', { status: 'seeded', verifiedAt: 'unverified' })

    const state = readState(repo)
    state.atlasVersion = '0.0.1'
    writeState(repo, state)

    const current = packageVersion()
    const lines = []
    const code = runStatus([], {
      cwd: repo,
      stdout: { write: (s) => lines.push(s) },
      fetchLatest: () => current,
    })
    assert.equal(code, 0)
    assert.equal(lines.length, 2)
    assert.match(lines[0], /🧭 /)
    assert.equal(
      lines[1],
      `⬆ atlas ${current} installed, wired 0.0.1 — run the atlas-update skill (.claude/skills/atlas-update/SKILL.md)\n`,
    )
  })

  test('registry lag soft-nudges on status --hook (OSS update-me)', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'x.js'), '// v1\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'one', '', { status: 'seeded', verifiedAt: 'unverified' })

    const current = packageVersion()
    const lines = []
    const code = runStatus(['--hook'], {
      cwd: repo,
      stdout: { write: (s) => lines.push(s) },
      fetchLatest: () => '9.9.9',
    })
    assert.equal(code, 0)
    assert.match(lines[0], /🧭 /)
    assert.equal(
      lines[1],
      `⬆ memory-atlas 9.9.9 available on npm (installed ${current}) — npm i -D memory-atlas@9.9.9 then atlas-update\n`,
    )
  })

  test('equal versions → single-line status, no nudge', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'x.js'), '// v1\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'one', '', { status: 'seeded', verifiedAt: 'unverified' })

    const current = packageVersion()
    const lines = []
    runStatus([], {
      cwd: repo,
      stdout: { write: (s) => lines.push(s) },
      fetchLatest: () => current,
    })
    assert.equal(lines.length, 1)
    assert.ok(!lines[0].includes('⬆ atlas'))
  })

  test('no state file → single-line status, silent no nudge', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'x.js'), '// v1\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'one', '', { status: 'seeded', verifiedAt: 'unverified' })
    fs.rmSync(path.join(repo, '.atlas-state.json'))

    const current = packageVersion()
    const lines = []
    runStatus([], {
      cwd: repo,
      stdout: { write: (s) => lines.push(s) },
      fetchLatest: () => current,
    })
    assert.equal(lines.length, 1)
    assert.match(lines[0], /🧭 /)
  })

  test('update nudge respects --hook + sessionStartStatus: false silence path', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'x.js'), '// v1\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'one', '', { status: 'seeded', verifiedAt: 'unverified' })

    const state = readState(repo)
    state.atlasVersion = '0.0.1'
    writeState(repo, state)

    const configPath = path.join(repo, 'atlas.config.json')
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    config.hooks.sessionStartStatus = false
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    const lines = []
    const code = runStatus(['--hook'], {
      cwd: repo,
      stdout: { write: (s) => lines.push(s) },
      fetchLatest: () => packageVersion(),
    })
    assert.equal(code, 0)
    assert.deepEqual(lines, [])
  })
})

describe('config — folder remapping (Step 2)', () => {
  test('a default config produces byte-identical map/index.md whether folders is implicit or spelled out explicitly', () => {
    const repoImplicit = mkRepo()
    fs.mkdirSync(path.join(repoImplicit, 'src', 'billing'), { recursive: true })
    fs.writeFileSync(path.join(repoImplicit, 'src', 'billing', 'index.js'), '// v1\n')
    commitAll(repoImplicit, 'init tree')
    atlas(repoImplicit, ['init'])
    const vaultImplicit = vaultPath(repoImplicit)
    writeZone(vaultImplicit, 'billing', '', { status: 'active', verifiedAt: shaOf(repoImplicit) })
    atlas(repoImplicit, ['build'])
    const indexImplicit = fs.readFileSync(path.join(vaultImplicit, 'map', 'index.md'), 'utf8')

    const repoExplicit = mkRepo()
    fs.mkdirSync(path.join(repoExplicit, 'src', 'billing'), { recursive: true })
    fs.writeFileSync(path.join(repoExplicit, 'src', 'billing', 'index.js'), '// v1\n')
    commitAll(repoExplicit, 'init tree')
    atlas(repoExplicit, ['init'])
    const configPath = path.join(repoExplicit, 'atlas.config.json')
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    // Spell out every folders.* entry as its own default value, verbatim —
    // an explicit no-op remap must never change generated output.
    config.folders = {
      zones: 'map/zones',
      decisions: 'map/decisions',
      flows: 'map/flows',
      specs: 'specs',
      plans: 'plans',
      programs: 'programs',
      ideas: 'ideas',
      techDebt: 'tech-debt',
      vision: 'vision',
      reference: 'reference',
      archive: 'archive',
      reports: 'reports',
      drafts: 'drafts',
      templates: 'templates',
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    const vaultExplicit = vaultPath(repoExplicit)
    writeZone(vaultExplicit, 'billing', '', { status: 'active', verifiedAt: shaOf(repoExplicit) })
    atlas(repoExplicit, ['build'])
    const indexExplicit = fs.readFileSync(path.join(vaultExplicit, 'map', 'index.md'), 'utf8')

    assert.equal(indexExplicit, indexImplicit)
  })

  test('remapping ideas/techDebt/specs/plans: additive init creates the remapped dirs; status and ledger read from them', () => {
    const repo = mkRepo()
    execFileSync('git', ['commit', '--allow-empty', '-q', '-m', 'init'], { cwd: repo })
    atlas(repo, ['init'])

    const configPath = path.join(repo, 'atlas.config.json')
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    config.folders.ideas = 'notes/sparks'
    config.folders.techDebt = 'debt'
    config.folders.specs = 'design-docs'
    config.folders.plans = 'roadmap'
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    // Re-running init (additive mode, vault already exists) must create the
    // REMAPPED directories, not the defaults.
    const reinit = atlas(repo, ['init'])
    assert.equal(reinit.code, 0)

    const vault = vaultPath(repo)
    assert.ok(fs.statSync(path.join(vault, 'notes', 'sparks')).isDirectory())
    assert.ok(fs.statSync(path.join(vault, 'debt')).isDirectory())
    assert.ok(fs.statSync(path.join(vault, 'design-docs')).isDirectory())
    assert.ok(fs.statSync(path.join(vault, 'roadmap')).isDirectory())

    fs.writeFileSync(
      path.join(vault, 'debt', 'flaky-thing.md'),
      '---\ntype: debt\nsummary: "flaky thing"\nstatus: open\n---\n',
    )
    fs.writeFileSync(
      path.join(vault, 'design-docs', '2026-07-01-checkout.md'),
      '---\ntype: spec\nsummary: "checkout design"\nstatus: draft\n---\n',
    )
    fs.writeFileSync(
      path.join(vault, 'roadmap', '2026-07-02-checkout-plan.md'),
      '---\ntype: plan\nsummary: "checkout plan"\nstatus: ready\n---\n',
    )

    const status = atlas(repo, ['status'])
    assert.equal(status.code, 0)
    assert.match(status.stdout, /1 specs · 1 plans · ⚠ 1 open debt/)

    const ledgerOnly = atlas(repo, ['check', '--ledger-only'])
    assert.equal(ledgerOnly.code, 0)
    assert.match(ledgerOnly.stdout, /ledger: 2\/2 clean \(100(\.0)?%\)/)
  })

  test('remapping folders.zones: atlas stamp resolves the remapped zone card, not the map/zones default', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'billing'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'billing', 'index.js'), '// v1\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])

    const configPath = path.join(repo, 'atlas.config.json')
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    config.folders.zones = 'architecture/zones'
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    const vault = vaultPath(repo)
    // The card lives ONLY at the remapped location — no map/zones/billing.md
    // exists at all, so a stamp that still hardcodes map/zones must fail to
    // find it even though the card plainly exists.
    writeZoneAt(vault, 'architecture/zones', 'billing', '', {
      status: 'seeded',
      verifiedAt: 'unverified',
    })

    const stamp = atlas(repo, ['stamp', 'billing'])
    assert.equal(stamp.code, 0, `expected stamp to succeed, got stderr: ${stamp.stderr}`)

    const raw = fs.readFileSync(path.join(vault, 'architecture', 'zones', 'billing.md'), 'utf8')
    assert.match(raw, /status: active/)
    // All-digit short SHAs are YAML-quoted by stamp; others stay bare.
    assert.match(raw, new RegExp(`verifiedAt: "?${shaOf(repo)}"?`))

    // The default map/zones/ location must never have been touched/created.
    assert.equal(fs.existsSync(path.join(vault, 'map', 'zones', 'billing.md')), false)
  })
})

describe('atlas — enabled kill switch + hooks.sessionStartStatus (Step 3)', () => {
  test('enabled: false silences every subcommand except init: no output, exit 0', () => {
    const repo = mkRepo()
    execFileSync('git', ['commit', '--allow-empty', '-q', '-m', 'init'], { cwd: repo })
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'one', '', { status: 'seeded', verifiedAt: 'unverified' })

    const configPath = path.join(repo, 'atlas.config.json')
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    config.enabled = false
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    const status = atlas(repo, ['status'])
    assert.equal(status.code, 0)
    assert.equal(status.stdout, '')

    const build = atlas(repo, ['build'])
    assert.equal(build.code, 0)
    assert.equal(build.stdout, '')

    // init is explicitly exempt from the kill switch.
    const reinit = atlas(repo, ['init'])
    assert.equal(reinit.code, 0)
    assert.match(reinit.stdout, /existing vault detected/)
  })

  test('hooks.sessionStartStatus: false silences "atlas status --hook" only; plain "atlas status" still prints', () => {
    const repo = mkRepo()
    execFileSync('git', ['commit', '--allow-empty', '-q', '-m', 'init'], { cwd: repo })
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'one', '', { status: 'seeded', verifiedAt: 'unverified' })

    const configPath = path.join(repo, 'atlas.config.json')
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    config.hooks.sessionStartStatus = false
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    const hookCall = atlas(repo, ['status', '--hook'])
    assert.equal(hookCall.code, 0)
    assert.equal(hookCall.stdout, '')

    const humanCall = atlas(repo, ['status'])
    assert.equal(humanCall.code, 0)
    assert.match(humanCall.stdout, /1 zones \(1 seeded\)/)
  })
})

describe('atlas migrate', () => {
  test('current state → ✓ up to date', () => {
    const repo = mkRepo()
    execFileSync('git', ['commit', '--allow-empty', '-q', '-m', 'init'], { cwd: repo })
    atlas(repo, ['init'])
    // init stamps state at packageVersion — empty registry → nothing pending
    const state = readState(repo)
    assert.equal(state?.atlasVersion, packageVersion())

    const r = atlas(repo, ['migrate'])
    assert.equal(r.code, 0)
    assert.match(r.stdout, /✓ up to date \(atlas .+\)/)
  })
})

describe('subcommand --help', () => {
  test('atlas build --help exits 0, prints usage, does not rebuild index', () => {
    const repo = mkRepo()
    execFileSync('git', ['commit', '--allow-empty', '-q', '-m', 'init'], { cwd: repo })
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'one', '', { status: 'seeded', verifiedAt: 'unverified' })
    // seed an index that build would rewrite
    const indexPath = path.join(vault, 'map', 'index.md')
    const marker = '# HAND-MARKED INDEX — help must not overwrite\n'
    fs.writeFileSync(indexPath, marker)
    const before = fs.readFileSync(indexPath, 'utf8')
    const mtimeBefore = fs.statSync(indexPath).mtimeMs

    const r = atlas(repo, ['build', '--help'])
    assert.equal(r.code, 0)
    assert.match(r.stdout, /Usage:/)
    assert.match(r.stdout, /atlas build/)
    assert.equal(fs.readFileSync(indexPath, 'utf8'), before)
    assert.equal(fs.statSync(indexPath).mtimeMs, mtimeBefore)
    assert.ok(!/Atlas map rebuilt/.test(r.stdout))
  })

  test('atlas stamp --help exits 0 with usage, no error demanding slugs', () => {
    const repo = mkRepo()
    execFileSync('git', ['commit', '--allow-empty', '-q', '-m', 'init'], { cwd: repo })
    atlas(repo, ['init'])

    const r = atlas(repo, ['stamp', '--help'])
    assert.equal(r.code, 0)
    assert.match(r.stdout, /Usage:/)
    assert.ok(!/slug/i.test(r.stderr) || r.stderr === '')
    assert.equal(r.stderr.trim(), '')
  })
})

describe('atlas adopt', () => {
  function write(file, text) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, text)
  }

  test('CLI dry-run then --write on brownfield vault; adopted zone frontmatter is honest', () => {
    const repo = mkRepo()
    execFileSync('git', ['commit', '--allow-empty', '-q', '-m', 'init'], { cwd: repo })
    const vault = path.join(repo, 'demo-mind')
    write(
      path.join(vault, 'map', 'zones', 'auth.md'),
      `---
type: zone
summary: "auth zone"
status: active
verifiedAt: ""
owns:
  globs:
    - "src/auth/**"
---
## What
`,
    )
    write(path.join(vault, 'map', 'index.md'), '# index\n')
    write(
      path.join(vault, 'map', 'decisions', '0001.md'),
      `---
type: decision
zones:
  - "[[auth]]"
---
`,
    )
    write(path.join(vault, 'tech-debt', 'd.md'), '---\ntype: tech-debt\n---\n')
    write(path.join(vault, 'human-drafts', 'x.md'), '# x\n')
    write(path.join(repo, 'src', 'auth', 'a.js'), 'export {}\n')

    const dry = atlas(repo, ['adopt'])
    assert.equal(dry.code, 0)
    assert.match(dry.stdout, /dry run — re-run with --write to apply/)
    assert.equal(fs.existsSync(path.join(repo, 'atlas.config.json')), false)

    const w = atlas(repo, ['adopt', '--write'])
    assert.equal(w.code, 0, w.stderr)
    assert.match(w.stdout, /next: atlas wire all && atlas migrate --write/)

    const zone = fs.readFileSync(path.join(vault, 'map', 'zones', 'auth.md'), 'utf8')
    assert.match(zone, /status: seeded/)
    assert.match(zone, /verifiedAt: unverified/)
    assert.ok(fs.existsSync(path.join(repo, 'atlas.config.json')))
    assert.ok(fs.existsSync(path.join(vault, 'drafts', 'x.md')))
    assert.equal(fs.existsSync(path.join(vault, 'human-drafts')), false)

    // frontmatter is parseable / honest — check should not fail purely on zone honesty shape
    // (ownership may still warn/fail if files untracked; commit them)
    commitAll(repo, 'adopt seed')
    const check = atlas(repo, ['check'])
    // may still fail on ledger/staleness but not on missing frontmatter parse — stderr should not mention
    // invalid frontmatter for auth zone
    assert.ok(
      !/frontmatter|parse|YAML/i.test(check.stderr) || check.code === 0,
      `unexpected frontmatter errors: ${check.stderr}`,
    )

    const again = atlas(repo, ['adopt', '--write'])
    assert.equal(again.code, 0)
    assert.match(again.stdout, /✓ nothing to adopt/)
  })
})


describe('atlas check — read-only index sync (W4)', () => {
  test('atlas check does not modify map/index.md', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'pay'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'pay', 'index.js'), '// v1\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'pay', '', { status: 'active', verifiedAt: shaOf(repo) })
    atlas(repo, ['build'])
    commitAll(repo, 'seed + index')

    const indexPath = path.join(vault, 'map', 'index.md')
    fs.writeFileSync(indexPath, 'DELIBERATELY STALE\n')
    const before = fs.readFileSync(indexPath, 'utf8')
    const check = atlas(repo, ['check'])
    const after = fs.readFileSync(indexPath, 'utf8')
    assert.equal(after, before, 'check must not rewrite the index')
    assert.notEqual(check.code, 0, 'check must still fail on a stale index')
    assert.match(check.stderr, /map\/index\.md is out of date/)
  })

  test('check.indexSync false makes a stale index not a failure', () => {
    const repo = mkRepo()
    fs.mkdirSync(path.join(repo, 'src', 'ship'), { recursive: true })
    fs.writeFileSync(path.join(repo, 'src', 'ship', 'index.js'), '// v1\n')
    commitAll(repo, 'init tree')
    atlas(repo, ['init'])
    const vault = vaultPath(repo)
    writeZone(vault, 'ship', '', { status: 'active', verifiedAt: shaOf(repo) })
    atlas(repo, ['build'])
    commitAll(repo, 'seed + index')

    const cfgPath = path.join(repo, 'atlas.config.json')
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
    cfg.check = { ...(cfg.check ?? {}), indexSync: false }
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))

    fs.writeFileSync(path.join(vault, 'map', 'index.md'), 'STALE\n')
    const check = atlas(repo, ['check'])
    assert.equal(check.code, 0, `expected pass with indexSync false; stderr=${check.stderr}`)
    assert.doesNotMatch(check.stderr, /map\/index\.md is out of date/)
  })
})
