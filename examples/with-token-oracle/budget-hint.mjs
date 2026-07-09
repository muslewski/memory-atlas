#!/usr/bin/env node
// examples/with-token-oracle/budget-hint.mjs
//
// A zero-dependency, READ-ONLY reader of token-oracle's `forecast.json`
// snapshot (schema 1 — see `token-oracle/ADAPTERS.md` → "Consumer
// interface"). Prints one advisory line per non-idle window projected over
// `--warn-pct` (default 80), otherwise prints nothing. Missing snapshot,
// unparseable JSON, or an unrecognized schema all fail OPEN: print nothing,
// exit 0 — this must be safe to wire into a hook or routine unconditionally.
// Never writes anything; oracle's own planning record rejected auto-writing
// into a sibling's config ("the hint is the product") — this script only
// ever reads.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

function defaultSnapshotPath() {
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share')
  return path.join(base, 'token-oracle', 'forecast.json')
}

function parseArgs(argv) {
  let warnPct = 80
  let snapshotPath = process.env.TOKEN_ORACLE_SNAPSHOT || defaultSnapshotPath()
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--warn-pct') warnPct = Number(argv[++i])
    else if (a.startsWith('--warn-pct=')) warnPct = Number(a.slice('--warn-pct='.length))
    else if (a === '--path') snapshotPath = argv[++i]
    else if (a.startsWith('--path=')) snapshotPath = a.slice('--path='.length)
  }
  return { warnPct, snapshotPath }
}

const fmtHours = (secs) => (typeof secs === 'number' ? (secs / 3600).toFixed(1) : '?')

// Compact token counts the way the plan's own example line does ("194k/220k").
const fmtK = (n) => {
  if (typeof n !== 'number') return String(n)
  if (Math.abs(n) < 1000) return String(n)
  const k = n / 1000
  return `${Number.isInteger(k) ? k : k.toFixed(1)}k`
}

function main(argv) {
  const { warnPct, snapshotPath } = parseArgs(argv)

  let raw
  try {
    raw = fs.readFileSync(snapshotPath, 'utf8')
  } catch {
    return 0 // no snapshot yet (oracle not installed, or `oracle snapshot` never ran)
  }

  let snap
  try {
    snap = JSON.parse(raw)
  } catch {
    return 0
  }

  if (!snap || snap.schema !== 1 || !Array.isArray(snap.windows)) return 0 // unrecognized schema

  for (const w of snap.windows) {
    if (!w || w.idle) continue
    if (typeof w.projected_pct !== 'number' || w.projected_pct < warnPct) continue
    process.stdout.write(
      `⏳ ${w.window} window projected ${Math.round(w.projected_pct)}% ` +
        `(used ${fmtK(w.used)}/${fmtK(w.cap)}, resets in ${fmtHours(w.reset_in_secs)}h) — ` +
        `consider a smaller backlog item.\n`,
    )
  }
  return 0
}

process.exit(main(process.argv.slice(2)))
