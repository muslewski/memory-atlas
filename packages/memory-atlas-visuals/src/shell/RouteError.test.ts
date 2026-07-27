import { describe, expect, it } from 'vitest'
import { routeErrorMessage } from './RouteError'

describe('routeErrorMessage', () => {
  it('reads an Error message', () => {
    expect(routeErrorMessage(new Error('boom'))).toBe('boom')
  })
  it('passes a string through', () => {
    expect(routeErrorMessage('plain failure')).toBe('plain failure')
  })
  it('falls back for unknown shapes', () => {
    expect(routeErrorMessage({ weird: true })).toBe('Something went wrong rendering this view.')
  })
})
