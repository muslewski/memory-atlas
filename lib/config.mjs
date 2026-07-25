/**
 * `atlas.config.json` loader: the full v1 default schema, a tolerant deep
 * merge, and best-effort key validation. Warnings only — an invalid or
 * partial config must never crash a command; every optional feature
 * defaults off/safe (SPEC.md §10 Configuration points here for the
 * authoritative shape; see docs/CONFIG.md for the field-level writeup).
 *
 * This module is the SINGLE source of the default folder/module/anchor/
 * hook/routine shape: every other module that needs a vault-relative
 * default path imports it from here rather than re-typing the literal.
 */

import fs from 'node:fs'
import path from 'node:path'

export const DEFAULT_FOLDERS = {
  zones: 'map/zones',
  decisions: 'map/decisions',
  flows: 'map/flows',
  specs: 'specs',
  plans: 'plans',
  programs: 'programs',
  ideas: 'ideas',
  techDebt: 'tech-debt',
  vision: 'vision',
  reference: 'reference',
  archive: 'archive',
  reports: 'reports',
  drafts: 'drafts',
  templates: 'templates',
}

export const DEFAULT_MODULES = {
  flows: false,
  programs: false,
  vision: false,
  reference: false,
  archive: false,
  reports: false,
  backlog: false,
  drafts: false,
}

export const DEFAULT_ANCHORS = {
  testids: { enabled: false, pattern: 'data-testid="{id}"', root: 'src' },
  tools: { enabled: false, pattern: "'{id}'", root: '' },
  routes: { enabled: false, fileGlobs: [], stripPrefix: '', stripSuffix: '' },
}

export const DEFAULT_CHECK = {
  strictFreshness: false,
  ownership: true,
  corpus: { enabled: false, maxSummaryLen: 500 },
}

export const DEFAULT_RETRIEVAL = {
  engine: 'ctx-search',
  excludeFromSearch: ['drafts/', 'visuals/'],
}

export const DEFAULT_SKILLS = { dir: '.claude/skills', nav: 'atlas-nav' }

export const DEFAULT_HOOKS = { sessionStartStatus: true, sessionStartIndexRefresh: true }

export const DEFAULT_ROUTINES = { enabled: false, cadenceDays: 7, tasks: ['gardening'] }

/**
 * Profiles (dual dogfood):
 * - `code` (default): product minds — owns.globs HARD; modules lean
 * - `operator`: ops/design vaults — ledger modules on; globs still recommended
 *   but empty globs only warn (policy zones), never invent code ownership
 */
export const PROFILES = {
  code: {
    modules: { ...DEFAULT_MODULES },
    requireZoneGlobs: true,
  },
  operator: {
    modules: {
      ...DEFAULT_MODULES,
      reference: true,
      drafts: true,
      backlog: true,
      reports: true,
      archive: true,
    },
    requireZoneGlobs: false,
  },
}

/** The full v1 default shape. Keep in sync with `templates/config/atlas.config.json`
 * (the file `atlas init` writes) and `schema/atlas.config.schema.json` (editor tooling). */
export const DEFAULTS = {
  version: 1,
  enabled: true,
  /** @type {'code'|'operator'|null} */
  profile: 'code',
  vaultDir: null,
  folders: DEFAULT_FOLDERS,
  modules: DEFAULT_MODULES,
  anchors: DEFAULT_ANCHORS,
  check: DEFAULT_CHECK,
  retrieval: DEFAULT_RETRIEVAL,
  skills: DEFAULT_SKILLS,
  hooks: DEFAULT_HOOKS,
  routines: DEFAULT_ROUTINES,
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function mergeValue(defaultVal, overrideVal, keyPath, warn) {
  if (isPlainObject(defaultVal)) {
    if (!isPlainObject(overrideVal)) {
      warn(`config key "${keyPath}" should be an object — using default`)
      return structuredClone(defaultVal)
    }
    return mergeObject(defaultVal, overrideVal, keyPath, warn)
  }
  if (Array.isArray(defaultVal)) {
    if (!Array.isArray(overrideVal)) {
      warn(`config key "${keyPath}" should be an array — using default`)
      return structuredClone(defaultVal)
    }
    return overrideVal
  }
  if (defaultVal === null) {
    // e.g. vaultDir: no fixed type to check a null default against — accept as given.
    return overrideVal
  }
  if (typeof overrideVal !== typeof defaultVal) {
    warn(`config key "${keyPath}" should be a ${typeof defaultVal} — using default`)
    return defaultVal
  }
  return overrideVal
}

/**
 * Merge `override` onto `defaults`, recursing into nested plain objects.
 * Unknown keys and type mismatches are reported through `warn` and
 * otherwise ignored (the default value survives) — never fatal.
 *
 * @param {Record<string, unknown>} defaults
 * @param {Record<string, unknown>} override
 * @param {string} prefix dotted key path so far, for warning messages
 * @param {(msg: string) => void} warn
 * @returns {Record<string, unknown>}
 */
function mergeObject(defaults, override, prefix, warn) {
  const result = { ...defaults }
  for (const key of Object.keys(override)) {
    if (key.startsWith('$')) continue // e.g. "$schema" — editor tooling, not a config value
    const keyPath = prefix ? `${prefix}.${key}` : key
    if (!(key in defaults)) {
      warn(`unknown config key "${keyPath}" — ignoring`)
      continue
    }
    result[key] = mergeValue(defaults[key], override[key], keyPath, warn)
  }
  return result
}

// git pathspecs crash on an empty string ("fatal: empty string is not a
// valid pathspec"); '.' is the idiomatic git spelling of "whole tree" that
// lib/resolvers.mjs already expects. A user leaving `root` at its
// documented default ("" for the `tools` anchor class) must still get a
// working resolver, so normalize the empty-string form here — once, at the
// config boundary — rather than in every consumer.
function normalizeAnchorRoots(anchors) {
  const out = { ...anchors }
  for (const cls of ['testids', 'tools']) {
    if (out[cls] && out[cls].root === '') {
      out[cls] = { ...out[cls], root: '.' }
    }
  }
  return out
}

/**
 * Read and deep-merge `atlas.config.json` at `repoRoot` onto the full v1
 * default shape. Tolerates a missing file, invalid JSON, or a non-object
 * root — all fall back to `DEFAULTS` alone. Unknown top-level (or nested)
 * keys and type mismatches produce one stderr warning line each; they are
 * never fatal, so a hand-edited config can't crash a command.
 *
 * @param {string} repoRoot
 * @param {{ stderr?: { write: Function } }} [opts]
 * @returns {Record<string, unknown>}
 */
export function loadConfig(repoRoot, opts = {}) {
  const stderr = opts.stderr ?? process.stderr
  const warn = (msg) => stderr.write(`atlas: config: ${msg}\n`)
  const base = structuredClone(DEFAULTS)

  let text
  try {
    text = fs.readFileSync(path.join(repoRoot, 'atlas.config.json'), 'utf8')
  } catch {
    return base // no config file yet — every optional feature defaults off/safe
  }

  let raw
  try {
    raw = JSON.parse(text)
  } catch (err) {
    warn(`atlas.config.json is not valid JSON (${err.message}) — using defaults`)
    return base
  }

  if (!isPlainObject(raw)) {
    warn('atlas.config.json must be a JSON object — using defaults')
    return base
  }

  const merged = mergeObject(base, raw, '', warn)
  merged.anchors = normalizeAnchorRoots(merged.anchors)
  return merged
}
