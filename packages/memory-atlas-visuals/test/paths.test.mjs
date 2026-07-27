import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  PACKAGE_ROOT,
  findAtlasConfig,
  readAtlasConfig,
  resolveAtlasPaths,
  resolveVisualsPort,
} from '../scripts/lib/paths.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = path.resolve(__dirname, '..')
const FIXTURE_VAULT = path.join(PKG_ROOT, 'examples', 'minimal-vault')
const FIXTURE_DIAGRAM = path.join(
  PKG_ROOT,
  'files',
  'diagrams',
  '_example-render-loop.excalidraw',
)

const envKeys = ['ATLAS_VAULT', 'ATLAS_VISUALS_ROOT', 'ATLAS_VISUALS_PORT']

afterEach(() => {
  for (const k of envKeys) delete process.env[k]
})

describe('package fixtures', () => {
  it('ships _example-render-loop.excalidraw', () => {
    expect(fs.existsSync(FIXTURE_DIAGRAM)).toBe(true)
    const scene = JSON.parse(fs.readFileSync(FIXTURE_DIAGRAM, 'utf8'))
    expect(scene.type).toBe('excalidraw')
    expect(Array.isArray(scene.elements)).toBe(true)
    expect(scene.elements.length).toBeGreaterThan(0)
  })

  it('ships examples/minimal-vault with atlas.config.json', () => {
    expect(fs.existsSync(path.join(FIXTURE_VAULT, 'atlas.config.json'))).toBe(true)
    expect(fs.existsSync(path.join(FIXTURE_VAULT, 'map', 'index.md'))).toBe(true)
    expect(fs.existsSync(path.join(FIXTURE_VAULT, 'specs', 'hello.md'))).toBe(true)
  })

  it('PACKAGE_ROOT points at this package', () => {
    expect(PACKAGE_ROOT).toBe(PKG_ROOT)
    expect(fs.existsSync(path.join(PACKAGE_ROOT, 'package.json'))).toBe(true)
  })
})

describe('findAtlasConfig / readAtlasConfig', () => {
  it('finds config under minimal-vault', () => {
    const cfgPath = findAtlasConfig(path.join(FIXTURE_VAULT, 'specs'))
    expect(cfgPath).toBe(path.join(FIXTURE_VAULT, 'atlas.config.json'))
  })

  it('readAtlasConfig resolves vaultDir "." and visuals tree', () => {
    const cfg = readAtlasConfig(path.join(FIXTURE_VAULT, 'atlas.config.json'))
    expect(cfg).not.toBeNull()
    expect(cfg.vaultDir).toBe(FIXTURE_VAULT)
    expect(cfg.visualsDir).toBe(path.join(FIXTURE_VAULT, 'visuals'))
    expect(cfg.port).toBe(4555)
  })
})

describe('resolveAtlasPaths', () => {
  it('ATLAS_VAULT → vault + visuals under minimal-vault', () => {
    process.env.ATLAS_VAULT = FIXTURE_VAULT
    const paths = resolveAtlasPaths({ cwd: PKG_ROOT, appDir: PKG_ROOT })
    expect(paths.vaultDir).toBe(FIXTURE_VAULT)
    expect(paths.visualsDir).toBe(path.join(FIXTURE_VAULT, 'visuals'))
    expect(paths.illustratedDir).toBe(path.join(FIXTURE_VAULT, 'visuals', 'illustrated'))
    expect(paths.filesDir).toBe(path.join(FIXTURE_VAULT, 'visuals', 'files'))
    expect(paths.source).toMatch(/ATLAS_VAULT/)
    expect(fs.existsSync(paths.visualsDir)).toBe(true)
  })

  it('ATLAS_VISUALS_ROOT overrides visuals root', () => {
    const visuals = path.join(FIXTURE_VAULT, 'visuals')
    process.env.ATLAS_VISUALS_ROOT = visuals
    const paths = resolveAtlasPaths({ cwd: PKG_ROOT, appDir: PKG_ROOT })
    expect(paths.visualsDir).toBe(visuals)
    expect(paths.vaultDir).toBe(FIXTURE_VAULT)
    expect(paths.source).toBe('ATLAS_VISUALS_ROOT')
  })

  it('walks up from fixture cwd without env (vaultDir ".")', () => {
    const paths = resolveAtlasPaths({
      cwd: path.join(FIXTURE_VAULT, 'specs'),
      appDir: PKG_ROOT,
    })
    expect(paths.vaultDir).toBe(FIXTURE_VAULT)
    expect(paths.visualsDir).toBe(path.join(FIXTURE_VAULT, 'visuals'))
    expect(paths.source).toBe('atlas.config.json')
  })

  it('legacy parent-of-app when illustrated/ sits next to appDir', () => {
    const fakeApp = path.join(FIXTURE_VAULT, 'visuals', 'app')
    const paths = resolveAtlasPaths({
      cwd: '/tmp',
      appDir: fakeApp,
    })
    expect(paths.source).toBe('legacy-parent-of-app')
    expect(paths.visualsDir).toBe(path.join(FIXTURE_VAULT, 'visuals'))
    expect(paths.vaultDir).toBe(FIXTURE_VAULT)
  })
})

describe('resolveVisualsPort', () => {
  it('defaults to 4555 from minimal-vault config', () => {
    expect(resolveVisualsPort(FIXTURE_VAULT)).toBe(4555)
  })

  it('ATLAS_VISUALS_PORT wins', () => {
    process.env.ATLAS_VISUALS_PORT = '9999'
    expect(resolveVisualsPort(FIXTURE_VAULT)).toBe(9999)
  })
})
