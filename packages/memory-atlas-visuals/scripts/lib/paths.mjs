/**
 * Resolve Atlas Visuals content roots — vault + visuals dir.
 *
 * Gallery content is NOT hardcoded as parent-of-app. Resolution order:
 *   1. ATLAS_VISUALS_ROOT env (absolute, or relative to cwd)
 *   2. ATLAS_VAULT env + /visuals (or config.visuals.dir)
 *   3. Walk up from cwd for atlas.config.json → vaultDir + visuals.dir
 *   4. Legacy: parent of appDir if illustrated/ (or files/) lives next to app
 *
 * Source of truth for the package — re-exported as lib/paths.mjs and
 * src/config/paths.ts. Pure Node — no React, no Vite.
 *
 * @typedef {object} AtlasPaths
 * @property {string} appDir
 * @property {string} visualsDir
 * @property {string} vaultDir
 * @property {string} illustratedDir
 * @property {string} filesDir
 * @property {string} diagramsDir
 * @property {string} stocksDir
 * @property {string} source
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
/** Package root = …/memory-atlas-visuals (two levels above scripts/lib/). */
export const PACKAGE_ROOT = resolve(dirname(__filename), '../..')

const DEFAULT_PORT = 4555

/**
 * @param {string} p
 * @returns {boolean}
 */
