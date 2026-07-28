#!/usr/bin/env node
/**
 * Fleet adopt memory-atlas@TARGET across sibling Repositories.
 *
 * Per repo (when atlas.config.json present):
 *  1. Ensure package.json has memory-atlas@TARGET in devDependencies
 *  2. Add thin scripts: atlas, atlas:gate, atlas:doctor, atlas:wire, predev
 *  3. Install dep (pnpm | npm | bun)
 *  4. atlas wire all (best-effort)
 *  5. atlas migrate --write (stamp atlasVersion)
 *  6. atlas gate --strict (must pass)
 *
 * Usage:
 *   node scripts/fleet-adopt-gate.mjs              # all siblings with config
 *   node scripts/fleet-adopt-gate.mjs --dry-run
 *   node scripts/fleet-adopt-gate.mjs hermes mossferry
 *   SKIP_INSTALL=1 node scripts/fleet-adopt-gate.mjs   # only package.json edits
 *
 * Does NOT commit/push — parent session ships after verify.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ATLAS_ROOT = path.resolve(__dirname, '..')
const REPOS_ROOT = process.env.REPOS_ROOT || path.resolve(ATLAS_ROOT, '..')
const TARGET = process.env.ATLAS_VERSION || '0.5.2'
const DRY = process.argv.includes('--dry-run')
const SKIP_INSTALL = process.env.SKIP_INSTALL === '1'
// argv: node script.mjs [--dry-run] [repo…]
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('-'))

const ALREADY_OK = new Set(['memory-atlas', 'delieta', 'eventizer', 'syndcast'])

function log(msg) {
  process.stdout.write(`${msg}\n`)
}

function run(cmd, args, cwd, opts = {}) {
  if (DRY && opts.mutate) {
    log(`  (dry-run) ${cmd} ${args.join(' ')}`)
    return { status: 0, stdout: '', stderr: '' }
  }
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    timeout: opts.timeout ?? 180_000,
    env: { ...process.env, ...opts.env },
  })
  return {
    status: r.status ?? 1,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    error: r.error,
  }
}

function detectPm(repoRoot) {
  if (fs.existsSync(path.join(repoRoot, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(repoRoot, 'bun.lock')) || fs.existsSync(path.join(repoRoot, 'bun.lockb')))
    return 'bun'
  if (fs.existsSync(path.join(repoRoot, 'package-lock.json'))) return 'npm'
  // package.json exists → prefer pnpm if available else npm
  if (fs.existsSync(path.join(repoRoot, 'package.json'))) {
    const hasPnpm = spawnSync('pnpm', ['--version'], { encoding: 'utf8' }).status === 0
    return hasPnpm ? 'pnpm' : 'npm'
  }
  return null
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function writeJson(file, obj) {
  fs.writeFileSync(file, `${JSON.stringify(obj, null, 2)}\n`)
}

function ensurePackageJson(repoRoot) {
  const pkgPath = path.join(repoRoot, 'package.json')
  let pkg
  if (!fs.existsSync(pkgPath)) {
    pkg = {
      name: path.basename(repoRoot),
      private: true,
      type: 'module',
      scripts: {},
      devDependencies: {},
    }
  } else {
    pkg = readJson(pkgPath)
  }
  pkg.scripts = pkg.scripts || {}
  pkg.devDependencies = pkg.devDependencies || {}

  // Move memory-atlas to devDependencies if only in dependencies
  if (pkg.dependencies?.['memory-atlas'] && !pkg.devDependencies['memory-atlas']) {
    delete pkg.dependencies['memory-atlas']
  }
  const prev = pkg.devDependencies['memory-atlas'] || pkg.dependencies?.['memory-atlas']
  pkg.devDependencies['memory-atlas'] = TARGET
  if (pkg.dependencies?.['memory-atlas']) delete pkg.dependencies['memory-atlas']

  // Thin scripts (do not overwrite custom mind:check bodies that already call atlas)
  const ensureScript = (key, value) => {
    if (!pkg.scripts[key]) pkg.scripts[key] = value
  }
  ensureScript('atlas', 'atlas')
  ensureScript('atlas:gate', 'atlas gate')
  ensureScript('atlas:doctor', 'atlas doctor')
  ensureScript('atlas:wire', 'atlas wire all')
  // predev: soft gate — only set if missing (don't clobber existing predev chains)
  if (!pkg.scripts.predev) {
    pkg.scripts.predev = 'atlas gate'
  } else if (!pkg.scripts.predev.includes('atlas gate') && !pkg.scripts.predev.includes('atlas:gate')) {
    pkg.scripts.predev = `atlas gate && ${pkg.scripts.predev}`
  }

  // mind:* aliases only if missing
  ensureScript('mind:check', 'atlas check')
  ensureScript('mind:build', 'atlas build')

  if (!DRY) writeJson(pkgPath, pkg)
  return { prev: prev || null, pkgPath }
}

function listTargets() {
  const names = fs.readdirSync(REPOS_ROOT).filter((n) => {
    const p = path.join(REPOS_ROOT, n)
    if (!fs.statSync(p).isDirectory()) return false
    if (!fs.existsSync(path.join(p, '.git'))) return false
    if (!fs.existsSync(path.join(p, 'atlas.config.json'))) return false
    if (ALREADY_OK.has(n) && ONLY.length === 0) return false
    if (ONLY.length && !ONLY.includes(n)) return false
    return true
  })
  return names.sort()
}

function adoptOne(name) {
  const repoRoot = path.join(REPOS_ROOT, name)
  const result = {
    name,
    ok: false,
    steps: [],
    error: null,
  }

  try {
    if (!fs.existsSync(path.join(repoRoot, 'atlas.config.json'))) {
      result.error = 'no atlas.config.json'
      return result
    }

    const { prev } = ensurePackageJson(repoRoot)
    result.steps.push(`package.json pin ${prev || '∅'} → ${TARGET}`)

    const pm = detectPm(repoRoot)
    if (!pm) {
      result.error = 'no package manager / package.json'
      return result
    }
    result.steps.push(`pm=${pm}`)

    if (!SKIP_INSTALL) {
      let install
      if (pm === 'pnpm') {
        install = run('pnpm', ['add', '-D', `memory-atlas@${TARGET}`], repoRoot, {
          mutate: true,
          timeout: 300_000,
        })
      } else if (pm === 'bun') {
        install = run('bun', ['add', '-d', `memory-atlas@${TARGET}`], repoRoot, {
          mutate: true,
          timeout: 300_000,
        })
      } else {
        install = run('npm', ['install', '--save-dev', `memory-atlas@${TARGET}`], repoRoot, {
          mutate: true,
          timeout: 300_000,
        })
      }
      if (install.status !== 0) {
        result.error = `install failed: ${(install.stderr || install.stdout).slice(-400)}`
        return result
      }
      result.steps.push('install ok')
    }

    // Prefer local bin after install
    const atlasBin = path.join(repoRoot, 'node_modules', '.bin', 'atlas')
    const atlasCmd = fs.existsSync(atlasBin) ? atlasBin : 'npx'
    const atlasArgs = fs.existsSync(atlasBin) ? [] : ['--yes', `memory-atlas@${TARGET}`]

    const wire = run(
      atlasCmd,
      [...atlasArgs, 'wire', 'all'],
      repoRoot,
      { mutate: true, timeout: 60_000 },
    )
    result.steps.push(`wire exit ${wire.status}`)

    const mig = run(
      atlasCmd,
      [...atlasArgs, 'migrate', '--write'],
      repoRoot,
      { mutate: true, timeout: 30_000 },
    )
    result.steps.push(`migrate: ${(mig.stdout || '').trim().split('\n').pop() || mig.status}`)

    const gate = run(
      atlasCmd,
      [...atlasArgs, 'gate', '--strict'],
      repoRoot,
      { mutate: false, timeout: 30_000 },
    )
    result.steps.push(`gate --strict exit ${gate.status}: ${(gate.stdout || '').trim()}`)
    if (gate.status !== 0) {
      result.error = `gate --strict failed: ${gate.stdout} ${gate.stderr}`
      return result
    }

    result.ok = true
  } catch (e) {
    result.error = e?.message || String(e)
  }
  return result
}

function main() {
  log(`fleet-adopt-gate TARGET=${TARGET} REPOS=${REPOS_ROOT} dry=${DRY}`)
  const targets = listTargets()
  log(`targets (${targets.length}): ${targets.join(', ')}`)

  const results = []
  for (const name of targets) {
    log(`\n==> ${name}`)
    const r = adoptOne(name)
    results.push(r)
    if (r.ok) log(`  ✓ ${r.steps.join(' · ')}`)
    else log(`  ✗ ${r.error} · ${r.steps.join(' · ')}`)
  }

  const ok = results.filter((r) => r.ok)
  const bad = results.filter((r) => !r.ok)
  log(`\n=== summary: ${ok.length} ok / ${bad.length} fail / ${results.length} total ===`)
  for (const r of bad) log(`FAIL ${r.name}: ${r.error}`)

  // machine-readable report
  const reportPath = path.join(ATLAS_ROOT, 'atlas', 'reports', `fleet-adopt-gate-${TARGET}.json`)
  if (!DRY) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, `${JSON.stringify({ target: TARGET, results, at: new Date().toISOString() }, null, 2)}\n`)
    log(`report: ${reportPath}`)
  }

  process.exit(bad.length ? 1 : 0)
}

main()
