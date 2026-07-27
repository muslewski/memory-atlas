import { describe, expect, it } from 'vitest'
import { findConflictMarkers } from './check-conflict-markers'

// Built by repetition, never as literal 7-char runs — otherwise this fixture would
// make `pnpm check:conflict-markers` fail on its own test file.
const OPEN = '<'.repeat(7)
const MID = '='.repeat(7)
const CLOSE = '>'.repeat(7)

describe('findConflictMarkers', () => {
  it('flags the open and close markers with 1-indexed line numbers', () => {
    const lines = ['{', `${OPEN} HEAD`, '  "a": 1', MID, '  "a": 2', `${CLOSE} origin/main`, '}']
    expect(findConflictMarkers(lines.join('\n')).map((c) => c.line)).toEqual([2, 6])
  })

  it('does not flag a setext H1 underline', () => {
    expect(findConflictMarkers(`Title\n${MID}\nbody`)).toEqual([])
  })

  it('does not flag a blockquote, a shift operator, or prose', () => {
    expect(findConflictMarkers('>>> repl\na << b\nnormal text')).toEqual([])
  })

  it('returns nothing for a clean file', () => {
    expect(findConflictMarkers('{\n  "a": 1\n}\n')).toEqual([])
  })
})
