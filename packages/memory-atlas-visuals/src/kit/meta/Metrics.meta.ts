import type { PrimitiveMeta } from './types'

export const MetricsMeta: PrimitiveMeta = {
  name: 'Metrics',
  category: 'data',
  useWhen: 'Displaying a row of key/value statistics or measurements with large display numerals.',
  props: {
    children: 'ReactNode — one or more <Metric> elements (canonical)',
    items:
      'optional { label: string; value: string }[] — forgiving alias for children; renders the same <Metric> cells. Use EITHER children OR items, never empty.',
  },
  example: `<Metrics>\n  <Metric label="Zones" value="42" />\n  <Metric label="Coverage" value="100%" />\n</Metrics>`,
}

export const MetricMeta: PrimitiveMeta = {
  name: 'Metric',
  category: 'data',
  useWhen:
    'A single stat cell inside a Metrics row; value renders large, label renders small beneath.',
  props: {
    label: 'string — descriptive label beneath the value',
    value: 'string — the headline number or string',
    icon: 'string? — any lucide kebab name; renders small above the value. Choose by what the metric counts (e.g. "git-branch" for threads, "database" for rows).',
    count:
      'boolean? — count the value up from 0 on scroll-enter (GSAP). Safe on any value (non-numeric renders unchanged).',
  },
  example: `<Metric label="Token savings" value="87%" icon="trending-up" />`,
}
