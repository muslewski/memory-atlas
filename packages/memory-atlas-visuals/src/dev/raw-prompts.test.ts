import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { afterEach, beforeEach, expect, it } from 'vitest'
import {
  deleteRawPrompt,
  formatPrompt,
  listAllRawPrompts,
  listRawPrompts,
  RAW_PROMPTS_DIR,
  updateRawPrompt,
  writeRawPrompt,
} from './raw-prompts'

const cleanup = () => {
  if (fs.existsSync(RAW_PROMPTS_DIR))
    for (const f of fs.readdirSync(RAW_PROMPTS_DIR))
      if (f.startsWith('2099-')) fs.rmSync(path.join(RAW_PROMPTS_DIR, f))
}
beforeEach(cleanup)
afterEach(cleanup)

it('formats a ready prompt with the @-source lead line', () => {
  const out = formatPrompt('ideas/x.md', 'my thought')
  expect(out).toBe('Written while looking at: @syndcast-mind/ideas/x.md\n\nmy thought')
})

it('writes a file with correct frontmatter + lead line', () => {
  const now = new Date('2099-01-02T03:04:05.000Z')
  const { path: rel } = writeRawPrompt({
    source: 'ideas/community-library.md',
    route: '/ideas/community-library',
    title: 'note',
    body: 'hello',
    now,
  })
  expect(rel.startsWith('raw-prompts/2099-01-02-community-library-')).toBe(true)
  const parsed = matter(fs.readFileSync(path.join(RAW_PROMPTS_DIR, '..', rel), 'utf8'))
  expect(parsed.data.source).toBe('ideas/community-library.md')
  expect(parsed.data.route).toBe('/ideas/community-library')
  expect(parsed.data.title).toBe('note')
  expect(
    parsed.content
      .trim()
      .startsWith('Written while looking at: @syndcast-mind/ideas/community-library.md'),
  ).toBe(true)
})

it('lists only matching-source prompts, newest first', () => {
  const longBody = 'x'.repeat(200)
  writeRawPrompt({
    source: 'ideas/a.md',
    route: '/ideas/a',
    body: 'older',
    now: new Date('2099-01-01T00:00:00Z'),
  })
  writeRawPrompt({
    source: 'ideas/a.md',
    route: '/ideas/a',
    body: longBody,
    now: new Date('2099-01-03T00:00:00Z'),
  })
  writeRawPrompt({
    source: 'ideas/b.md',
    route: '/ideas/b',
    body: 'other',
    now: new Date('2099-01-02T00:00:00Z'),
  })
  const list = listRawPrompts('ideas/a.md')
  expect(list.map((e) => e.preview)).toEqual([longBody.slice(0, 140), 'older'])
  expect(list[0].body).toBe(longBody)
  expect(list[0].preview.length).toBeLessThanOrEqual(140)
})

it('does not overwrite when two prompts share a timestamp', () => {
  const now = new Date('2099-07-01T00:00:00Z')
  const a = writeRawPrompt({ source: 'ideas/c.md', route: '/ideas/c', body: 'first', now })
  const b = writeRawPrompt({ source: 'ideas/c.md', route: '/ideas/c', body: 'second', now })
  expect(a.path).not.toBe(b.path)
  expect(listRawPrompts('ideas/c.md').length).toBe(2)
})

it('listAllRawPrompts returns every source with source+route, newest first', () => {
  writeRawPrompt({
    source: 'ideas/a.md',
    route: '/ideas/a',
    body: 'a-old',
    now: new Date('2099-02-01T00:00:00Z'),
  })
  writeRawPrompt({
    source: 'specs/b.md',
    route: '/specs/b',
    body: 'b-new',
    now: new Date('2099-02-03T00:00:00Z'),
  })
  const all = listAllRawPrompts().filter((c) => c.created.startsWith('2099-02'))
  expect(all.map((c) => c.source)).toEqual(['specs/b.md', 'ideas/a.md'])
  expect(all[0].route).toBe('/specs/b')
  expect(all[0].body).toBe('b-new')
})

it('rejects a traversal source', () => {
  expect(() =>
    writeRawPrompt({
      source: '../../etc/passwd',
      route: '/x',
      body: 'x',
      now: new Date('2099-01-01T00:00:00Z'),
    }),
  ).toThrow()
})

it('updateRawPrompt preserves source/route/created and updates title+body', () => {
  const now = new Date('2099-06-01T00:00:00Z')
  const { path: rel } = writeRawPrompt({
    source: 'ideas/u.md',
    route: '/ideas/u',
    title: 'old title',
    body: 'old body',
    now,
  })
  const file = path.basename(rel)
  const originalCreated = matter(fs.readFileSync(path.join(RAW_PROMPTS_DIR, file), 'utf8')).data
    .created

  updateRawPrompt(file, { title: 'new title', body: 'new body' })

  const parsed = matter(fs.readFileSync(path.join(RAW_PROMPTS_DIR, file), 'utf8'))
  expect(parsed.data.source).toBe('ideas/u.md')
  expect(parsed.data.route).toBe('/ideas/u')
  expect(parsed.data.created).toBe(originalCreated)
  expect(parsed.data.title).toBe('new title')
  expect(
    parsed.content.trim().startsWith('Written while looking at: @syndcast-mind/ideas/u.md'),
  ).toBe(true)
  const body = parsed.content.replace(/^Written while looking at:.*$/m, '').trim()
  expect(body).toBe('new body')
})

it('updateRawPrompt with blank title removes the title key', () => {
  const now = new Date('2099-06-02T00:00:00Z')
  const { path: rel } = writeRawPrompt({
    source: 'ideas/v.md',
    route: '/ideas/v',
    title: 'some title',
    body: 'body',
    now,
  })
  const file = path.basename(rel)

  updateRawPrompt(file, { title: '', body: 'updated body' })

  const parsed = matter(fs.readFileSync(path.join(RAW_PROMPTS_DIR, file), 'utf8'))
  expect(parsed.data.title).toBeUndefined()
})

it('updateRawPrompt rejects unsafe file names', () => {
  expect(() => updateRawPrompt('', { body: 'x' })).toThrow()
  expect(() => updateRawPrompt('../x.md', { body: 'x' })).toThrow()
  expect(() => updateRawPrompt('a/b.md', { body: 'x' })).toThrow()
  expect(() => updateRawPrompt('x.txt', { body: 'x' })).toThrow()
})

it('updateRawPrompt throws on nonexistent file', () => {
  expect(() => updateRawPrompt('2099-missing.md', { body: 'x' })).toThrow()
})

it('deleteRawPrompt removes the file and is no longer listed', () => {
  const now = new Date('2099-06-03T00:00:00Z')
  const { path: rel } = writeRawPrompt({
    source: 'ideas/d.md',
    route: '/ideas/d',
    body: 'to delete',
    now,
  })
  const file = path.basename(rel)

  expect(listRawPrompts('ideas/d.md').length).toBe(1)
  deleteRawPrompt(file)
  expect(fs.existsSync(path.join(RAW_PROMPTS_DIR, file))).toBe(false)
  expect(listRawPrompts('ideas/d.md').length).toBe(0)
})

it('deleteRawPrompt rejects unsafe or nonexistent file names', () => {
  expect(() => deleteRawPrompt('')).toThrow()
  expect(() => deleteRawPrompt('../x.md')).toThrow()
  expect(() => deleteRawPrompt('2099-missing.md')).toThrow()
})
