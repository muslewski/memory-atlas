#!/usr/bin/env node
/**
 * nav-refresh-index.mjs — Portable, self-detaching background refresh for
 * bucket-scoped ctx_search indexes (context-mode). Reference adapter for the
 * Atlas convention's "code" + "atlas" retrieval buckets.
 *
 * Portable across repos: ROOT auto-detected from this file's location
 * (expects to live in <repo>/scripts/), code + vault buckets auto-detected,
 * context-mode CLI resolved resiliently across plugin layouts.
 *
 * Normal invocation (SessionStart hook):  node scripts/nav-refresh-index.mjs
 *   → spawns a detached --worker child and returns in <1s (never blocks startup)
 * Worker:        node scripts/nav-refresh-index.mjs --worker [--force]
 * Force refresh: node scripts/nav-refresh-index.mjs --force
 *
 * See adapters/ctx-search/README.md for what this does and how to install it.
 */

import { execFileSync, spawn } from 'node:child_process'
import { appendFile, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)

// ─── Auto-detected ROOT (script lives in <repo>/scripts/) ─────────────────────
const ROOT = dirname(dirname(__filename))

const LOCK_FILE = join(ROOT, '.navidx.lock')
const LOG_FILE = join(ROOT, '.navidx.log')
const STAMP_FILE = join(ROOT, '.navidx.stamp')
const STALENESS_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes

// ─── Config: retrieval.excludeFromSearch (SPEC.md §8) ─────────────────────────
const DEFAULT_EXCLUDE_FROM_SEARCH = ['drafts/', 'visuals/']

function loadExcludeFromSearch() {
  try {
    const raw = JSON.parse(readFileSync(join(ROOT, 'atlas.config.json'), 'utf8'))
    const list = raw?.retrieval?.excludeFromSearch
    return Array.isArray(list) ? list : DEFAULT_EXCLUDE_FROM_SEARCH
  } catch {
    return DEFAULT_EXCLUDE_FROM_SEARCH
  }
}

