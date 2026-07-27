import { defineConfig, type PluginOption } from 'vite'
import { writeRawPrompt, listRawPrompts, listAllRawPrompts, updateRawPrompt, deleteRawPrompt } from './src/dev/raw-prompts'
import { resolve, sep } from 'node:path'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import tailwindcss from '@tailwindcss/vite'
import { resolveAtlasPaths, resolveVisualsPort, isUnder } from './scripts/lib/paths.mjs'

const atlasPaths = resolveAtlasPaths({ appDir: resolve(__dirname) })
const visualsPort = resolveVisualsPort({ cwd: process.cwd() })

// Digests AND the assets they reference live OUTSIDE app/ — ../illustrated/<skin>/<folder>/*.mdx,
// ../files/stocks/*.jpg, ../files/diagrams/*.excalidraw — so Vite's default watcher, rooted at
// app/, never sees a newly-added one. Three boot-time import.meta.globs then stay stale:
//   src/lib/mdx.ts       → a digest added mid-session 404s ("No MDX module found")
//   src/lib/heroes.ts    → resolveHero() returns null, so the hero banner silently vanishes
//   src/lib/diagrams.ts  → resolveDiagram() returns null → "diagram not found"
// The hero/diagram failures are SILENT, which is why they outlived the .mdx-only version of
// this plugin. On any add/unlink under a watched root we invalidate the glob owner that claims
// the extension and full-reload, so the glob re-scans — no restart needed. Production builds
// are unaffected: Rollup evaluates every glob at build time.
const GLOB_OWNERS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\.mdx$/, 'src/lib/mdx.ts'],
  [/\.(jpg|jpeg|png|webp|avif)$/, 'src/lib/heroes.ts'],
  [/\.(excalidraw|svg)$/, 'src/lib/diagrams.ts'],
]

/**
 * When the gallery runs from node_modules, relative ../../../files globs resolve
 * inside the package — never the consumer vault. Rewrite those globs to absolute
 * paths under ATLAS_VISUALS_ROOT (atlasPaths) so digests/diagrams/heroes load.
 * In-tree layout (visuals/app next to files/) keeps working: absolute paths still valid.
 */
function rewriteContentGlobs(): PluginOption {
  const files = atlasPaths.filesDir.replace(/\\/g, '/')
  const visuals = atlasPaths.visualsDir.replace(/\\/g, '/')
  const targets = ['/src/lib/diagrams.ts', '/src/lib/heroes.ts', '/src/lib/mdx.ts']
  return {
    name: 'atlas-rewrite-content-globs',
    enforce: 'pre',
    transform(code, id) {
      const norm = id.replace(/\\/g, '/')
      if (!targets.some((t) => norm.endsWith(t))) return null
      let out = code
      // diagrams + heroes
      out = out.replaceAll(
        "'../../../files/diagrams/**/*.excalidraw'",
        `'${files}/diagrams/**/*.excalidraw'`,
      )
      out = out.replaceAll(
        "'../../../files/diagrams/**/*.svg'",
        `'${files}/diagrams/**/*.svg'`,
      )
      out = out.replaceAll(
        "'../../../files/**/*.{jpg,jpeg,png,webp,avif}'",
        `'${files}/**/*.{jpg,jpeg,png,webp,avif}'`,
      )
      // mdx: all digests under visuals root (illustrated lives there)
      out = out.replaceAll(
        "['../../../**/*.mdx', '!../../../app/**']",
        `['${visuals}/**/*.mdx']`,
      )
      if (out === code) return null
      return { code: out, map: null }
    },
  }
}

