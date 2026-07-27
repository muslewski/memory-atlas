import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

const DIR = path.dirname(fileURLToPath(import.meta.url)) // app/src/dev
// app/src/dev → app/src → app → visuals → syndcast-mind
export const VAULT_DIR = path.resolve(DIR, '../../../..')
export const RAW_PROMPTS_DIR = path.join(VAULT_DIR, 'raw-prompts')

const isSafeSource = (s: string) => !!s && !path.isAbsolute(s) && !s.split(/[\\/]/).includes('..')
export const isSafeFile = (f: string) =>
  !!f && !f.includes('/') && !f.includes('\\') && !f.includes('..') && f.endsWith('.md')
const slugOf = (source: string) =>
  path
    .basename(source)
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .toLowerCase()
const shortId = (now: Date) => now.getTime().toString(36).slice(-5)

export function formatPrompt(source: string, body: string): string {
  return `Written while looking at: @syndcast-mind/${source}\n\n${body}`
}

export function writeRawPrompt(input: {
  source: string
  route: string
  title?: string
  body: string
  now: Date
}): { path: string } {
  if (!isSafeSource(input.source)) throw new Error(`unsafe source: ${input.source}`)
  fs.mkdirSync(RAW_PROMPTS_DIR, { recursive: true })
  const date = input.now.toISOString().slice(0, 10)
  // shortId is millisecond-precision; two notes saved in the same ms would collide
  // and silently overwrite. Bump a suffix until the name is free — never lose a note.
  const base = `${date}-${slugOf(input.source)}-${shortId(input.now)}`
  let file = `${base}.md`
  for (let n = 2; fs.existsSync(path.join(RAW_PROMPTS_DIR, file)); n++) file = `${base}-${n}.md`
  const data: Record<string, unknown> = {
    source: input.source,
    route: input.route,
    created: input.now.toISOString(),
  }
  if (input.title) data.title = input.title
  const content = formatPrompt(input.source, input.body)
  fs.writeFileSync(path.join(RAW_PROMPTS_DIR, file), matter.stringify(content, data))
  return { path: `raw-prompts/${file}` }
}

export function updateRawPrompt(
  file: string,
  patch: { title?: string; body: string },
): { path: string } {
  if (!isSafeFile(file)) throw new Error(`unsafe file: ${file}`)
  const filePath = path.join(RAW_PROMPTS_DIR, file)
  if (!fs.existsSync(filePath)) throw new Error(`not found: ${file}`)
  const parsed = matter(fs.readFileSync(filePath, 'utf8'))
  const data: Record<string, unknown> = {
    source: parsed.data.source,
    route: parsed.data.route,
    created: parsed.data.created,
  }
  if (patch.title) data.title = patch.title
  const content = formatPrompt(String(parsed.data.source), patch.body)
  fs.writeFileSync(filePath, matter.stringify(content, data))
  return { path: `raw-prompts/${file}` }
}

export function deleteRawPrompt(file: string): void {
  if (!isSafeFile(file)) throw new Error(`unsafe file: ${file}`)
  const filePath = path.join(RAW_PROMPTS_DIR, file)
  if (!fs.existsSync(filePath)) throw new Error(`not found: ${file}`)
  fs.unlinkSync(filePath)
}

// Every comment across all sources — for the Comments index page. Carries source + route
// so the page can group by note and link back to each digest.
export function listAllRawPrompts(): {
  file: string
  source: string
  route: string
  created: string
  title: string
  preview: string
  body: string
}[] {
  if (!fs.existsSync(RAW_PROMPTS_DIR)) return []
  const out: ReturnType<typeof listAllRawPrompts> = []
  for (const file of fs.readdirSync(RAW_PROMPTS_DIR)) {
    if (!file.endsWith('.md')) continue
    const parsed = matter(fs.readFileSync(path.join(RAW_PROMPTS_DIR, file), 'utf8'))
    const body = parsed.content.replace(/^Written while looking at:.*$/m, '').trim()
    out.push({
      file,
      source: String(parsed.data.source ?? ''),
      route: String(parsed.data.route ?? ''),
      created: String(parsed.data.created ?? ''),
      title: String(parsed.data.title ?? ''),
      preview: body.slice(0, 140),
      body,
    })
  }
  return out.sort((a, b) => b.created.localeCompare(a.created))
}

export function listRawPrompts(
  source: string,
): { file: string; created: string; title: string; preview: string; body: string }[] {
  if (!fs.existsSync(RAW_PROMPTS_DIR)) return []
  const out: { file: string; created: string; title: string; preview: string; body: string }[] = []
  for (const file of fs.readdirSync(RAW_PROMPTS_DIR)) {
    if (!file.endsWith('.md')) continue
    const parsed = matter(fs.readFileSync(path.join(RAW_PROMPTS_DIR, file), 'utf8'))
    if (parsed.data.source !== source) continue
    const body = parsed.content.replace(/^Written while looking at:.*$/m, '').trim()
    out.push({
      file,
      created: String(parsed.data.created ?? ''),
      title: String(parsed.data.title ?? ''),
      preview: body.slice(0, 140),
      body,
    })
  }
  return out.sort((a, b) => b.created.localeCompare(a.created))
}
