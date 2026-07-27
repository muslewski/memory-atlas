import { resolvePixabayKey, resolveAtlasPaths } from './lib/paths.mjs'
#!/usr/bin/env tsx
/**
 * fetch-stock.ts — idempotent Pixabay hero fetcher
 * Usage: tsx scripts/fetch-stock.ts "<query>"
 * Run from syndcast-mind/visuals/app/
 *
 * Reads PIXABAY_API_KEY from env, then falls back to parsing
 * .env / .env.local at the repo root (4 levels up from app/scripts/).
 */

import { createWriteStream, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Key resolution ──────────────────────────────────────────────────────────

async function resolveApiKey(): Promise<string | null> {
  if (process.env.PIXABAY_API_KEY) return process.env.PIXABAY_API_KEY

  // Repo root is 4 levels up: app/scripts/ → app/ → visuals/ → syndcast-mind/ → repo-root
  const repoRoot = join(__dirname, '..', '..', '..', '..')
  for (const filename of ['.env.local', '.env']) {
    const envPath = join(repoRoot, filename)
    if (!existsSync(envPath)) continue
    try {
      const text = await readFile(envPath, 'utf8')
      for (const line of text.split('\n')) {
        const m = line.match(/^PIXABAY_API_KEY\s*=\s*"?([^"\s]+)"?/)
        if (m) return m[1]
      }
    } catch {
      // ignore unreadable env files
    }
  }
  return null
}

// ── Output dir ──────────────────────────────────────────────────────────────

// From app/scripts/ the output dir is ../../files/stocks/
const OUT_DIR = join(__dirname, '..', '..', 'files', 'stocks')

// ── Main ────────────────────────────────────────────────────────────────────

interface PixabayHit {
  id: number
  user: string
  pageURL: string
  tags: string
  largeImageURL?: string
  webformatURL?: string
}

const query = process.argv[2]
if (!query) {
  console.error('Usage: tsx scripts/fetch-stock.ts "<query>"')
  process.exit(1)
}

const apiKey = await resolveApiKey()
if (!apiKey) {
  console.log(JSON.stringify({ error: 'no PIXABAY_API_KEY' }))
  process.exit(0)
}

const url =
  `https://pixabay.com/api/?key=${encodeURIComponent(apiKey)}` +
  `&q=${encodeURIComponent(query)}` +
  `&image_type=photo&orientation=horizontal&per_page=3&safesearch=true`

let hits: PixabayHit[]
try {
  const res = await fetch(url)
  if (!res.ok) {
    console.log(JSON.stringify({ error: `pixabay HTTP ${res.status}` }))
    process.exit(0)
  }
  const data = (await res.json()) as { hits?: PixabayHit[] }
  hits = data.hits ?? []
} catch (err) {
  console.log(JSON.stringify({ error: String(err) }))
  process.exit(0)
}

if (!hits.length) {
  console.log(JSON.stringify({ error: `no results for ${query}` }))
  process.exit(0)
}

const hit = hits[0]
const { id, user, pageURL, tags, largeImageURL, webformatURL } = hit
const imageURL = largeImageURL || webformatURL

mkdirSync(OUT_DIR, { recursive: true })

const jpgPath = join(OUT_DIR, `${id}.jpg`)
const jsonPath = join(OUT_DIR, `${id}.json`)

// Idempotent — skip download if already present
if (!existsSync(jpgPath)) {
  // biome-ignore lint/style/noNonNullAssertion: imageURL is asserted non-null by the preceding existence check
  const imgRes = await fetch(imageURL!)
  if (!imgRes.ok || !imgRes.body) {
    console.log(JSON.stringify({ error: `image download HTTP ${imgRes.status}` }))
    process.exit(0)
  }
  await pipeline(imgRes.body as NodeJS.ReadableStream, createWriteStream(jpgPath))
}

// Always refresh the sidecar JSON
writeFileSync(jsonPath, JSON.stringify({ id, user, pageURL, tags }, null, 2))

// Relative path suitable for MDX hero frontmatter
const relFile = `files/stocks/${id}.jpg`
console.log(JSON.stringify({ id, file: relFile, user, pageURL, tags }))
