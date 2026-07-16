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
import { parseFrontmatter, setFrontmatterField } from './frontmatter.mjs'

function todayDate() {
  return new Date().toISOString().slice(0, 10)
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

  // Pre-flight-validate every named zone BEFORE writing anything: a stamp
  // command must never touch zones it wasn't given, and a single invalid
  // slug (missing, unparseable, unmounted) must not result in a partial
  // stamp of the others.
  const targets = []
  for (const slug of slugs) {
    const file = path.join(vaultDir, config.folders.zones, `${slug}.md`)
    if (!fs.existsSync(file)) {
      stderr.write(`atlas stamp: zone "${slug}" not found (${path.relative(repoRoot, file)})\n`)
      return 1
    }
    const raw = fs.readFileSync(file, 'utf8')
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
    targets.push({ slug, file, raw, status: data.status })
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
    let text = setFrontmatterField(t.raw, 'verifiedAt', verifiedAtYaml)
    if (t.status === 'seeded') {
      text = setFrontmatterField(text, 'status', 'active')
    }
    text = setFrontmatterField(text, 'updated', today)
    fs.writeFileSync(t.file, text)
    stdout.write(`stamped ${t.slug} → ${sha}\n`)
  }

  return 0
}
