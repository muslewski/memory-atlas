import type { PrimitiveMeta } from './types'

export const StaggerMeta: PrimitiveMeta = {
  name: 'Stagger',
  category: 'motion',
  useWhen:
    'Animating a list of sibling items so they cascade into view one after another — cards, bullets, or any repeating block.',
  props: {
    gap: 'number? — delay between each child animation start in seconds; default 0.1',
    children: 'ReactNode — sibling elements to stagger (array preferred)',
  },
  example: `<Stagger gap={0.12}>\n  <Card h="One">First card fades in.</Card>\n  <Card h="Two">Second card follows.</Card>\n  <Card h="Three">Third card last.</Card>\n</Stagger>`,
}
