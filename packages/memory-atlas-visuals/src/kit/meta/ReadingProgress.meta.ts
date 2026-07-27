import type { PrimitiveMeta } from './types'

export const ReadingProgressMeta: PrimitiveMeta = {
  name: 'ReadingProgress',
  category: 'orientation',
  useWhen:
    'Long-form articles or reference notes where showing scroll progress helps readers gauge depth and stay oriented.',
  props: {},
  example: `<ReadingProgress />`,
}
