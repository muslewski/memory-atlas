/**
 * Git-backed resolver factory (SPEC.md §5 Zone cards and anchors). Builds
 * the `Resolvers` object `lib/validate.mjs`'s pure core is driven by. This
 * is the ONLY module allowed to shell out to git for anchor resolution.
 */

import { execFileSync } from 'node:child_process'
import { isExcludePathspec } from './validate.mjs'

function git(repoRoot, args) {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' })
  } catch {
    return ''
  }
}

function stripGroupSegments(rel) {
  // Next.js route groups: `(marketing)/about/page.tsx` -> `about/page.tsx`
  return rel.replace(/(^|\/)\([^/]+\)(?=\/|$)/g, '$1').replace(/\/{2,}/g, '/')
}

function normalizeRouteFile(rel, stripPrefix, stripSuffixRe) {
  let r = rel
  if (stripPrefix && r.startsWith(stripPrefix)) r = r.slice(stripPrefix.length)
  r = r.replace(stripSuffixRe, '')
  r = stripGroupSegments(r)
  if (!r.startsWith('/')) r = `/${r}`
  r = r.replace(/\/index$/, '')
  return r === '' ? '/' : r
}

function routePatternToRegExp(pattern) {
  const escaped = pattern
    .split('/')
    .map((seg) => {
      if (/^\[.+\]$/.test(seg)) return '[^/]+'
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')
  return new RegExp(`^${escaped}$`)
}

/**
 * @param {string} repoRoot
 * @param {{
 *   testids?: { enabled?: boolean, pattern?: string, root?: string },
 *   tools?: { enabled?: boolean, pattern?: string, root?: string },
 *   routes?: { enabled?: boolean, fileGlobs?: string[], stripPrefix?: string, stripSuffix?: string },
 * }} [anchorsConfig]
 * @returns {import('./validate.mjs').Resolvers}
 */
export function makeResolvers(repoRoot, anchorsConfig = {}) {
  const resolvers = {
    glob: (g) => git(repoRoot, ['ls-files', '--', g]).trim().length > 0,

    // Single git call so `:(exclude)…` pathspecs subtract; guard against a
    // lone exclude (which would otherwise match the whole repo).
    changedSince: (sha, globs) => {
      if (!sha) return true
      const positives = (globs ?? []).filter((g) => g.trim() && !isExcludePathspec(g))
      if (positives.length === 0) return false
      try {
        const out = execFileSync(
          'git',
          ['diff', '--name-only', `${sha}..HEAD`, '--', ...(globs ?? [])],
          { cwd: repoRoot, encoding: 'utf8' },
        )
        return out.trim().length > 0
      } catch {
        // Unknown/invalid sha (e.g. shallow clone, rewritten history): the
        // caller must surface this as a warning, never silently read it as
        // fresh.
        return 'unknown-sha'
      }
    },
  }

  const testids = anchorsConfig.testids ?? {}
  if (testids.enabled) {
    const pattern = testids.pattern ?? 'data-testid="{id}"'
    const root = testids.root ?? '.'
    resolvers.testid = (id) =>
      git(repoRoot, ['grep', '-lF', pattern.replace('{id}', id), '--', root]).trim().length > 0
  }

  const tools = anchorsConfig.tools ?? {}
  if (tools.enabled) {
    const pattern = tools.pattern ?? "'{id}'"
    const root = tools.root ?? '.'
    resolvers.tool = (id) =>
      git(repoRoot, ['grep', '-lF', pattern.replace('{id}', id), '--', root]).trim().length > 0
  }

  const routes = anchorsConfig.routes ?? {}
  if (routes.enabled) {
    const fileGlobs = routes.fileGlobs ?? []
    const stripPrefix = routes.stripPrefix ?? ''
    const stripSuffixRe = new RegExp(routes.stripSuffix ?? '\\.(tsx|ts)$')
    resolvers.route = (rt) => {
      if (fileGlobs.length === 0) return false
      const files = git(repoRoot, ['ls-files', '--', ...fileGlobs])
        .split('\n')
        .filter(Boolean)
      const target = rt.startsWith('/') ? rt : `/${rt}`
      return files.some((f) =>
        routePatternToRegExp(normalizeRouteFile(f, stripPrefix, stripSuffixRe)).test(target),
      )
    }
  }

  return resolvers
}
