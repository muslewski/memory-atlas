import type { PrimitiveMeta } from './types'

export const CounterMeta: PrimitiveMeta = {
  name: 'Counter',
  category: 'motion',
  useWhen:
    'Count a number up from 0 on scroll-enter, preserving a symbol prefix/suffix ("~55", "100%", "18.45s", "~$0.50"). For stat rows prefer Metric count. Letter-led strings ("h264") render unchanged. GSAP — reduced-motion shows the final value immediately.',
  props: {
    children: 'string — the final value, e.g. "100%" or "18.45s"',
  },
  example: `<Counter>18.45s</Counter>`,
}
