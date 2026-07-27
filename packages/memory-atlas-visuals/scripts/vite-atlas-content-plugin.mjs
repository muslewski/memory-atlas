/**
 * Vite plugin: inject consumer-vault diagrams/heroes/mdx into the package app.
 *
 * Why not only rewrite import.meta.glob to absolute paths?
 * In practice Vite/Rollup often yields empty maps for globs outside the package
 * root when the app lives in node_modules. Virtual modules + fs walk are reliable.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

function walk(dir, pred, acc = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return acc
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, pred, acc)
    else if (pred(e.name, p)) acc.push(p)
  }
  return acc
}

/**
 * @param {{ visualsDir: string, filesDir: string, illustratedDir: string }} paths
 * @returns {import('vite').Plugin}
 */
export function atlasContentPlugin(paths) {
  const filesDir = paths.filesDir
  const illustratedDir = paths.illustratedDir
  const diagramsDir = join(filesDir, 'diagrams')

  const V_DIAG = '\0virtual:atlas-diagrams'
  const V_SVG = '\0virtual:atlas-diagram-svgs'
  const V_HERO = '\0virtual:atlas-heroes'
  const V_MDX = '\0virtual:atlas-mdx-loaders'

  return {
    name: 'atlas-content-virtuals',
    enforce: 'pre',
    configResolved(config) {
      const n = walk(diagramsDir, (name) => name.endsWith('.excalidraw')).length
      config.logger.info(
        `[atlas-content] vault diagrams=${n} dir=${diagramsDir}`,
      )
    },
    resolveId(id) {
      if (id === 'virtual:atlas-diagrams') return V_DIAG
      if (id === 'virtual:atlas-diagram-svgs') return V_SVG
      if (id === 'virtual:atlas-heroes') return V_HERO
      if (id === 'virtual:atlas-mdx-loaders') return V_MDX
      return null
    },
    load(id) {
      if (id === V_DIAG) {
        const files = walk(diagramsDir, (name) => name.endsWith('.excalidraw'))
        const entries = files.map((abs) => {
          const rel = 'files/diagrams/' + relative(diagramsDir, abs).replace(/\\/g, '/')
          const text = readFileSync(abs, 'utf8')
          return `  ${JSON.stringify(rel)}: ${JSON.stringify(text)}`
        })
        return `export default {\n${entries.join(',\n')}\n}\n`
      }
      if (id === V_SVG) {
        const files = walk(diagramsDir, (name) => name.endsWith('.svg'))
        const entries = files.map((abs) => {
          const rel = 'files/diagrams/' + relative(diagramsDir, abs).replace(/\\/g, '/')
          const text = readFileSync(abs, 'utf8')
          return `  ${JSON.stringify(rel)}: ${JSON.stringify(text)}`
        })
        return `export default {\n${entries.join(',\n')}\n}\n`
      }
      if (id === V_HERO) {
        // Eager URL imports via absolute path strings Vite can resolve
        const files = walk(filesDir, (name) =>
          /\.(jpe?g|png|webp|avif)$/i.test(name),
        )
        const imports = []
        const mapLines = []
        files.forEach((abs, i) => {
          const rel = 'files/' + relative(filesDir, abs).replace(/\\/g, '/')
          const varName = `_h${i}`
          // Vite needs /@fs/ for absolute assets outside root
          const fsUrl = '/@fs/' + abs
          imports.push(`import ${varName} from ${JSON.stringify(fsUrl)}`)
          mapLines.push(`  ${JSON.stringify(rel)}: ${varName}`)
        })
        return `${imports.join('\n')}\nexport default {\n${mapLines.join(',\n')}\n}\n`
      }
      if (id === V_MDX) {
        const files = walk(illustratedDir, (name) => name.endsWith('.mdx'))
        const imports = []
        const mapLines = []
        files.forEach((abs, i) => {
          const rel = 'illustrated/' + relative(illustratedDir, abs).replace(/\\/g, '/')
          const varName = `_m${i}`
          const fsUrl = '/@fs/' + abs
          // lazy dynamic import for code-splitting
          mapLines.push(
            `  ${JSON.stringify(rel)}: () => import(${JSON.stringify(fsUrl)})`,
          )
        })
        return `export default {\n${mapLines.join(',\n')}\n}\n`
      }
      return null
    },
  }
}
