/**
 * Git merge driver for zone cards when the only conflict is verifiedAt.
 *
 * Two agents that each re-stamp the same zone produce a one-line conflict on
 * `verifiedAt: <sha>`. Neither side's SHA is honest after the merge — the
 * merged content was never verified at either commit. The honest encoding is
 * the literal `unverified` (see decision
 * `2026-07-30-verifiedAt-after-merge-unverified`).
 *
 * A merge driver is the right tool for this shape: a check-time rule cannot
 * unstick a conflicted merge. Check only needs to accept the resolved state.
 * When anything other than verifiedAt differs, we refuse and leave a normal
 * git conflict so real content merges stay human-visible.
 */

import fs from 'node:fs'
import { parseFrontmatter, setFrontmatterField } from './frontmatter.mjs'

/**
 * Normalize a zone card for comparison: strip verifiedAt to a constant so
 * stamp-only diffs collapse. Returns null when the text is not parseable as
 * an Atlas frontmatter note.
 *
 * @param {string} text
 * @returns {{ normalized: string, status: unknown, verifiedAt: unknown } | null}
 */
export function normalizeZoneForStampCompare(text) {
  try {
    const { data } = parseFrontmatter(text)
    const normalized = setFrontmatterField(text, 'verifiedAt', '__STAMP__')
    return {
      normalized,
      status: data.status,
      verifiedAt: data.verifiedAt,
    }
  } catch {
    return null
  }
}

/**
 * Decide how to resolve a three-way zone merge.
 *
 * @param {{ base?: string, ours: string, theirs: string }} sides
 * @returns {
 *   | { ok: true, action: 'take-ours' | 'take-theirs' | 'unverify', text: string }
 *   | { ok: false, reason: string }
 * }
 */
export function decideZoneMerge({ base = '', ours, theirs }) {
  if (ours === theirs) {
    return { ok: true, action: 'take-ours', text: ours }
  }

  const nOurs = normalizeZoneForStampCompare(ours)
  const nTheirs = normalizeZoneForStampCompare(theirs)
  if (!nOurs || !nTheirs) {
    return {
      ok: false,
      reason: 'zone card is not parseable Atlas frontmatter — resolve manually',
    }
  }

  // Same card body + frontmatter once stamps are normalized → stamp-only conflict.
  if (nOurs.normalized === nTheirs.normalized) {
    let text = ours
    try {
      text = setFrontmatterField(ours, 'verifiedAt', 'unverified')
    } catch {
      return {
        ok: false,
        reason: 'cannot set verifiedAt on ours — resolve manually',
      }
    }
    return { ok: true, action: 'unverify', text }
  }

  // One side is byte-identical to base → take the other (git would usually
  // do this without a driver; keep for explicit driver invocations).
  if (base && ours === base) {
    return { ok: true, action: 'take-theirs', text: theirs }
  }
  if (base && theirs === base) {
    return { ok: true, action: 'take-ours', text: ours }
  }

  return {
    ok: false,
    reason:
      'zone cards differ beyond verifiedAt — resolve content conflict manually',
  }
}

/**
 * Merge-driver entry for a single zone path.
 * Writes resolved content to `ours` (%A) and returns ok so git stages it.
 * On refusal, leaves ours alone and returns ok:false (exit 1).
 *
 * @param {{
 *   ours: string,
 *   theirs?: string,
 *   base?: string,
 *   stderr?: { write: Function },
 * }} opts
 * @returns {{ ok: boolean, reason?: string, action?: string }}
 */
export function mergeZone(opts) {
  const stderr = opts.stderr ?? { write: () => {} }
  let oursText
  let theirsText
  let baseText = ''
  try {
    oursText = fs.readFileSync(opts.ours, 'utf8')
    theirsText = fs.readFileSync(opts.theirs ?? opts.ours, 'utf8')
    if (opts.base && fs.existsSync(opts.base)) {
      baseText = fs.readFileSync(opts.base, 'utf8')
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    stderr.write(`atlas merge-zone: read failed: ${msg}\n`)
    return { ok: false, reason: `read failed: ${msg}` }
  }

  const decision = decideZoneMerge({
    base: baseText,
    ours: oursText,
    theirs: theirsText,
  })
  if (!decision.ok) {
    return decision
  }

  try {
    // Atomic-ish: write only after a successful decision (no half-file).
    fs.writeFileSync(opts.ours, decision.text)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    stderr.write(`atlas merge-zone: write failed: ${msg}\n`)
    return { ok: false, reason: `write failed: ${msg}` }
  }
  return { ok: true, action: decision.action }
}