function isDir(p) {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

/**
 * @param {string} abs
 * @returns {boolean}
 */
export function looksLikeVisualsRoot(abs) {
  return isDir(join(abs, 'illustrated')) || isDir(join(abs, 'files'))
}

/**
 * Parse atlas.config.json (minimal).
 * @param {string} configPath absolute path to atlas.config.json
 * @returns {{ vaultDir: string, visualsDir: string, port?: number, config: Record<string, unknown> } | null}
 */
export function readAtlasConfig(configPath) {
  try {
    const raw = readFileSync(configPath, 'utf8')
    const cfg = JSON.parse(raw)
    if (!cfg || typeof cfg !== 'object') return null
    const configDir = dirname(configPath)
    const vaultRel =
      typeof cfg.vaultDir === 'string' && cfg.vaultDir ? cfg.vaultDir : 'atlas'
    const vaultDir = resolve(configDir, vaultRel)
    const visuals =
      cfg.visuals && typeof cfg.visuals === 'object' ? cfg.visuals : {}
    const visualsRel =
      typeof visuals.dir === 'string' && visuals.dir ? visuals.dir : 'visuals'
    const visualsDir = resolve(vaultDir, visualsRel)
    const port =
      typeof visuals.port === 'number' && Number.isFinite(visuals.port)
        ? visuals.port
        : undefined
    return { vaultDir, visualsDir, port, config: cfg }
  } catch {
    return null
  }
}

/**
 * Walk up from `start` looking for atlas.config.json.
 * @param {string} start
 * @param {number} [maxLevels=12]
 * @returns {string | null} absolute path to atlas.config.json
 */
export function findAtlasConfig(start = process.cwd(), maxLevels = 12) {
  let dir = resolve(start)
  for (let i = 0; i < maxLevels; i++) {
    const candidate = join(dir, 'atlas.config.json')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

/**
 * Walk up looking for .env / .env.local (max levels).
 * @param {string} [start]
 * @param {number} [maxLevels=5]
 * @returns {string | null}
 */
export function findEnvFile(start = process.cwd(), maxLevels = 5) {
  let dir = resolve(start)
  for (let i = 0; i < maxLevels; i++) {
    for (const name of ['.env.local', '.env']) {
      const p = join(dir, name)
      if (existsSync(p)) return p
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

/**
 * @param {string} p
 * @param {string} [cwd]
 */
function resolveMaybe(p, cwd = process.cwd()) {
  return isAbsolute(p) ? resolve(p) : resolve(cwd, p)
}

/**
 * @param {string} appDir
 * @param {string} visualsDir
 * @param {string} vaultDir
 * @param {string} source
 * @returns {AtlasPaths}
 */
function finish(appDir, visualsDir, vaultDir, source) {
  const v = resolve(visualsDir)
  const filesDir = join(v, 'files')
  return {
    appDir: resolve(appDir),
    visualsDir: v,
    vaultDir: resolve(vaultDir),
    illustratedDir: join(v, 'illustrated'),
    filesDir,
    diagramsDir: join(filesDir, 'diagrams'),
    stocksDir: join(filesDir, 'stocks'),
    source,
  }
}

/**
 * Resolve vault + visuals roots.
 *
 * @param {{ appDir?: string, cwd?: string, env?: NodeJS.ProcessEnv }} [opts]
 * @returns {AtlasPaths}
 */
export function resolveAtlasPaths(opts = {}) {
  const appDir = resolve(opts.appDir ?? PACKAGE_ROOT)
  const cwd = resolve(opts.cwd ?? process.cwd())
  const env = opts.env ?? process.env

  // 1. ATLAS_VISUALS_ROOT
  if (typeof env.ATLAS_VISUALS_ROOT === 'string' && env.ATLAS_VISUALS_ROOT.trim()) {
    const visualsDir = resolveMaybe(env.ATLAS_VISUALS_ROOT.trim(), cwd)
    let vaultDir
    if (typeof env.ATLAS_VAULT === 'string' && env.ATLAS_VAULT.trim()) {
      vaultDir = resolveMaybe(env.ATLAS_VAULT.trim(), cwd)
    } else {
      vaultDir = resolve(visualsDir, '..')
    }
    return finish(appDir, visualsDir, vaultDir, 'ATLAS_VISUALS_ROOT')
  }

  // 2. ATLAS_VAULT (+ /visuals, or config.visuals.dir)
  if (typeof env.ATLAS_VAULT === 'string' && env.ATLAS_VAULT.trim()) {
    const vaultDir = resolveMaybe(env.ATLAS_VAULT.trim(), cwd)
    const cfgPath =
      findAtlasConfig(vaultDir) ??
      (existsSync(join(vaultDir, 'atlas.config.json'))
        ? join(vaultDir, 'atlas.config.json')
        : findAtlasConfig(cwd))
    if (cfgPath) {
      const cfg = readAtlasConfig(cfgPath)
      if (cfg) {
        // Use config's visuals.dir name relative to the env vault override
        const name =
          cfg.visualsDir.slice(cfg.vaultDir.length).replace(/^[/\\]+/, '') ||
          'visuals'
        const visualsDir = join(vaultDir, name || 'visuals')
        return finish(appDir, visualsDir, vaultDir, 'ATLAS_VAULT+config')
      }
    }
    return finish(appDir, join(vaultDir, 'visuals'), vaultDir, 'ATLAS_VAULT')
  }

  // 3. Walk up for atlas.config.json
  const cfgPath = findAtlasConfig(cwd)
  if (cfgPath) {
    const cfg = readAtlasConfig(cfgPath)
    if (cfg) {
      return finish(appDir, cfg.visualsDir, cfg.vaultDir, 'atlas.config.json')
    }
  }

  // 4. Legacy: parent of app if illustrated/ or files/ sits next to app
  const legacyVisuals = resolve(appDir, '..')
  if (looksLikeVisualsRoot(legacyVisuals)) {
    return finish(
      appDir,
      legacyVisuals,
      resolve(legacyVisuals, '..'),
      'legacy-parent-of-app',
    )
  }

  // Fallback: still parent-of-app (scripts can no-op / create)
  return finish(
    appDir,
    legacyVisuals,
    resolve(legacyVisuals, '..'),
    'fallback-parent-of-app',
  )
}

/**
 * Dev server port: ATLAS_VISUALS_PORT → atlas.config visuals.port → 4555
 *
 * Accepts either a cwd string (legacy tests) or an options object.
 * @param {string | { cwd?: string, env?: NodeJS.ProcessEnv }} [cwdOrOpts]
 */
export function resolveVisualsPort(cwdOrOpts = process.cwd()) {
  const opts =
    typeof cwdOrOpts === 'string'
      ? { cwd: cwdOrOpts, env: process.env }
      : { cwd: cwdOrOpts.cwd ?? process.cwd(), env: cwdOrOpts.env ?? process.env }
  const env = opts.env

  if (env.ATLAS_VISUALS_PORT) {
    const n = Number(env.ATLAS_VISUALS_PORT)
    if (Number.isFinite(n) && n > 0) return n
  }

  // Prefer env ATLAS_VAULT for config discovery
  if (typeof env.ATLAS_VAULT === 'string' && env.ATLAS_VAULT.trim()) {
    const vault = resolveMaybe(env.ATLAS_VAULT.trim(), opts.cwd)
    const cfgPath = findAtlasConfig(vault) ?? join(vault, 'atlas.config.json')
    if (existsSync(cfgPath)) {
      const cfg = readAtlasConfig(cfgPath)
      if (cfg?.port) return cfg.port
    }
  }

  const cfgPath = findAtlasConfig(opts.cwd)
  if (cfgPath) {
    const cfg = readAtlasConfig(cfgPath)
    if (cfg?.port) return cfg.port
  }
  return DEFAULT_PORT
}

/**
 * Resolve PIXABAY_API_KEY from env or walking for .env (max 5 levels).
 * Order: process.env → starts: cwd, vaultDir, appDir, package root.
 *
 * @param {{
 *   vaultDir?: string,
 *   appDir?: string,
 *   cwd?: string,
 *   env?: NodeJS.ProcessEnv,
 * }} [opts]
 * @returns {string | null}
 */
export function resolvePixabayKey(opts = {}) {
  const env = opts.env ?? process.env
  if (typeof env.PIXABAY_API_KEY === 'string' && env.PIXABAY_API_KEY.trim()) {
    return env.PIXABAY_API_KEY.trim()
  }

  const starts = []
  if (opts.cwd) starts.push(opts.cwd)
  starts.push(process.cwd())
  if (opts.vaultDir) starts.push(opts.vaultDir)
  if (opts.appDir) starts.push(opts.appDir)
  starts.push(PACKAGE_ROOT)

  const seen = new Set()
  for (const start of starts) {
    let dir = resolve(start)
    for (let i = 0; i < 5; i++) {
      if (seen.has(dir)) break
      seen.add(dir)
      for (const name of ['.env.local', '.env']) {
        const envPath = join(dir, name)
        if (!existsSync(envPath)) continue
        try {
          const text = readFileSync(envPath, 'utf8')
          for (const line of text.split('\n')) {
            const m = line.match(/^PIXABAY_API_KEY\s*=\s*"?([^"\s#]+)"?/)
            if (m) return m[1]
          }
        } catch {
          // ignore
        }
      }
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  }
  return null
}

/**
 * Whether `file` is under `root` (for watcher filters).
 * @param {string} file
 * @param {string} root
 */
export function isUnder(file, root) {
  const r = root.endsWith(sep) ? root : root + sep
  return file === root || file.startsWith(r)
}

/** Alias kept for older callers / gallery scripts. */
export const resolveAll = resolveAtlasPaths
