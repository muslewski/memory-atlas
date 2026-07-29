/**
 * `atlas stamp <slug...>` — re-stamp `verifiedAt` for zones a human (or a
 * supervised agent) just reviewed. SPEC.md is explicit that a stamp command
 * MUST NOT offer a blanket "all zones" shortcut, and MUST refuse to stamp
 * an `unmounted` zone (there is no live code left to anchor the stamp to).
 *
 * The zone-card directory is resolved through `config.folders.zones`
 * (defaults from `./config.mjs` when a partial/absent config is loaded) —
 * the same folder-remapping seam `lib/notes.mjs` and `lib/validate.mjs`
 * honor: nothing here may join a vault path by string literal.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { loadConfig } from './config.mjs'
import { findRepoRoot, findVaultDir } from './detect.mjs'
import { parseFrontmatter, setFrontmatterField, upsertFrontmatterField } from './frontmatter.mjs'
import { assertWriteInside, isSafeSlug, isSafeVaultRel, resolveInside } from './paths.mjs'

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * True when the working tree has staged or unstaged changes under any of the
 * zone's owns.globs pathspecs. Non-git / empty-globs edge cases return false
 * so stamp keeps its current success path.
 *
 * @param {string} repoRoot
 * @param {string[]} globs
 * @returns {boolean}
 */
function hasUncommittedOwned(repoRoot, globs) {
  const list = (globs ?? []).filter((g) => typeof g === 'string' && g.trim())
  if (list.length === 0) return false
  try {
    const out = execFileSync('git', ['status', '--porcelain', '--', ...list], {
      cwd: repoRoot,
      encoding: 'utf8',
    })
    return out.trim().length > 0
  } catch {
    return false
  }
}

/**
 * @param {string[]} argv zone slugs (and possibly a rejected --all flag)
 * @param {{ cwd?: string, stdout?: { write: Function }, stderr?: { write: Function } }} [opts]
 * @returns {number} process exit code
 */
export function runStamp(argv, opts = {}) {
  const cwd = opts.cwd ?? process.cwd()
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr

  const slugs = argv.filter((a) => a !== '--all' && !a.startsWith('--'))
  const blanketAttempt = argv.includes('--all') || slugs.length === 0

  if (blanketAttempt) {
    stderr.write(
      'atlas stamp: stamp requires explicit zone slugs — blanket re-stamping defeats verification\n',
    )
    return 1
  }

  const repoRoot = findRepoRoot(cwd)
  if (!repoRoot) {
    stderr.write('atlas stamp: no git repository found above the current directory\n')
    return 1
  }
  const vaultDir = findVaultDir(repoRoot)
  if (!vaultDir) {
    stderr.write('atlas stamp: no Atlas vault found — run `atlas init` first\n')
    return 1
  }
  const config = loadConfig(repoRoot, { stderr })

  const zonesRel = config.folders?.zones ?? 'map/zones'
  if (!isSafeVaultRel(zonesRel)) {
    stderr.write(`atlas stamp: config folders.zones escapes the vault ("${zonesRel}")\n`)
    return 1
  }

  // Pre-flight-validate every named zone BEFORE writing anything: a stamp
  // command must never touch zones it wasn't given, and a single invalid
  // slug (missing, unparseable, unmounted) must not result in a partial
  // stamp of the others.
  const targets = []
  for (const slug of slugs) {
    if (!isSafeSlug(slug)) {
      stderr.write(
        `atlas stamp: zone "${slug}" is not a safe slug (no path separators or ..)\n`,
      )
      return 1
    }
    let file
    try {
      const zonesDir = resolveInside(vaultDir, zonesRel)
      file = resolveInside(zonesDir, `${slug}.md`)
      assertWriteInside(repoRoot, file)
      assertWriteInside(vaultDir, file)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      stderr.write(`atlas stamp: zone "${slug}": ${msg}\n`)
      return 1
    }
    if (!fs.existsSync(file)) {
      stderr.write(`atlas stamp: zone "${slug}" not found (${path.relative(repoRoot, file)})\n`)
      return 1
    }
    // Refuse to follow a zone card that is a symlink outside the vault.
    try {
      assertWriteInside(vaultDir, file)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      stderr.write(`atlas stamp: zone "${slug}": ${msg}\n`)
      return 1
    }
    let raw
    try {
      raw = fs.readFileSync(file, 'utf8')
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? err.code : ''
      stderr.write(
        `atlas stamp: zone "${slug}": cannot read (${code || (err instanceof Error ? err.message : String(err))})\n`,
      )
      return 1
    }
    let data
    try {
      ;({ data } = parseFrontmatter(raw))
    } catch (err) {
      stderr.write(`atlas stamp: zone "${slug}": unparseable frontmatter (${err.message})\n`)
      return 1
    }
    if (data.status === 'unmounted') {
      stderr.write(
        `atlas stamp: zone "${slug}" is unmounted — refusing to stamp (no live code to anchor to)\n`,
      )
      return 1
    }
    const globs = Array.isArray(data.owns?.globs) ? data.owns.globs : []
    targets.push({ slug, file, raw, status: data.status, globs })
  }

  let sha
  try {
    sha = execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim()
  } catch {
    stderr.write(
      'atlas stamp: unable to resolve HEAD via `git rev-parse` — is there a commit yet?\n',
    )
    return 1
  }

  // All-digit short SHAs must be YAML-quoted: the frontmatter subset parses
  // bare digit tokens as Number, and a re-read would otherwise lose the
  // string encoding (and break isSha without the numeric coerce there).
  const verifiedAtYaml = /^\d+$/.test(sha) ? `"${sha}"` : sha

  const today = todayDate()
  for (const t of targets) {
    // Warn when owned files are dirty: verifiedAt anchors to committed HEAD,
    // so stamping before the code commit leaves the zone stale after commit.
    if (hasUncommittedOwned(repoRoot, t.globs)) {
      stderr.write(
        `⚠ ${t.slug}: uncommitted changes in owned files — verifiedAt anchors to committed HEAD ${sha}; commit first, then stamp\n`,
      )
    }
    let text
    try {
      text = setFrontmatterField(t.raw, 'verifiedAt', verifiedAtYaml)
      if (t.status === 'seeded') {
        text = setFrontmatterField(text, 'status', 'active')
      }
      // upsert: hostile/legacy cards may lack `updated` — insert rather than throw
      text = upsertFrontmatterField(text, 'updated', today)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      stderr.write(`atlas stamp: zone "${t.slug}": ${msg}\n`)
      return 1
    }
    try {
      assertWriteInside(vaultDir, t.file)
      fs.writeFileSync(t.file, text)
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? err.code : ''
      const msg = err instanceof Error ? err.message : String(err)
      stderr.write(
        `atlas stamp: zone "${t.slug}": cannot write${code ? ` (${code})` : ''}: ${msg}\n`,
      )
      return 1
    }
    stdout.write(`stamped ${t.slug} → ${sha}\n`)
  }

  return 0
}
