import type { PrimitiveMeta } from './types'

export const RevealMeta: PrimitiveMeta = {
  name: 'Reveal',
  category: 'motion',
  useWhen:
    'Fading a block of content into view as the reader scrolls to it — headings, images, or any section that benefits from a subtle entrance.',
  props: {
    y: 'number? — vertical offset in px to animate from; default 16',
    children: 'ReactNode — content to reveal',
  },
  example: `<Reveal>\n  <h2>Section heading that fades in as you scroll</h2>\n</Reveal>`,
}
