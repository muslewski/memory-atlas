import type { PrimitiveMeta } from './types'

export const CodeBlockMeta: PrimitiveMeta = {
  name: 'CodeBlock',
  category: 'data',
  useWhen:
    'Displaying a multi-line code snippet with language label and a one-click clipboard copy button.',
  props: {
    lang: 'string? — language label shown in the header (e.g. "tsx", "bash")',
    children: 'ReactNode — raw code string or pre-formatted content',
  },
  example: `<CodeBlock lang="tsx">\n  {codeString}\n</CodeBlock>`,
}
