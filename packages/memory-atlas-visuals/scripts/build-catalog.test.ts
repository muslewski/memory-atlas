/**
 * scripts/build-catalog.test.ts
 * Asserts the shape and completeness of the generated kit-catalog.json.
 *
 * Run: pnpm test  (vitest picks up all *.test.ts files under src/ and scripts/)
 */

import { readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import catalog from '../kit-catalog.json'

const __dirname = dirname(fileURLToPath(import.meta.url))
const metaDir = resolve(__dirname, '../src/kit/meta')

const ALL_CATEGORIES = ['typography', 'data', 'orientation', 'motion', 'structure'] as const

describe('kit-catalog.json shape', () => {
  it('has a generated ISO timestamp string', () => {
    expect(typeof catalog.generated).toBe('string')
    expect(catalog.generated.length).toBeGreaterThan(0)
    expect(() => new Date(catalog.generated).toISOString()).not.toThrow()
  })

  it('primitives count matches the number of meta files (multi-export files count individually)', () => {
    // Each *.meta.ts file may export >1 PrimitiveMeta; the catalog captures all of them.
    // Minimum expectation: at least as many entries as there are .meta.ts files.
    const metaFiles = readdirSync(metaDir).filter((f) => f.endsWith('.meta.ts'))
    expect(catalog.primitives.length).toBeGreaterThanOrEqual(metaFiles.length)
  })

  it('every entry has required fields: name, category, useWhen, example', () => {
    for (const p of catalog.primitives) {
      expect(typeof p.name, `${p.name}.name`).toBe('string')
      expect(typeof p.category, `${p.name}.category`).toBe('string')
      expect(typeof p.useWhen, `${p.name}.useWhen`).toBe('string')
      expect(typeof p.example, `${p.name}.example`).toBe('string')
      expect((p.name as string).length).toBeGreaterThan(0)
      expect((p.useWhen as string).length).toBeGreaterThan(0)
      expect((p.example as string).length).toBeGreaterThan(0)
    }
  })

  it('every category value is one of the 5 valid categories', () => {
    for (const p of catalog.primitives) {
      expect(ALL_CATEGORIES).toContain(p.category as string)
    }
  })

  it('all 5 categories appear at least once', () => {
    const found = new Set(catalog.primitives.map((p) => p.category))
    for (const cat of ALL_CATEGORIES) {
      expect(found.has(cat), `category "${cat}" missing from catalog`).toBe(true)
    }
  })

  it('primitives are sorted by category order then name', () => {
    const ORDER = ALL_CATEGORIES
    for (let i = 1; i < catalog.primitives.length; i++) {
      const prev = catalog.primitives[i - 1]
      const curr = catalog.primitives[i]
      const prevCat = ORDER.indexOf(prev.category as (typeof ALL_CATEGORIES)[number])
      const currCat = ORDER.indexOf(curr.category as (typeof ALL_CATEGORIES)[number])
      if (prevCat === currCat) {
        expect(
          (prev.name as string).localeCompare(curr.name as string),
          `${prev.name} should come before ${curr.name}`,
        ).toBeLessThanOrEqual(0)
      } else {
        expect(prevCat).toBeLessThanOrEqual(currCat)
      }
    }
  })
})
