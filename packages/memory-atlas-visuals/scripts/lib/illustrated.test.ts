import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { walkDigests } from './illustrated'

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const DEFAULT_DIR = resolve(APP_DIR, '../illustrated/default')

describe('walkDigests', () => {
  it('finds .mdx under <skinDir>/<origin>/, sorted', () => {
    const refs = walkDigests(DEFAULT_DIR)
    expect(refs.length).toBeGreaterThan(0)
    expect(refs.every((r) => r.mdxPath.endsWith('.mdx'))).toBe(true)
    // Two-key sort: folder first, slug second (not concatenated)
    const sorted = [...refs].sort((a, b) =>
      a.folder !== b.folder ? a.folder.localeCompare(b.folder) : a.slug.localeCompare(b.slug),
    )
    expect(refs.map((r) => [r.folder, r.slug])).toEqual(sorted.map((r) => [r.folder, r.slug]))
  })
  it('returns [] for a missing dir', () => {
    expect(walkDigests(resolve(APP_DIR, '../illustrated/__nope__'))).toEqual([])
  })
})
