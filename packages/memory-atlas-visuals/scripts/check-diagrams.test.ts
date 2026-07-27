import { describe, expect, it } from 'vitest'
import { auditScene } from './check-diagrams.ts'

// Minimal scene builders — only the fields auditScene reads.
const box = (id: string, x: number, y: number, width: number, height: number, extra = {}) => ({
  type: 'rectangle',
  id,
  x,
  y,
  width,
  height,
  ...extra,
})
const text = (x: number, y: number, t: string, width = 0) => ({
  type: 'text',
  x,
  y,
  width,
  text: t,
})

describe('auditScene', () => {
  it('flags a leaf box with no label of any kind (the empty-box bug)', () => {
    const { empty } = auditScene([box('a', 0, 0, 100, 50)])
    expect(empty).toHaveLength(1)
    expect(empty[0].id).toBe('a')
  })

  it('accepts a box labeled by the `label:{text}` shorthand (expanded at export)', () => {
    const { empty } = auditScene([box('a', 0, 0, 100, 50, { label: { text: 'hi' } })])
    expect(empty).toHaveLength(0)
  })

  it('accepts a box with a bound text element (boundElements ref)', () => {
    const { empty } = auditScene([
      box('a', 0, 0, 100, 50, { boundElements: [{ type: 'text', id: 't' }] }),
    ])
    expect(empty).toHaveLength(0)
  })

  it('accepts a box with a free text positioned over it (origin inside)', () => {
    const { empty } = auditScene([box('a', 0, 0, 100, 50), text(10, 20, 'hi', 40)])
    expect(empty).toHaveLength(0)
  })

  it('assigns a zero-width free label by ORIGIN, not center (slightly left is still inside)', () => {
    // text origin x=2 sits inside box[0..100]; with center-based assignment a width:0
    // text would land at its origin anyway, but this guards the origin rule explicitly.
    const { empty } = auditScene([box('a', 0, 0, 100, 50), text(2, 20, 'hi', 0)])
    expect(empty).toHaveLength(0)
  })

  it('exempts a group/lane box that fully CONTAINS a sub-box (header optional)', () => {
    // Big lane with a labeled sub-box inside — the lane itself needs no label.
    const lane = box('lane', 0, 0, 400, 200)
    const sub = box('sub', 20, 20, 100, 50, { label: { text: 'child' } })
    const { empty } = auditScene([lane, sub])
    expect(empty.map((e) => e.id)).not.toContain('lane')
  })

  it('does NOT call a small box a group just because a big box CENTER lands in it', () => {
    // Regression: a small unlabeled box overlapping a lane's center must still be EMPTY.
    const lane = box('lane', 0, 0, 400, 200) // center 200,100
    const small = box('small', 180, 80, 60, 40) // contains lane's center, but is NOT a group
    const { empty } = auditScene([lane, small])
    expect(empty.map((e) => e.id)).toContain('small')
  })

  it('flags a sized free label that overflows its box horizontally (shifted/not fitting)', () => {
    const { overflow } = auditScene([box('a', 0, 0, 100, 50), text(10, 20, 'wide', 200)])
    expect(overflow).toHaveLength(1)
    expect(overflow[0].id).toBe('a')
  })

  it('does NOT flag overflow for zero-width text (export path re-measures + wraps it)', () => {
    const { overflow } = auditScene([
      box('a', 0, 0, 100, 50, { label: { text: 'x' } }),
      text(2, 20, 'long text', 0),
    ])
    expect(overflow).toHaveLength(0)
  })
})
