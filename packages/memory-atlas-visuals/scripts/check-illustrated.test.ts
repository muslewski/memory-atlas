import { describe, expect, it } from 'vitest'
import { findCompileError, findDigestIssues } from './check-illustrated.ts'

describe('findDigestIssues', () => {
  it('flags a self-closing data primitive with no items=', () => {
    expect(findDigestIssues('<Metrics />')).toHaveLength(1)
    expect(findDigestIssues('<Ledger class="x" />')[0]).toMatch(/renders EMPTY/)
  })

  it('flags an empty open/close data primitive', () => {
    expect(findDigestIssues('<Timeline>\n</Timeline>')).toHaveLength(1)
  })

  it('passes a data primitive with children', () => {
    expect(findDigestIssues('<Metrics>\n<Metric label="x" value="1" />\n</Metrics>')).toHaveLength(
      0,
    )
    expect(findDigestIssues('<Ledger>\n<Row title="t" />\n</Ledger>')).toHaveLength(0)
  })

  it('passes a self-closing data primitive that uses items=', () => {
    expect(findDigestIssues('<Metrics items={[{label:"x",value:"1"}]} />')).toHaveLength(0)
    expect(findDigestIssues('<Timeline items={["a","b"]} />')).toHaveLength(0)
  })

  it('ignores non-data primitives', () => {
    expect(findDigestIssues('<Divider />\n<ReadingProgress />\n<Diagram src="x" />')).toHaveLength(
      0,
    )
  })

  it('flags a CodeBlock inside a Cards grid', () => {
    const src = '<Cards>\n<Card h="x"><CodeBlock lang="ts">{`a`}</CodeBlock></Card>\n</Cards>'
    expect(findDigestIssues(src).some((i) => /CodeBlock> inside <Cards>/.test(i))).toBe(true)
  })

  it('passes a CodeBlock at top level + Cards without code', () => {
    const src =
      '<CodeBlock lang="ts">{`a`}</CodeBlock>\n<Cards>\n<Card h="x">prose</Card>\n</Cards>'
    expect(findDigestIssues(src)).toHaveLength(0)
  })
})

describe('findCompileError', () => {
  it('flags an inline code span broken across a newline so `{` starts a flow line', async () => {
    // the exact bug class: `editor.addTrack\n{type:\'video\'}` → MDX reads `{` as a JS expression
    const src = "prose via `editor.addTrack\n{type:'video'}`; more prose."
    const err = await findCompileError(src)
    expect(err).toMatch(/MDX will not compile/)
  })

  it('passes brace-containing code kept on a single inline-code line', async () => {
    const src = "prose via `editor.addTrack({ type: 'video' })`; more prose."
    expect(await findCompileError(src)).toBeNull()
  })

  it('passes a normal digest body', async () => {
    expect(await findCompileError('# Title\n\nSome **prose** and `inlineCode`.')).toBeNull()
  })
})
