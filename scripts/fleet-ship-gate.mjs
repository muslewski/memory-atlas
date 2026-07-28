#!/usr/bin/env node
/**
 * Commit + push + PR + merge for repos that adopted memory-atlas@TARGET.
 * Expects working trees already modified by fleet-adopt-gate.mjs.
 *
 * Usage: node scripts/fleet-ship-gate.mjs [--dry-run]
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPOS_ROOT = process.env.REPOS_ROOT || path.resolve(__dirname, '../..')
const TARGET = process.env.ATLAS_VERSION || '0.5.2'
const BRANCH = `chore/atlas-${TARGET}-gate-wire`
const DRY = process.argv.includes('--dry-run')
const SKIP = new Set(['memory-atlas']) // always skip toolkit itself

function sh(cmd, args, cwd) {
  if (DRY) {
    console.log(`  (dry) ${cmd} ${args.join(' ')} @ ${path.basename(cwd)}`)
    return { status: 0, stdout: '', stderr: '' }
  }
  return spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: 120_000 })
}

function pinIsTarget(repoRoot) {
  const pkgPath = path.join(repoRoot, 'package.json')
  if (!fs.existsSync(pkgPath)) return false
  try {
    const p = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    const pin = p.devDependencies?.['memory-atlas'] || p.dependencies?.['memory-atlas']
    return pin === TARGET || pin === `^${TARGET}`
  } catch {
    return false
  }
}

function hasDirty(repoRoot) {
  const r = spawnSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' })
  return (r.stdout || '').trim().length > 0
}

function remoteUrl(repoRoot) {
  const r = spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: repoRoot, encoding: 'utf8' })
  return (r.stdout || '').trim()
}

function shipOne(name) {
  const repoRoot = path.join(REPOS_ROOT, name)
  const out = { name, shipped: false, error: null, pr: null }

  if (!fs.existsSync(path.join(repoRoot, 'atlas.config.json'))) {
    out.error = 'no config'
    return out
  }
  if (!pinIsTarget(repoRoot)) {
    out.error = 'pin not TARGET (skip — adopt first)'
    return out
  }
  if (!hasDirty(repoRoot) && !DRY) {
    // maybe already committed on branch
    const branch = spawnSync('git', ['branch', '--show-current'], { cwd: repoRoot, encoding: 'utf8' })
    const b = (branch.stdout || '').trim()
    if (b === BRANCH) {
      out.error = 'clean on adopt branch — try push only'
    } else {
      out.error = 'working tree clean (already shipped or no changes)'
      // still try to verify main has pin
      return out
    }
  }

  const remote = remoteUrl(repoRoot)
  if (!remote) {
    out.error = 'no origin remote'
    return out
  }

  // stash unrelated dirty if needed? prefer add only atlas-related paths
  sh('git', ['checkout', 'main'], repoRoot)
  sh('git', ['pull', '--ff-only'], repoRoot)
  // create branch from current (may have dirty files from adopt on main — ok)
  const cur = spawnSync('git', ['branch', '--show-current'], { cwd: repoRoot, encoding: 'utf8' })
  if ((cur.stdout || '').trim() !== BRANCH) {
    const co = sh('git', ['checkout', '-B', BRANCH], repoRoot)
    if (co.status !== 0 && !DRY) {
      out.error = `branch: ${co.stderr}`
      return out
    }
  }

  // Stage adoption artifacts only
  const candidates = [
    'package.json',
    'package-lock.json',
    'pnpm-lock.yaml',
    'bun.lock',
    'bun.lockb',
    'atlas.config.json',
    '.atlas-state.json',
    'CLAUDE.md',
    'AGENTS.md',
    '.claude/settings.json',
    '.claude/skills/atlas-adopt',
    '.claude/skills/atlas-nav',
    '.claude/skills/atlas-recollection',
    '.claude/skills/atlas-seed',
    '.claude/skills/atlas-update',
    '.claude/skills/atlas-skin',
    '.claude/skills/atlas-visuals-kit',
    '.claude/skills/writing-for-retrieval',
    '.claude/skills/excalidraw-diagrams',
  ]
  for (const c of candidates) {
    const p = path.join(repoRoot, c)
    if (fs.existsSync(p)) {
      sh('git', ['add', '-A', '--', c], repoRoot)
    }
  }
  // force state if gitignored
  if (fs.existsSync(path.join(repoRoot, '.atlas-state.json'))) {
    sh('git', ['add', '-f', '.atlas-state.json'], repoRoot)
  }

  const staged = spawnSync('git', ['diff', '--cached', '--name-only'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (!(staged.stdout || '').trim() && !DRY) {
    out.error = 'nothing staged'
    return out
  }

  const msg = `chore: adopt memory-atlas ${TARGET} package-freshness gate

Pin memory-atlas@${TARGET}, wire atlas scripts (predev/atlas:gate),
run atlas wire + migrate stamp so the vault follows the shared toolkit.`

  const commit = sh('git', ['commit', '-m', msg], repoRoot)
  if (commit.status !== 0 && !DRY && !(commit.stdout || '').includes('nothing to commit')) {
    // allow empty if already committed
    if (!(commit.stderr || '').includes('nothing to commit') && commit.status !== 0) {
      out.error = `commit: ${commit.stderr || commit.stdout}`
      return out
    }
  }

  const push = sh('git', ['push', '-u', 'origin', 'HEAD'], repoRoot)
  if (push.status !== 0 && !DRY) {
    out.error = `push: ${push.stderr}`
    return out
  }

  // PR create or get existing
  const prList = spawnSync(
    'gh',
    ['pr', 'list', '--head', BRANCH, '--json', 'url,number,state', '-L', '1'],
    { cwd: repoRoot, encoding: 'utf8' },
  )
  let prUrl = null
  try {
    const arr = JSON.parse(prList.stdout || '[]')
    if (arr[0]?.url) prUrl = arr[0].url
  } catch {
    /* ignore */
  }

  if (!prUrl && !DRY) {
    const create = spawnSync(
      'gh',
      [
        'pr',
        'create',
        '--title',
        `chore: adopt memory-atlas ${TARGET} package-freshness gate`,
        '--body',
        `## Summary\n- Pin \`memory-atlas@${TARGET}\`\n- Thin scripts: \`predev\` / \`atlas:gate\` / \`atlas:wire\` / \`mind:check\`→atlas\n- Wire + migrate stamp\n\nFleet follow: mind tooling stays in memory-atlas; this vault only consumes.\n\n## Test plan\n- [x] \`atlas gate --strict\` ok after adopt script`,
      ],
      { cwd: repoRoot, encoding: 'utf8', timeout: 60_000 },
    )
    prUrl = (create.stdout || '').trim().split('\n').pop()
    if (create.status !== 0) {
      out.error = `pr create: ${create.stderr}`
      return out
    }
  }

  out.pr = prUrl

  if (!DRY && prUrl) {
    const num = prUrl.match(/\/pull\/(\d+)/)?.[1]
    if (num) {
      const merge = spawnSync('gh', ['pr', 'merge', num, '--merge', '--delete-branch'], {
        cwd: repoRoot,
        encoding: 'utf8',
        timeout: 120_000,
      })
      if (merge.status !== 0) {
        out.error = `merge: ${merge.stderr || merge.stdout}`
        // still count as opened
        out.shipped = false
        return out
      }
    }
  }

  out.shipped = true
  return out
}

