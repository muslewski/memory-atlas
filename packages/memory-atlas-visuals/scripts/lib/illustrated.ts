import fs from 'node:fs'
import path from 'node:path'

export interface DigestRef {
  /** Origin folder: specs | ideas | tech-debt | programs | … */
  folder: string
  slug: string
  mdxPath: string
}

/**
 * Walk one skin tree: <skinDir>/<origin>/*.mdx.
 * Returns DigestRef[] sorted by folder then slug.
 * Returns [] if skinDir is absent or not a directory.
 */
export function walkDigests(skinDir: string): DigestRef[] {
  const results: DigestRef[] = []
  if (!fs.existsSync(skinDir)) return results
  for (const origin of fs.readdirSync(skinDir, { withFileTypes: true })) {
    if (!origin.isDirectory()) continue
    const originPath = path.join(skinDir, origin.name)
    for (const f of fs.readdirSync(originPath)) {
      if (!f.endsWith('.mdx')) continue
      results.push({ folder: origin.name, slug: f.slice(0, -4), mdxPath: path.join(originPath, f) })
    }
  }
  results.sort((a, b) =>
    a.folder !== b.folder ? a.folder.localeCompare(b.folder) : a.slug.localeCompare(b.slug),
  )
  return results
}