// ─── Auto-detect buckets ──────────────────────────────────────────────────────
function detectCodeDir() {
  for (const c of ['src', 'app', 'lib', 'components']) {
    if (existsSync(join(ROOT, c))) return join(ROOT, c)
  }
  return null
}
function detectVaultDir() {
  // Detect the Atlas vault by STRUCTURE (a map/ dir), not by name — so it
  // finds <repo>-atlas, or a differently-named vault someone renamed. Falls
  // back to the -atlas suffix, then legacy -mind/-brain suffixes used by
  // earlier per-repo copies of this convention.
  try {
    const dirs = readdirSync(ROOT, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
      .map((e) => e.name)
    const byStructure = dirs.find(
      (n) => existsSync(join(ROOT, n, 'map', 'index.md')) || existsSync(join(ROOT, n, 'map', 'zones')),
    )
    if (byStructure) return join(ROOT, byStructure)
    const bySuffix = dirs.find((n) => n.endsWith('-atlas') || n.endsWith('-mind') || n.endsWith('-brain'))
    return bySuffix ? join(ROOT, bySuffix) : null
  } catch {
    return null
  }
}

function buildBuckets() {
  // Both buckets are keyed to the REPO ROOT as --project (distinguished by --source),
  // because the MCP ctx_search reader's DEFAULT project is the cwd (= repo root). Keying
  // to the root means a plain ctx_search with NO project param Just Works — no need for
  // the caller to pass an exact absolute identity. One content DB per repo; results are
  // tagged `Source: code:…` / `Source: atlas:…`.
  const buckets = []
  const code = detectCodeDir()
  if (code) {
    buckets.push({
      label: 'code',
      srcDir: code,
      project: ROOT,
      ext: '.ts,.tsx,.js,.jsx,.mjs,.cjs,.astro,.vue,.svelte',
    })
  }
  const vault = detectVaultDir()
  if (vault) {
    // Adaptation over the plain per-bucket index: respect
    // atlas.config.json → retrieval.excludeFromSearch by passing each
    // excluded folder to the CLI's own --exclude <glob> flag (confirmed via
    // `node <cli> --help` → "Index options: --exclude <glob>  Directory
    // exclude pattern (repeatable)"). No CLI flag is invented here.
    const excludeGlobs = loadExcludeFromSearch().map((dir) => `${dir.replace(/\/$/, '')}/**`)
    buckets.push({ label: 'atlas', srcDir: vault, project: ROOT, ext: '.md', excludeGlobs })
  }
  return buckets
}

// ─── Resilient context-mode CLI resolution ────────────────────────────────────
function semverSort(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0)
  }
  return 0
}
function newestBundleIn(base) {
  try {
    const versions = readdirSync(base)
      .filter((e) => /^\d+\.\d+\.\d+$/.test(e))
      .sort(semverSort)
    if (!versions.length) return null
    const cand = join(base, versions[versions.length - 1], 'cli.bundle.mjs')
    return existsSync(cand) ? cand : null
  } catch {
    return null
  }
}
async function resolveCliBundle() {
  const home = process.env.HOME || ''
  const candidates = [
    `${home}/.claude/plugins/cache/context-mode/context-mode`,
    `${home}/.claude/plugins/cache/context-mode`,
  ]
  for (const base of candidates) {
    const hit = newestBundleIn(base)
    if (hit) return hit
  }
  // Last resort: shallow scan of the plugin cache for any cli.bundle.mjs under a context-mode dir.
  try {
    const cacheRoot = `${home}/.claude/plugins/cache`
    for (const ent of await readdir(cacheRoot)) {
      if (!/context-mode/i.test(ent)) continue
      const hit = newestBundleIn(join(cacheRoot, ent)) || newestBundleIn(join(cacheRoot, ent, ent))
      if (hit) return hit
    }
  } catch {
    /* ignore */
  }
  return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function log(msg) {
  try {
    await appendFile(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`)
  } catch {
    /* ignore */
  }
}
async function acquireLock() {
  try {
    const s = await stat(LOCK_FILE)
    if (Date.now() - s.mtimeMs < STALENESS_THRESHOLD_MS) return false
    await unlink(LOCK_FILE)
  } catch {
    /* no lock */
  }
  await writeFile(LOCK_FILE, String(process.pid))
  return true
}
async function releaseLock() {
  try {
    await unlink(LOCK_FILE)
  } catch {
    /* ignore */
  }
}
async function isStale() {
  try {
    return Date.now() - (await stat(STAMP_FILE)).mtimeMs >= STALENESS_THRESHOLD_MS
  } catch {
    return true
  }
}
async function writeStamp() {
  await writeFile(STAMP_FILE, new Date().toISOString())
}

// ─── Worker ───────────────────────────────────────────────────────────────────
async function runWorker(force) {
  const start = Date.now()
  if (!force && !(await isStale())) {
    await log('skip: stamp fresh (<10 min)')
    return
  }
  if (!(await acquireLock())) {
    await log('skip: lock held')
    return
  }
  try {
    const buckets = buildBuckets()
    if (!buckets.length) {
      await log('skip: no code or atlas bucket detected')
      return
    }
    const cli = await resolveCliBundle()
    if (!cli) {
      await log('ERROR: context-mode CLI not found (install the plugin: /plugin install context-mode@context-mode)')
      return
    }
    await log(`cli: ${cli}`)
    let allOk = true
    for (const b of buckets) {
      const t = Date.now()
      await log(`indexing ${b.label}: ${b.srcDir}`)
      try {
        const excludeArgs = (b.excludeGlobs ?? []).flatMap((g) => ['--exclude', g])
        // NOTE: do NOT set CONTEXT_MODE_DIR — that changes the *storage root* on write
        // while the MCP ctx_search reader uses the default global root, so reads come back
        // empty (writer/reader store-path mismatch). Use --project as the DB *identity*
        // only; both writer and reader then share ~/.claude/context-mode and agree by hash.
        const out = execFileSync(
          process.execPath,
          [
            cli,
            'index',
            b.srcDir,
            '--project',
            b.project,
            '--source',
            b.label,
            '--max-depth',
            '15',
            '--max-files',
            '5000',
            '--ext',
            b.ext,
            ...excludeArgs,
          ],
          { cwd: ROOT, timeout: 300_000, env: process.env, encoding: 'utf8' },
        )
        await log(`done ${b.label} in ${((Date.now() - t) / 1000).toFixed(1)}s — ${(out || '').trim().split('\n').pop() || ''}`)
      } catch (err) {
        allOk = false
        const msg = err?.stdout ? err.stdout.trim().split('\n').pop() : String(err).slice(0, 200)
        await log(`ERROR ${b.label} after ${((Date.now() - t) / 1000).toFixed(1)}s — ${msg}`)
      }
    }
    if (allOk) await writeStamp()
    else await log('stamp skipped — a bucket failed; next SessionStart retries')
    await log(`worker done — total ${((Date.now() - start) / 1000).toFixed(1)}s`)
  } finally {
    await releaseLock()
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(
    'Usage: node nav-refresh-index.mjs [--worker] [--force]\n' +
      '  (no args)        spawn a detached --worker child and return immediately (SessionStart hook)\n' +
      '  --worker         run the real reindex in the foreground (used by the detached child)\n' +
      '  --force          skip the 10-minute staleness guard and reindex now\n',
  )
  process.exit(0)
}
if (args.includes('--worker') || args.includes('--force')) {
  runWorker(args.includes('--force')).catch(async (err) => {
    await log(`FATAL: ${err}`)
    process.exit(1)
  })
} else {
  const worker = spawn(process.execPath, [__filename, '--worker'], { detached: true, stdio: 'ignore' })
  worker.unref()
  process.exit(0)
}
