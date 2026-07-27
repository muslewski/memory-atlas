#!/usr/bin/env node
/**
 * atlas-visuals — CLI for memory-atlas-visuals.
 *
 * Usage:
 *   atlas-visuals dev|preview|build|manifest|check [stale|diagrams|illustrated|icons|all]|stock|status
 *
 * Spawns package scripts with cwd = package root; forwards ATLAS_VISUALS_ROOT,
 * ATLAS_VAULT, ATLAS_VISUALS_PORT, PIXABAY_API_KEY.
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PACKAGE_ROOT,
  resolveAtlasPaths,
  resolveVisualsPort,
} from '../scripts/lib/paths.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))

const USAGE = `atlas-visuals — presentation plane for memory-atlas vaults

Usage:
  atlas-visuals dev|preview|build|manifest|check [stale|diagrams|illustrated|icons|all]|stock|status

Commands:
  status      Print resolved vault / visuals paths + port
  dev         Manifests then Vite dev (requires gallery app)
  preview     Production preview (requires gallery app)
  build       Manifests + production build (requires gallery app)
  manifest    Rebuild gallery + notes manifests
  check       Run check suite (default: all)
              check stale|diagrams|illustrated|icons|all
  stock       Fetch Pixabay hero: atlas-visuals stock "<query>"
  catalog     Rebuild kit-catalog.json

Env:
  ATLAS_VISUALS_ROOT   visuals/ dir (illustrated + files)
  ATLAS_VAULT          vault root (→ <vault>/visuals unless ROOT set)
  ATLAS_VISUALS_PORT   dev/preview port (default 4555)
  PIXABAY_API_KEY      for stock (or .env walked max 5 levels)

Options:
  --help, -h    Show this help
  --version, -v Show package version
`

function printUsage(code = 0) {
  process.stdout.write(USAGE)
  process.exit(code)
}

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv }} [opts]
 * @returns {Promise<number>}
 */
function run(cmd, args, opts = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd ?? PACKAGE_ROOT,
      env: { ...process.env, ...opts.env },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal)
        return
      }
      resolvePromise(code ?? 1)
    })
  })
}

function forwardEnv() {
  const env = { ...process.env }
  for (const k of [
    'ATLAS_VISUALS_ROOT',
    'ATLAS_VAULT',
    'ATLAS_VISUALS_PORT',
    'PIXABAY_API_KEY',
  ]) {
    if (process.env[k]) env[k] = process.env[k]
  }
  return env
}

function galleryAppReady() {
  return (
    fs.existsSync(path.join(PACKAGE_ROOT, 'vite.config.ts')) ||
    fs.existsSync(path.join(PACKAGE_ROOT, 'vite.config.js')) ||
    fs.existsSync(path.join(PACKAGE_ROOT, 'vite.config.mjs'))
  )
}

/**
 * @param {string} script
 * @param {string[]} [extra]
 * @param {NodeJS.ProcessEnv} [env]
 */
async function runPnpmScript(script, extra = [], env = {}) {
  const args = ['run', script]
  if (extra.length) args.push('--', ...extra)
  return run('pnpm', args, { cwd: PACKAGE_ROOT, env })
}

/**
 * @param {string} relScript
 * @param {string[]} [extra]
 * @param {NodeJS.ProcessEnv} [env]
 */
async function runTsx(relScript, extra = [], env = {}) {
  const scriptPath = path.join(PACKAGE_ROOT, relScript)
  if (!fs.existsSync(scriptPath)) {
    process.stderr.write(`atlas-visuals: script not found: ${scriptPath}\n`)
    return 1
  }
  const localTsx = path.join(PACKAGE_ROOT, 'node_modules', '.bin', 'tsx')
  const bin = fs.existsSync(localTsx) ? localTsx : 'tsx'
  return run(bin, [scriptPath, ...extra], { cwd: PACKAGE_ROOT, env })
}

function notPackaged(cmd) {
  process.stderr.write(
    `atlas-visuals ${cmd}: gallery app not packaged in ${pkg.version} yet.\n` +
      `Path resolution works (\`atlas-visuals status\`). Until cutover, use the\n` +
      `consuming repo's local visuals/app (see examples/minimal-vault/README.md).\n` +
      `Env ATLAS_VISUALS_ROOT / ATLAS_VAULT already resolve content roots.\n`,
  )
  return 1
}

