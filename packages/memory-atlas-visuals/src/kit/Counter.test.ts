import { describe, expect, it } from 'vitest'
import { decimalsOf, formatCounter, parseCounter } from './counter-format'

describe('counter parsing', () => {
  it('splits prefix / value / suffix', () => {
    expect(parseCounter('~55')).toEqual({ prefix: '~', value: 55, suffix: '' })
    expect(parseCounter('100%')).toEqual({ prefix: '', value: 100, suffix: '%' })
    expect(parseCounter('18.45s')).toEqual({ prefix: '', value: 18.45, suffix: 's' })
    expect(parseCounter('~$0.50')).toEqual({ prefix: '~$', value: 0.5, suffix: '' })
    expect(parseCounter('5')).toEqual({ prefix: '', value: 5, suffix: '' })
  })
  it('non-numeric (letter-led) → NaN value', () => {
    expect(parseCounter('h264').value).toBeNaN()
    expect(parseCounter('h264+aac').value).toBeNaN()
  })
  it('decimalsOf', () => {
    expect(decimalsOf('18.45s')).toBe(2)
    expect(decimalsOf('55')).toBe(0)
    expect(decimalsOf('~$0.50')).toBe(2)
  })
  it('formatCounter', () => {
    expect(formatCounter('~', 55, '', 0)).toBe('~55')
    expect(formatCounter('', 18.45, 's', 2)).toBe('18.45s')
  })
})
