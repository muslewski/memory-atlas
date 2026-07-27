/**
 * `atlas visuals` — scaffold vault content tree + status/dev bridge for the
 * optional companion package (`memory-atlas-visuals`). Zero runtime deps:
 * never import the peer; only resolve + spawn it when present.
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { DEFAULT_VISUALS, loadConfig } from './config.mjs'
import { findRepoRoot, findVaultDir } from './detect.mjs'

const SUBCOMMANDS = new Set(['init', 'status', 'dev', 'preview'])

const DEFAULT_VISUALS_CONFIG = {
  skins: ['default'],
  defaultSkin: 'default',
  content: { mode: 'single' },
  features: {},
  motion: {},
}

const VISUALS_README = `# Visuals

Content only — digests, diagrams, and stock assets for this vault.

Run the companion gallery via \`memory-atlas-visuals\` (or \`atlas visuals dev\`).
This directory is excluded from Atlas agent retrieval by default.
`

/**
 * Resolve absolute paths for the visuals tree from config (vault-relative).
 *
 * @param {string} repoRoot
 * @param {string} vaultDir
 * @param {Record<string, unknown>} config
 * @returns {{
 *   repoRoot: string,
 *   vaultDir: string,
 *   packageName: string,
 *   visualsDir: string,
 *   illustratedDir: string,
 *   filesDir: string,
 *   diagramsDir: string,
 *   stocksDir: string,
 *   illustratedDefaultDir: string,
 *   configFile: string,
 *   readmeFile: string,
 *   atlasConfigFile: string,
 * }}
 */
export function resolveVisualsPaths(repoRoot, vaultDir, config) {
  const v = { ...DEFAULT_VISUALS, ...(config?.visuals ?? {}) }
  const dir = typeof v.dir === 'string' && v.dir ? v.dir : DEFAULT_VISUALS.dir
  const illustrated =
    typeof v.illustrated === 'string' && v.illustrated
      ? v.illustrated
      : DEFAULT_VISUALS.illustrated
  const files = typeof v.files === 'string' && v.files ? v.files : DEFAULT_VISUALS.files
  const configFile =
    typeof v.configFile === 'string' && v.configFile
      ? v.configFile
      : DEFAULT_VISUALS.configFile
  const packageName =
    typeof v.package === 'string' && v.package ? v.package : DEFAULT_VISUALS.package

  const visualsDir = path.resolve(vaultDir, dir)
  const illustratedDir = path.resolve(vaultDir, illustrated)
  const filesDir = path.resolve(vaultDir, files)

  return {
    repoRoot: path.resolve(repoRoot),
    vaultDir: path.resolve(vaultDir),
    packageName,
    visualsDir,
    illustratedDir,
    filesDir,
    diagramsDir: path.join(filesDir, 'diagrams'),
    stocksDir: path.join(filesDir, 'stocks'),
    illustratedDefaultDir: path.join(illustratedDir, 'default'),
    configFile: path.resolve(vaultDir, configFile),
    readmeFile: path.join(visualsDir, 'README.md'),
    atlasConfigFile: path.join(path.resolve(repoRoot), 'atlas.config.json'),
  }
}

/**
 * Try to resolve the companion package from the consumer repo's node_modules.
 *
 * @param {string} repoRoot
 * @param {string} packageName
 * @returns {{ version: string, root: string, binPath: string | null } | null}
 */
export function resolvePeerPackage(repoRoot, packageName) {
  try {
    const require = createRequire(path.join(repoRoot, 'package.json'))
    const pkgJsonPath = require.resolve(`${packageName}/package.json`)
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
    const root = path.dirname(pkgJsonPath)
    let binRel = null
    if (typeof pkg.bin === 'string') {
      binRel = pkg.bin
    } else if (pkg.bin && typeof pkg.bin === 'object') {
      binRel =
        pkg.bin['atlas-visuals'] ||
        pkg.bin[packageName] ||
        pkg.bin[Object.keys(pkg.bin)[0]] ||
        null
    }
    return {
      version: typeof pkg.version === 'string' ? pkg.version : 'unknown',
      root,
      binPath: binRel ? path.join(root, binRel) : null,
    }
  } catch {
    return null
  }
}

/**
 * Count files under `dir` (recursive). Returns 0 if missing / unreadable.
 * @param {string} dir
 * @returns {number}
 */
function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0
  let n = 0
  const walk = (d) => {
    let entries
    try {
      entries = fs.readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      if (ent.name === '.gitkeep' || ent.name.startsWith('.')) continue
      const full = path.join(d, ent.name)
      if (ent.isDirectory()) walk(full)
      else if (ent.isFile()) n += 1
    }
  }
  walk(dir)
  return n
}

/**
 * @param {string} filePath
 * @param {string} content
 * @param {{ dryRun: boolean, log: (msg: string) => void, relBase: string }} ctx
 */
