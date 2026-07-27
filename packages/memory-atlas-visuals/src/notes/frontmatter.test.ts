import { describe, expect, it } from 'vitest'
import { parseFrontmatter } from './frontmatter'

describe('parseFrontmatter', () => {
  it('splits a leading --- block and parses scalars', () => {
    const raw = `---\ntitle: Auth\ntype: zone\nstatus: verified\ndate: 2026-06-11\n---\n# Auth\nbody`
    const { data, body } = parseFrontmatter(raw)
    expect(data).toEqual({ title: 'Auth', type: 'zone', status: 'verified', date: '2026-06-11' })
    expect(body).toBe('# Auth\nbody')
  })
  it('parses inline and block tag lists', () => {
    expect(parseFrontmatter(`---\ntags: [a, b, c]\n---\nx`).data.tags).toEqual(['a', 'b', 'c'])
    expect(parseFrontmatter(`---\ntags:\n  - a\n  - b\n---\nx`).data.tags).toEqual(['a', 'b'])
  })
  it('strips wrapping quotes from scalar values', () => {
    expect(parseFrontmatter(`---\ntitle: "The Set — lifecycle"\n---\nx`).data.title).toBe(
      'The Set — lifecycle',
    )
  })
  it('returns body unchanged when there is no frontmatter', () => {
    expect(parseFrontmatter('# Just a note\ntext')).toEqual({
      data: {},
      body: '# Just a note\ntext',
    })
  })
  it('does not treat a --- later in the body as frontmatter', () => {
    const raw = `# Title\nsome text\n---\nmore`
    expect(parseFrontmatter(raw).data).toEqual({})
    expect(parseFrontmatter(raw).body).toBe(raw)
  })
  it('tolerates CRLF line endings (Windows-saved notes)', () => {
    const raw = '---\r\ntitle: Auth\r\ntags: [a, b]\r\n---\r\n# Auth\r\nbody'
    const { data, body } = parseFrontmatter(raw)
    expect(data.title).toBe('Auth')
    expect(data.tags).toEqual(['a', 'b'])
    expect(body.startsWith('# Auth')).toBe(true)
  })
  it('ignores keys it does not surface', () => {
    const { data } = parseFrontmatter(`---\ntitle: X\nprogram: the-set\n---\nb`)
    expect(data).toEqual({ title: 'X' })
  })
})
