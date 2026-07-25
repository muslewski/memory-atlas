/**
 * `atlas search` — portable retrieval floor (rg-first, grep fallback).
 * Zero runtime deps. Vault-relative only; honors retrieval.excludeFromSearch.
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { loadConfig } from './config.mjs'
import { findRepoRoot, findVaultDir } from './detect.mjs'

/**
 * @param {string[]} argv after "search"
 * @param {{ cwd?: string, stdout?: { write: Function }, stderr?: { write: Function } }} [opts]
 * @returns {number}
 */
export function runSearch(argv, opts = {}) {
  const cwd = opts.cwd ?? process.cwd()
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr

  let max = 40
  const qParts = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--max' || a === '-n') {
      i += 1
      max = Math.max(1, Number.parseInt(argv[i] || '40', 10) || 40)
    } else if (a === '--help' || a === '-h') {
      stdout.write(`Usage: atlas search <query> [--max N]

Search vault markdown (rg if available, else grep -R).
Respects atlas.config.json → retrieval.excludeFromSearch.
Portable floor for hosts without ctx_search / MCP.
`)
      return 0
    } else {
      qParts.push(a)
    }
  }
  const query = qParts.join(' ').trim()
  if (!query) {
    stderr.write('atlas search: query required\n')
    return 1
  }

  const repoRoot = findRepoRoot(cwd)
  if (!repoRoot) {
    stderr.write('atlas: no git repository found\n')
    return 1
  }
  const vaultDir = findVaultDir(repoRoot)
  if (!vaultDir) {
    stderr.write('atlas: no Atlas vault found — run `atlas init` first\n')
    return 1
  }

  const config = loadConfig(repoRoot, { stderr: { write: () => {} } })
  const excludes = Array.isArray(config.retrieval?.excludeFromSearch)
    ? config.retrieval.excludeFromSearch
    : ['drafts/', 'visuals/']

  const lines = searchVault(vaultDir, query, { max, excludes })
  if (lines.length === 0) {
    stdout.write(`(no matches for ${JSON.stringify(query)} in ${path.relative(repoRoot, vaultDir) || '.'})\n`)
    return 0
  }
  for (const line of lines) {
    // vault-relative paths
    const rel = path.relative(vaultDir, line.file)
    stdout.write(`${rel}:${line.line}: ${line.text}\n`)
  }
  stdout.write(`--- meta: ${lines.length} hit(s) · engine=${lines.engine} · budget=${max} ---\n`)
  return 0
}

/**
 * @param {string} vaultDir
 * @param {string} query
 * @param {{ max: number, excludes: string[] }} opts
 * @returns {Array<{file:string,line:number,text:string}> & { engine?: string }}
 */
export function searchVault(vaultDir, query, opts) {
  const max = opts.max ?? 40
  const excludes = opts.excludes ?? []

  const rg = spawnSync(
    'rg',
    [
      '--line-number',
      '--no-heading',
      '--color',
      'never',
      '--glob',
      '*.md',
      ...excludes.flatMap((e) => {
        const g = e.endsWith('/') ? e.slice(0, -1) : e
        return ['--glob', `!${g}/**`, '--glob', `!${g}`]
      }),
      '-i',
      '--max-count',
      String(max),
      '--',
      query,
      vaultDir,
    ],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
  )

  if (rg.status === 0 || (rg.status === 1 && !rg.error)) {
    const out = parseRg(rg.stdout || '', max)
    out.engine = 'rg'
    return out
  }

  // grep -R fallback
  const grep = spawnSync(
    'grep',
    ['-RIn', '--include=*.md', '-i', '--', query, vaultDir],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
  )
  const raw = grep.stdout || ''
  const filtered = raw
    .split('\n')
    .filter(Boolean)
    .filter((ln) => {
      const file = ln.split(':', 1)[0] || ''
      const rel = path.relative(vaultDir, file).replace(/\\/g, '/')
      return !excludes.some((ex) => {
        const e = ex.endsWith('/') ? ex : `${ex}/`
        return rel === ex.replace(/\/$/, '') || rel.startsWith(e)
      })
    })
    .slice(0, max)
  const out = parseGrep(filtered, max)
  out.engine = 'grep'
  return out
}

function parseRg(stdout, max) {
  /** @type {Array<{file:string,line:number,text:string}> & {engine?: string}} */
  const hits = []
  for (const ln of stdout.split('\n')) {
    if (!ln.trim() || hits.length >= max) break
    // path:line:text (path may contain :)
    const m = /^(.+?):(\d+):(.*)$/.exec(ln)
    if (!m) continue
    hits.push({ file: m[1], line: Number(m[2]), text: m[3].trim().slice(0, 200) })
  }
  return hits
}

function parseGrep(lines, max) {
  /** @type {Array<{file:string,line:number,text:string}> & {engine?: string}} */
  const hits = []
  for (const ln of lines) {
    if (hits.length >= max) break
    const m = /^(.+?):(\d+):(.*)$/.exec(ln)
    if (!m) continue
    hits.push({ file: m[1], line: Number(m[2]), text: m[3].trim().slice(0, 200) })
  }
  return hits
}