async function cmdStatus() {
  try {
    const paths = resolveAtlasPaths({ cwd: process.cwd() })
    const port = resolveVisualsPort(process.cwd())
    const rel = (p) => {
      try {
        return path.relative(process.cwd(), p) || p
      } catch {
        return p
      }
    }
    process.stdout.write(
      [
        `atlas-visuals@${pkg.version}`,
        `source=${paths.source} port=${port}`,
        `vault=${rel(paths.vaultDir)}`,
        `visuals=${rel(paths.visualsDir)}`,
        `illustrated=${rel(paths.illustratedDir)}`,
        `files=${rel(paths.filesDir)}`,
        `app=${rel(paths.appDir)}`,
        fs.existsSync(paths.visualsDir)
          ? 'tree=present'
          : 'tree=missing — set ATLAS_VISUALS_ROOT or create visuals/',
        galleryAppReady() ? 'gallery=packaged' : 'gallery=scaffold-only',
      ].join('\n') + '\n',
    )
    return 0
  } catch (err) {
    process.stderr.write(
      `atlas-visuals status: ${err instanceof Error ? err.message : err}\n`,
    )
    return 1
  }
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.length === 0 || argv[0] === '-h' || argv[0] === '--help') {
    printUsage(0)
  }
  if (argv[0] === '-v' || argv[0] === '--version') {
    process.stdout.write(`${pkg.version}\n`)
    process.exit(0)
  }

  const [cmd, ...rest] = argv
  const env = forwardEnv()

  switch (cmd) {
    case 'status':
      process.exit(await cmdStatus())
      break

    case 'dev': {
      if (!galleryAppReady()) process.exit(notPackaged('dev'))
      let code = 0
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'),
      )
      if (pkgJson.scripts?.manifest) {
        code = await runPnpmScript('manifest', [], env)
        if (code !== 0) process.exit(code)
      } else if (fs.existsSync(path.join(PACKAGE_ROOT, 'scripts', 'build-manifest.ts'))) {
        code = await runTsx('scripts/build-manifest.ts', [], env)
        if (code !== 0) process.exit(code)
      }
      code = await run('pnpm', ['exec', 'vite'], { cwd: PACKAGE_ROOT, env })
      process.exit(code)
      break
    }

    case 'preview':
      if (!galleryAppReady()) process.exit(notPackaged('preview'))
      process.exit(await runPnpmScript('preview', rest, env))
      break

    case 'build':
      if (!galleryAppReady()) process.exit(notPackaged('build'))
      process.exit(await runPnpmScript('build', rest, env))
      break

    case 'manifest': {
      if (
        !galleryAppReady() &&
        !fs.existsSync(path.join(PACKAGE_ROOT, 'scripts', 'build-manifest.ts'))
      ) {
        process.exit(notPackaged('manifest'))
      }
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'),
      )
      if (pkgJson.scripts?.manifest) {
        process.exit(await runPnpmScript('manifest', rest, env))
      }
      let code = await runTsx('scripts/build-manifest.ts', rest, env)
      if (code !== 0) process.exit(code)
      if (fs.existsSync(path.join(PACKAGE_ROOT, 'scripts', 'build-notes-manifest.ts'))) {
        code = await runTsx('scripts/build-notes-manifest.ts', rest, env)
      }
      process.exit(code)
      break
    }

    case 'stock': {
      if (rest.length === 0) {
        process.stderr.write('Usage: atlas-visuals stock "<query>"\n')
        process.exit(1)
      }
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'),
      )
      if (pkgJson.scripts?.stock) {
        process.exit(await runPnpmScript('stock', rest, env))
      }
      if (fs.existsSync(path.join(PACKAGE_ROOT, 'scripts', 'fetch-stock.ts'))) {
        process.exit(await runTsx('scripts/fetch-stock.ts', rest, env))
      }
      process.exit(notPackaged('stock'))
      break
    }

    case 'check': {
      const which = rest[0] ?? 'all'
      const checkExtra = rest.slice(1)
      const map = {
        stale: { script: 'check:stale', file: 'scripts/check-stale.ts' },
        diagrams: { script: 'check:diagrams', file: 'scripts/check-diagrams.ts' },
        illustrated: {
          script: 'check:illustrated',
          file: 'scripts/check-illustrated.ts',
        },
        icons: { script: 'check:icons', file: 'scripts/check-icons.ts' },
      }
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'),
      )
      const scripts = pkgJson.scripts || {}

      async function runCheck(key) {
        const entry = map[key]
        if (!entry) return 1
        if (scripts[entry.script]) {
          return runPnpmScript(entry.script, checkExtra, env)
        }
        if (fs.existsSync(path.join(PACKAGE_ROOT, entry.file))) {
          return runTsx(entry.file, checkExtra, env)
        }
        process.stderr.write(
          `atlas-visuals check ${key}: not packaged (no ${entry.script} / ${entry.file})\n`,
        )
        return 1
      }

      if (which === 'all') {
        let code = 0
        let any = false
        for (const key of Object.keys(map)) {
          const entry = map[key]
          if (
            scripts[entry.script] ||
            fs.existsSync(path.join(PACKAGE_ROOT, entry.file))
          ) {
            any = true
            const c = await runCheck(key)
            if (c !== 0) code = c
          }
        }
        if (!any) process.exit(notPackaged('check'))
        process.exit(code)
      }
      if (!map[which]) {
        process.stderr.write(`Unknown check target: ${which}\n`)
        printUsage(1)
      }
      process.exit(await runCheck(which))
      break
    }

    case 'catalog': {
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'),
      )
      if (pkgJson.scripts?.catalog) {
        process.exit(await runPnpmScript('catalog', rest, env))
      }
      if (fs.existsSync(path.join(PACKAGE_ROOT, 'scripts', 'build-catalog.ts'))) {
        process.exit(await runTsx('scripts/build-catalog.ts', rest, env))
      }
      process.exit(notPackaged('catalog'))
      break
    }

    case 'prerender:diagrams':
    case 'prerender-diagrams': {
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'),
      )
      if (pkgJson.scripts?.['prerender:diagrams']) {
        process.exit(await runPnpmScript('prerender:diagrams', rest, env))
      }
      if (fs.existsSync(path.join(PACKAGE_ROOT, 'scripts', 'prerender-diagrams.ts'))) {
        process.exit(await runTsx('scripts/prerender-diagrams.ts', rest, env))
      }
      process.exit(notPackaged('prerender:diagrams'))
      break
    }

    default:
      process.stderr.write(`atlas-visuals: unknown command "${cmd}"\n`)
      printUsage(1)
  }
}

main().catch((err) => {
  process.stderr.write(
    `atlas-visuals: ${err instanceof Error ? err.message : err}\n`,
  )
  process.exit(1)
})
