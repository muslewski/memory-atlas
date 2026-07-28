#!/usr/bin/env node
/**
 * Commit + push + PR + merge: telemetry.enabled + memory-atlas@0.5.3 pin
 * for every sibling repo with atlas.config.json.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPOS = process.env.REPOS_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const BRANCH = 'chore/atlas-0.5.3-telemetry-on'
const MSG = `chore: enable atlas telemetry + pin memory-atlas@0.5.3

Turn on local debug telemetry (atlas.config telemetry.enabled) and
pin memory-atlas 0.5.3 so the fleet records cmd/timing for improve loops.`

function sh(cmd, args, cwd, opts = {}) {
  return spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    timeout: opts.timeout ?? 120_000,
  })
}

function hasOrigin(cwd) {
  const r = sh('git', ['remote', 'get-url', 'origin'], cwd)
  return r.status === 0 && (r.stdout || '').trim()
}

function stageAdoption(cwd) {
  for (const f of [
    'atlas.config.json',
    'package.json',
    'package-lock.json',
    'pnpm-lock.yaml',
    'bun.lock',
    'bun.lockb',
  ]) {
    if (fs.existsSync(path.join(cwd, f))) sh('git', ['add', '--', f], cwd)
  }
  if (fs.existsSync(path.join(cwd, '.atlas-state.json'))) {
    sh('git', ['add', '-f', '--', '.atlas-state.json'], cwd)
  }
}

function hasStaged(cwd) {
  const r = sh('git', ['diff', '--cached', '--name-only'], cwd)
  return (r.stdout || '').trim().length > 0
}

function shipOne(name) {
  const cwd = path.join(REPOS, name)
  const out = { name, ok: false, pr: null, error: null, local: false }

  if (!fs.existsSync(path.join(cwd, 'atlas.config.json'))) {
    out.error = 'no config'
    return out
  }
  if (!fs.existsSync(path.join(cwd, '.git'))) {
    out.error = 'no git'
    return out
  }

  // stay on current branch if already ours, else create from HEAD without checkout main
  // (avoids clobbering unrelated dirty files on other branches)
  const cur = (sh('git', ['branch', '--show-current'], cwd).stdout || '').trim()
  if (cur !== BRANCH) {
    const co = sh('git', ['checkout', '-B', BRANCH], cwd)
    if (co.status !== 0) {
      out.error = `checkout: ${co.stderr}`
      return out
    }
  }

  stageAdoption(cwd)
  if (!hasStaged(cwd)) {
    out.error = 'nothing staged'
    return out
  }

  const commit = sh('git', ['commit', '-m', MSG], cwd)
  if (commit.status !== 0 && !(commit.stdout || '').includes('nothing to commit')) {
    // allow "nothing" after race
    if (!(commit.stderr || '').includes('nothing to commit')) {
      out.error = `commit: ${commit.stderr || commit.stdout}`
      return out
    }
  }

  const origin = hasOrigin(cwd)
  if (!origin) {
    out.ok = true
    out.local = true
    return out
  }

  // skip vercel/eve push
  if (String(origin).includes('vercel/eve')) {
    out.ok = true
    out.local = true
    out.error = 'local only (vercel/eve)'
    return out
  }

  const push = sh('git', ['push', '-u', 'origin', 'HEAD'], cwd, { timeout: 180_000 })
  if (push.status !== 0) {
    out.error = `push: ${push.stderr || push.stdout}`
    return out
  }

  let prUrl = null
  const list = sh('gh', ['pr', 'list', '--head', BRANCH, '--json', 'url,number', '-L', '1'], cwd)
  try {
    const arr = JSON.parse(list.stdout || '[]')
    if (arr[0]?.url) prUrl = arr[0].url
  } catch {
    /* ignore */
  }

  if (!prUrl) {
    const create = sh(
      'gh',
      [
        'pr',
        'create',
        '--title',
        'chore: enable atlas telemetry + pin memory-atlas@0.5.3',
        '--body',
        '## Summary\n- `atlas.config.json` → `telemetry.enabled: true`\n- pin `memory-atlas@0.5.3`\n\nFleet debug telemetry (local JSONL). Global default on manjaro remains on; published package default stays off.',
      ],
      cwd,
      { timeout: 90_000 },
    )
    prUrl = (create.stdout || '').trim().split('\n').filter(Boolean).pop()
    if (create.status !== 0) {
      out.error = `pr: ${create.stderr}`
      out.pr = prUrl
      return out
    }
  }
  out.pr = prUrl

  const num = prUrl?.match(/\/pull\/(\d+)/)?.[1]
  if (num) {
    const merge = sh('gh', ['pr', 'merge', num, '--merge', '--delete-branch'], cwd, {
      timeout: 180_000,
    })
    if (merge.status !== 0) {
      out.error = `merge: ${merge.stderr || merge.stdout}`
      out.ok = false
      return out
    }
  }

  out.ok = true
  return out
}

function main() {
  const names = fs
    .readdirSync(REPOS)
    .filter((n) => {
      if (n === 'memory-atlas') return false
      const p = path.join(REPOS, n)
      return (
        fs.statSync(p).isDirectory() &&
        fs.existsSync(path.join(p, 'atlas.config.json')) &&
        fs.existsSync(path.join(p, 'package.json'))
      )
    })
    .sort()

  console.log(`fleet-ship-telemetry-on n=${names.length}`)
  const results = []
  for (const name of names) {
    console.log(`\n==> ${name}`)
    const r = shipOne(name)
    results.push(r)
    if (r.ok && r.local) console.log(`  ✓ local commit${r.error ? ` (${r.error})` : ''}`)
    else if (r.ok) console.log(`  ✓ ${r.pr || 'merged'}`)
    else console.log(`  ✗ ${r.error}${r.pr ? ' ' + r.pr : ''}`)
  }

  const ok = results.filter((r) => r.ok)
  const bad = results.filter((r) => !r.ok)
  console.log(`\n=== ok ${ok.length} / fail ${bad.length} / total ${results.length} ===`)
  for (const r of bad) console.log(`FAIL ${r.name}: ${r.error}`)

  const report = path.join(REPOS, 'memory-atlas', 'atlas', 'reports', 'fleet-telemetry-on-0.5.3.json')
  fs.mkdirSync(path.dirname(report), { recursive: true })
  fs.writeFileSync(report, `${JSON.stringify({ results, at: new Date().toISOString() }, null, 2)}\n`)
  console.log(`report: ${report}`)
  process.exit(bad.length ? 1 : 0)
}

main()
