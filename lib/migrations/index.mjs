/**
 * Ordered migration registry. Append-only forever: never reuse an id,
 * never reorder past entries.
 *
 * Each entry: { id, target, describe, plan, apply }
 *   id: 'NNNN-slug'
 *   target: atlasVersion this migration belongs to (e.g. '0.2.0')
 *   describe: one-line human summary
 *   plan(repoRoot, opts) -> [{ action, path, detail }]  // NO writes
 *   apply(repoRoot, opts) -> { changed: string[] }       // writes
 */

import { migration as m0001 } from './0001-backfill-provenance.mjs'

/** @type {Array<{
 *   id: string,
 *   target: string,
 *   describe: string,
 *   plan: (repoRoot: string, opts?: object) => Array<{action: string, path: string, detail?: string}>,
 *   apply: (repoRoot: string, opts?: object) => { changed: string[] },
 * }>} */
export const MIGRATIONS = [m0001]