function ensureFile(filePath, content, ctx) {
  const rel = path.relative(ctx.relBase, filePath)
  if (fs.existsSync(filePath)) {
    ctx.log(`exists, skipping: ${rel}`)
    return false
  }
  if (ctx.dryRun) {
    ctx.log(`would create: ${rel}`)
    return true
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
  ctx.log(`created: ${rel}`)
  return true
}

/**
 * @param {string} dirPath
 * @param {{ dryRun: boolean, log: (msg: string) => void, relBase: string }} ctx
 */
function ensureGitkeepDir(dirPath, ctx) {
  ensureFile(path.join(dirPath, '.gitkeep'), '', ctx)
}

/**
 * Patch atlas.config.json so visuals.enabled is true without wiping siblings.
 * Creates a minimal file when missing.
 *
 * @param {string} configPath
 * @param {{ dryRun: boolean, log: (msg: string) => void, relBase: string }} ctx
 */
function patchAtlasConfigEnabled(configPath, ctx) {
  const rel = path.relative(ctx.relBase, configPath)
  if (!fs.existsSync(configPath)) {
    if (ctx.dryRun) {
      ctx.log(`would create: ${rel} (visuals.enabled=true)`)
      return
    }
    fs.writeFileSync(
      configPath,
      `${JSON.stringify({ version: 1, visuals: { enabled: true } }, null, 2)}\n`,
    )
    ctx.log(`created: ${rel} (visuals.enabled=true)`)
    return
  }

  let raw
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch (err) {
    throw new Error(`atlas.config.json is not valid JSON (${err.message})`)
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('atlas.config.json must be a JSON object')
  }

  const visuals =
    raw.visuals && typeof raw.visuals === 'object' && !Array.isArray(raw.visuals)
      ? { ...raw.visuals }
      : {}
  if (visuals.enabled === true) {
    ctx.log(`exists, skipping: ${rel} (visuals.enabled already true)`)
    return
  }

  if (ctx.dryRun) {
    ctx.log(`would patch: ${rel} (visuals.enabled=true)`)
    return
  }

  visuals.enabled = true
  raw.visuals = visuals
  fs.writeFileSync(configPath, `${JSON.stringify(raw, null, 2)}\n`)
  ctx.log(`patched: ${rel} (visuals.enabled=true)`)
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string, stdout?: { write: Function }, stderr?: { write: Function }, spawn?: typeof spawnSync }} [opts]
 * @returns {number}
 */
function runInit(argv, opts) {
  const cwd = opts.cwd ?? process.cwd()
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const log = (msg) => stdout.write(`${msg}\n`)
  const write = argv.includes('--write')
  const dryRun = !write

  try {
    const repoRoot = findRepoRoot(cwd)
    if (!repoRoot) {
      stderr.write('atlas visuals init: no git repository found above the current directory\n')
      return 1
    }
    const vaultDir = findVaultDir(repoRoot)
    if (!vaultDir) {
      stderr.write('atlas visuals init: no Atlas vault found — run `atlas init` first\n')
      return 1
    }

    const config = loadConfig(repoRoot, { stderr: { write: () => {} } })
    const paths = resolveVisualsPaths(repoRoot, vaultDir, config)
    const ctx = { dryRun, log, relBase: repoRoot }

    if (dryRun) {
      log('atlas visuals init (dry-run; pass --write to apply):')
    } else {
      log('atlas visuals init:')
    }

    ensureGitkeepDir(paths.illustratedDefaultDir, ctx)
    ensureGitkeepDir(paths.diagramsDir, ctx)
    ensureGitkeepDir(paths.stocksDir, ctx)
    ensureFile(
      paths.configFile,
      `${JSON.stringify(DEFAULT_VISUALS_CONFIG, null, 2)}\n`,
      ctx,
    )
    ensureFile(paths.readmeFile, VISUALS_README, ctx)
    patchAtlasConfigEnabled(paths.atlasConfigFile, ctx)

    if (dryRun) {
      log('')
      log('Re-run with --write to create the tree and set visuals.enabled=true.')
    } else {
      log('')
      log('Next: install the companion (`npm i -D memory-atlas-visuals`) then `atlas visuals dev`.')
    }
    return 0
  } catch (err) {
    stderr.write(`atlas visuals init: ${err.message}\n`)
    return 2
  }
}

/**
 * @param {string[]} _argv
 * @param {{ cwd?: string, stdout?: { write: Function }, stderr?: { write: Function } }} opts
 * @returns {number}
 */