function watchExternalSources(): PluginOption {
  const roots = [atlasPaths.illustratedDir, atlasPaths.filesDir]
  return {
    name: 'watch-external-sources',
    apply: 'serve',
    configureServer(server) {
      for (const root of roots) server.watcher.add(root)
      const reglob = (file: string, verb: string) => {
        // The watcher also covers app/ itself; only external adds can invalidate a glob
        // whose keys point outside app/. Without this an app-internal .svg would reload the page.
        if (!roots.some((r) => file.startsWith(r + sep))) return
        const owner = GLOB_OWNERS.find(([re]) => re.test(file))?.[1]
        if (!owner) return
        const mod = server.moduleGraph.getModuleById(resolve(__dirname, owner))
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
        server.config.logger.info(`[watch] ${verb} ${file} → re-glob ${owner} + reload`)
      }
      server.watcher.on('add', (f) => reglob(f, 'added'))
      server.watcher.on('unlink', (f) => reglob(f, 'removed'))

      server.middlewares.use('/api/raw-prompt', (req, res, next) => {
        if (req.method === 'POST') {
          let raw = ''
          req.on('data', (c) => (raw += c))
          req.on('end', () => {
            try {
              const { source, route, title, body } = JSON.parse(raw || '{}')
              if (!source || !body) { res.statusCode = 400; res.setHeader('content-type', 'text/plain'); return res.end('source and body required') }
              const out = writeRawPrompt({ source, route: route ?? '', title, body, now: new Date() })
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify(out))
            } catch (e) {
              res.statusCode = 500
              res.setHeader('content-type', 'text/plain')
              res.end(e instanceof Error ? e.message : 'write failed')
            }
          })
        } else if (req.method === 'PUT') {
          let raw = ''
          req.on('data', (c) => (raw += c))
          req.on('end', () => {
            try {
              const { file, title, body } = JSON.parse(raw || '{}')
              if (!file || !body) { res.statusCode = 400; res.setHeader('content-type', 'text/plain'); return res.end('file and body required') }
              const out = updateRawPrompt(file, { title, body })
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify(out))
            } catch (e) {
              res.statusCode = 500
              res.setHeader('content-type', 'text/plain')
              res.end(e instanceof Error ? e.message : 'update failed')
            }
          })
        } else if (req.method === 'DELETE') {
          try {
            const file = new URL(req.url ?? '', 'http://x').searchParams.get('file') ?? ''
            if (!file) { res.statusCode = 400; res.setHeader('content-type', 'text/plain'); return res.end('file required') }
            deleteRawPrompt(file)
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('content-type', 'text/plain')
            res.end(e instanceof Error ? e.message : 'delete failed')
          }
        } else {
          return next()
        }
      })

      server.middlewares.use('/api/raw-prompts', (req, res, next) => {
        if (req.method !== 'GET') return next()
        const source = new URL(req.url ?? '', 'http://x').searchParams.get('source') ?? ''
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(source ? listRawPrompts(source) : listAllRawPrompts()))
      })
    },
  }
}

export default defineConfig({
  // The .mdx digests live one level up (../ideas, ../tech-debt, ...). Allow Vite to read them.
  // NO providerImportSource: that would make every compiled .mdx inject a bare
  // `import {useMDXComponents} from '@mdx-js/react'`, which Rollup cannot resolve
  // from a file outside app/. Instead the kit's element overrides are handed to
  // each digest via the `components` prop at the single render site (MdxBody);
  // the named primitives resolve through each digest's own `import … from '@/kit'`.
  // remark-frontmatter parses the leading `---` YAML so it is NOT rendered as a
  // stray setext heading; remark-mdx-frontmatter re-exports it as a `frontmatter`
  // const so digests can read `frontmatter.source` / `.commit` / `.hero` in JSX.
  // NB: `tsconfig.node.json` redirects this config's tsc output to node_modules
  // so it never emits a stale `vite.config.js` that would shadow this .ts file.
  // `mdExtensions: []` — process ONLY .mdx, NOT .md. @mdx-js/rollup defaults to
  // BOTH, which would compile the source `.md` notes into MDX modules and make the
  // `?raw` glob in SourceView return an MDX component (no string default → undefined),
  // breaking the markdown reader. Digests are .mdx; source notes stay raw text.
  plugins: [
    rewriteContentGlobs(),
    tailwindcss(),
    { enforce: 'pre', ...mdx({ mdExtensions: [], remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter] }) },
    react(),
    watchExternalSources(),
  ],
  // The digests sit OUTSIDE app/, so the bare imports left in the compiled output
  // — `@/kit` and the auto-JSX `react/jsx-runtime` — cannot be resolved by walking
  // up from visuals/<folder>/. Anchor them to THIS app's tree so every digest
  // resolves against one React instance, in both dev and the Rollup build.
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: resolve(__dirname, 'src') + '/$1' },
      { find: /^react\/jsx-runtime$/, replacement: resolve(__dirname, 'node_modules/react/jsx-runtime.js') },
      { find: /^react\/jsx-dev-runtime$/, replacement: resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js') },
    ],
  },
  server: {
    port: visualsPort,
    // Bind ALL interfaces (incl. IPv4 127.0.0.1), not just localhost. Vite's default
    // `localhost` can resolve to IPv6 `[::1]` only on some systems → an IPv4 SSH tunnel
    // (`-L 4555:localhost:4555`) then gets connection-refused and the page won't load.
    host: true,
    fs: { allow: [atlasPaths.vaultDir, atlasPaths.visualsDir, __dirname, '..', '../..'] },
  },
  preview: {
    port: visualsPort,
    host: true,
  },
  // __VAULT_DIR__ = absolute path to syndcast-mind/ (two levels up from app/)
  // Used by Snapshot.tsx buildSourceLink to construct /@fs/<abs>/<source> dev links.
  define: {
    __VAULT_DIR__: JSON.stringify(atlasPaths.vaultDir),
    __VISUALS_DIR__: JSON.stringify(atlasPaths.visualsDir),
  },
  // Test config (jsdom env) lives in vitest.config.ts — keeping it out of this file
  // avoids typing Vite's defineConfig with vitest's `test` block (version skew).
})