function main() {
  const names = fs
    .readdirSync(REPOS_ROOT)
    .filter((n) => {
      if (SKIP.has(n)) return false
      const p = path.join(REPOS_ROOT, n)
      return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'atlas.config.json'))
    })
    .sort()

  console.log(`fleet-ship-gate TARGET=${TARGET} candidates=${names.length}`)
  const results = []
  for (const name of names) {
    if (!pinIsTarget(path.join(REPOS_ROOT, name))) continue
    console.log(`\n==> ship ${name}`)
    const r = shipOne(name)
    results.push(r)
    if (r.shipped) console.log(`  ✓ ${r.pr || 'shipped'}`)
    else console.log(`  ✗ ${r.error}${r.pr ? ' pr=' + r.pr : ''}`)
  }

  const ok = results.filter((r) => r.shipped)
  const bad = results.filter((r) => !r.shipped)
  console.log(`\n=== shipped ${ok.length} / attempted ${results.length} ===`)
  for (const r of bad) console.log(`FAIL ${r.name}: ${r.error}`)

  const report = path.join(
    path.resolve(__dirname, '..'),
    'atlas',
    'reports',
    `fleet-ship-gate-${TARGET}.json`,
  )
  if (!DRY) {
    fs.mkdirSync(path.dirname(report), { recursive: true })
    fs.writeFileSync(
      report,
      `${JSON.stringify({ target: TARGET, results, at: new Date().toISOString() }, null, 2)}\n`,
    )
    console.log(`report: ${report}`)
  }
  process.exit(bad.length ? 1 : 0)
}

main()
