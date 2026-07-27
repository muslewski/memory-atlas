import { describe, expect, it } from 'vitest'
import { groupByFolder } from './group'

describe('groupByFolder', () => {
  it('buckets by folder', () => {
    expect(
      groupByFolder([
        { folder: 'ideas', n: 1 },
        { folder: 'ideas', n: 2 },
        { folder: 'debt', n: 3 },
      ]),
    ).toEqual({
      ideas: [
        { folder: 'ideas', n: 1 },
        { folder: 'ideas', n: 2 },
      ],
      debt: [{ folder: 'debt', n: 3 }],
    })
  })
})