function runStatus(_argv, opts) {
  const cwd = opts.cwd ?? process.cwd()
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const log = (msg) => stdout.write(`${msg}\n`)

  try {
    const repoRoot = findRepoRoot(cwd)
    if (!repoRoot) {
      stderr.write('atlas visuals status: no git repository found above the current directory\n')
      return 1
    }
    const vaultDir = findVaultDir(repoRoot)
    if (!vaultDir) {
      stderr.write('atlas visuals status: no Atlas vault found — run `atlas init` first\n')
      return 1
    }

    const config = loadConfig(repoRoot, { stderr: { write: () => {} } })
    const paths = resolveVisualsPaths(repoRoot, vaultDir, config)
    const enabled = config.visuals?.enabled === true
    const peer = resolvePeerPackage(repoRoot, paths.packageName)
    const peerLabel = peer
      ? `${paths.packageName}@${peer.version}`
      : `${paths.packageName} (not installed)`

    const relDir = path.relative(repoRoot, paths.visualsDir) || paths.visualsDir
    log(`visuals: enabled=${enabled} dir=${relDir} peer=${peerLabel}`)

    if (fs.existsSync(paths.visualsDir)) {
      const digests = countFiles(paths.illustratedDir)
      const diagrams = countFiles(paths.diagramsDir)
      const stocks = countFiles(paths.stocksDir)
      log(`content: illustrated=${digests} diagrams=${diagrams} stocks=${stocks}`)
    } else {
      log('content: visuals tree not present — run `atlas visuals init --write`')
    }
    return 0
  } catch (err) {
    stderr.write(`atlas visuals status: ${err.message}\n`)
    return 2
  }
}

/**
 * @param {'dev' | 'preview'} mode
 * @param {string[]} argv remaining args after mode (forwarded)
 * @param {{ cwd?: string, stdout?: { write: Function }, stderr?: { write: Function }, spawn?: typeof spawnSync }} opts
 * @returns {number}
 */
function runPeerCommand(mode, argv, opts) {
  const cwd = opts.cwd ?? process.cwd()
  const stderr = opts.stderr ?? process.stderr
  const spawn = opts.spawn ?? spawnSync

  const repoRoot = findRepoRoot(cwd)
  if (!repoRoot) {
    stderr.write(`atlas visuals ${mode}: no git repository found above the current directory\n`)
    return 1
  }
  const vaultDir = findVaultDir(repoRoot)
  if (!vaultDir) {
    stderr.write(`atlas visuals ${mode}: no Atlas vault found — run \`atlas init\` first\n`)
    return 1
  }

  const config = loadConfig(repoRoot, { stderr: { write: () => {} } })
  const paths = resolveVisualsPaths(repoRoot, vaultDir, config)
  const peer = resolvePeerPackage(repoRoot, paths.packageName)

  if (!peer) {
    stderr.write(
      `atlas visuals ${mode}: peer package "${paths.packageName}" not found under ${repoRoot}/node_modules\n` +
        `Install it: npm i -D ${paths.packageName}\n` +
        `Then re-run: atlas visuals ${mode}\n`,
    )
    return 1
  }

  /** @type {string} */
  let cmd
  /** @type {string[]} */
  let args
  if (peer.binPath && fs.existsSync(peer.binPath)) {
    cmd = process.execPath
    args = [peer.binPath, mode, ...argv]
  } else {
    // Fallback: npx bin name used by the companion package.
    cmd = 'npx'
    args = ['--no-install', 'atlas-visuals', mode, ...argv]
  }

  const result = spawn(cmd, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  })

  if (result.error) {
    stderr.write(`atlas visuals ${mode}: failed to spawn peer: ${result.error.message}\n`)
    return 1
  }
  return typeof result.status === 'number' ? result.status : 1
}

/**
 * `atlas visuals [init|status|dev|preview] ...`
 *
 * @param {string[]} argv arguments after "visuals"
 * @param {{
 *   cwd?: string,
 *   stdout?: { write: Function },
 *   stderr?: { write: Function },
 *   spawn?: typeof spawnSync,
 * }} [opts]
 * @returns {number}
 */
export function runVisuals(argv, opts = {}) {
  const stderr = opts.stderr ?? process.stderr
  const stdout = opts.stdout ?? process.stdout
  const sub = argv[0]

  if (!sub || sub === '--help' || sub === '-h') {
    stdout.write(
      `atlas visuals — vault digests / gallery companion bridge

Usage:
  atlas visuals init [--write]   Scaffold visuals/ tree (dry-run without --write)
  atlas visuals status           Enabled flag, peer resolve, content counts
  atlas visuals dev [...]        Spawn companion gallery dev server
  atlas visuals preview [...]    Spawn companion gallery preview
`,
    )
    return 0
  }

  if (!SUBCOMMANDS.has(sub)) {
    stderr.write(`atlas visuals: unknown subcommand "${sub}"\n`)
    stderr.write('Valid: init, status, dev, preview\n')
    return 1
  }

  const rest = argv.slice(1)

  if (sub === 'init') return runInit(rest, opts)
  if (sub === 'status') return runStatus(rest, opts)
  if (sub === 'dev' || sub === 'preview') return runPeerCommand(sub, rest, opts)
  return 1
}
