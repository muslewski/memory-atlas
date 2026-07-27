import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { runInit } from '../lib/init.mjs'
import {
  resolvePeerPackage,
  resolveVisualsPaths,
  runVisuals,
} from '../lib/visuals.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const tmpDirs = []

function mkRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-visuals-'))
  fs.mkdirSync(path.join(dir, '.git'))
  tmpDirs.push(dir)
  return dir
}

function silentIo() {
  const out = []
  const err = []
  return {
    stdout: { write: (s) => out.push(s) },
    stderr: { write: (s) => err.push(s) },
    out,
    err,
  }
}

function seedVault(repo) {
  runInit([], { cwd: repo, ...silentIo() })
  return path.join(repo, `${path.basename(repo)}-atlas`)
}

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('resolveVisualsPaths', () => {
  test('returns absolute vault-relative paths from config defaults', () => {
    const repo = mkRepo()
    const vault = path.join(repo, 'demo-atlas')
    const paths = resolveVisualsPaths(repo, vault, {
      visuals: {
        enabled: false,
        dir: 'visuals',
        package: 'memory-atlas-visuals',
        configFile: 'visuals/visuals.config.json',
        illustrated: 'visuals/illustrated',
        files: 'visuals/files',
      },
    })

    assert.equal(paths.visualsDir, path.join(vault, 'visuals'))
    assert.equal(paths.illustratedDefaultDir, path.join(vault, 'visuals', 'illustrated', 'default'))
    assert.equal(paths.diagramsDir, path.join(vault, 'visuals', 'files', 'diagrams'))
    assert.equal(paths.stocksDir, path.join(vault, 'visuals', 'files', 'stocks'))
    assert.equal(paths.configFile, path.join(vault, 'visuals', 'visuals.config.json'))
    assert.equal(paths.atlasConfigFile, path.join(repo, 'atlas.config.json'))
    assert.equal(paths.packageName, 'memory-atlas-visuals')
  })
})

describe('runVisuals init', () => {
  test('dry-run (no --write) prints would-create and writes nothing', () => {
    const repo = mkRepo()
    const vault = seedVault(repo)
    const io = silentIo()

    const code = runVisuals(['init'], { cwd: repo, ...io })

    assert.equal(code, 0)
    assert.ok(io.out.some((line) => line.includes('would create:')))
    assert.ok(io.out.some((line) => line.includes('dry-run')))
    assert.ok(!fs.existsSync(path.join(vault, 'visuals')))
    const cfg = JSON.parse(fs.readFileSync(path.join(repo, 'atlas.config.json'), 'utf8'))
    assert.equal(cfg.visuals?.enabled, false)
  })

  test('--write creates tree, gitkeeps, config, README, and patches enabled', () => {
    const repo = mkRepo()
    const vault = seedVault(repo)
    const io = silentIo()

    // Preserve sibling visuals keys so patch must not wipe them
    const cfgPath = path.join(repo, 'atlas.config.json')
    const before = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
    before.profile = 'code'
    before.visuals = { ...(before.visuals || {}), port: 4555, enabled: false }
    fs.writeFileSync(cfgPath, `${JSON.stringify(before, null, 2)}\n`)

    const code = runVisuals(['init', '--write'], { cwd: repo, ...io })

    assert.equal(code, 0)
    assert.ok(io.out.some((line) => line.includes('created:')))

    for (const rel of [
      path.join('visuals', 'illustrated', 'default', '.gitkeep'),
      path.join('visuals', 'files', 'diagrams', '.gitkeep'),
      path.join('visuals', 'files', 'stocks', '.gitkeep'),
      path.join('visuals', 'visuals.config.json'),
      path.join('visuals', 'README.md'),
    ]) {
      assert.ok(fs.existsSync(path.join(vault, rel)), `${rel} should exist`)
    }

    const vcfg = JSON.parse(
      fs.readFileSync(path.join(vault, 'visuals', 'visuals.config.json'), 'utf8'),
    )
    assert.deepEqual(vcfg.skins, ['default'])
    assert.equal(vcfg.defaultSkin, 'default')
    assert.equal(vcfg.content.mode, 'single')
    assert.ok('features' in vcfg)
    assert.ok('motion' in vcfg)

    const readme = fs.readFileSync(path.join(vault, 'visuals', 'README.md'), 'utf8')
    assert.ok(readme.includes('memory-atlas-visuals'))

    const after = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
    assert.equal(after.visuals.enabled, true)
    assert.equal(after.visuals.port, 4555)
    assert.equal(after.profile, 'code')
  })

  test('--write is idempotent: re-run skips existing files', () => {
    const repo = mkRepo()
    seedVault(repo)
    runVisuals(['init', '--write'], { cwd: repo, ...silentIo() })

    const io = silentIo()
    const code = runVisuals(['init', '--write'], { cwd: repo, ...io })

    assert.equal(code, 0)
    assert.ok(io.out.some((line) => line.includes('exists, skipping:')))
    assert.ok(io.out.every((line) => !line.startsWith('created:')))
  })

  test('init without vault exits 1', () => {
    const repo = mkRepo()
    const io = silentIo()
    const code = runVisuals(['init'], { cwd: repo, ...io })
    assert.equal(code, 1)
    assert.ok(io.err.some((line) => line.includes('no Atlas vault')))
  })
})

describe('runVisuals status', () => {
  test('reports enabled, dir, peer miss, and content counts after init', () => {
    const repo = mkRepo()
    const vault = seedVault(repo)
    runVisuals(['init', '--write'], { cwd: repo, ...silentIo() })

    // drop a non-gitkeep file so counts are non-zero
    fs.writeFileSync(path.join(vault, 'visuals', 'files', 'diagrams', 'a.excalidraw'), '{}')

    const io = silentIo()
    const code = runVisuals(['status'], { cwd: repo, ...io })

    assert.equal(code, 0)
    const text = io.out.join('')
    assert.match(text, /enabled=true/)
    assert.match(text, /peer=memory-atlas-visuals \(not installed\)/)
    assert.match(text, /diagrams=1/)
  })
})

describe('runVisuals dev/preview', () => {
  test('exits 1 with install hint when peer is missing', () => {
    const repo = mkRepo()
    seedVault(repo)
    const io = silentIo()

    const code = runVisuals(['dev'], { cwd: repo, ...io })

    assert.equal(code, 1)
    assert.ok(io.err.some((line) => line.includes('not found')))
    assert.ok(io.err.some((line) => line.includes('npm i -D memory-atlas-visuals')))
  })

  test('spawns peer bin when present', () => {
    const repo = mkRepo()
    seedVault(repo)

    // Fake peer package under node_modules
    const peerRoot = path.join(repo, 'node_modules', 'memory-atlas-visuals')
    fs.mkdirSync(path.join(peerRoot, 'bin'), { recursive: true })
    fs.writeFileSync(
      path.join(peerRoot, 'package.json'),
      JSON.stringify({
        name: 'memory-atlas-visuals',
        version: '9.9.9',
        bin: { 'atlas-visuals': 'bin/atlas-visuals.mjs' },
      }),
    )
    fs.writeFileSync(path.join(peerRoot, 'bin', 'atlas-visuals.mjs'), '#!/usr/bin/env node\n')
    // createRequire needs a package.json at repo root for path resolution context
    if (!fs.existsSync(path.join(repo, 'package.json'))) {
      fs.writeFileSync(path.join(repo, 'package.json'), '{"name":"consumer"}\n')
    }

    const peer = resolvePeerPackage(repo, 'memory-atlas-visuals')
    assert.ok(peer)
    assert.equal(peer.version, '9.9.9')
    assert.ok(peer.binPath && peer.binPath.endsWith('atlas-visuals.mjs'))

    const calls = []
    const fakeSpawn = (cmd, args, opts) => {
      calls.push({ cmd, args, opts })
      return { status: 0, error: undefined }
    }
    const io = silentIo()
    const code = runVisuals(['dev', '--port', '1'], {
      cwd: repo,
      ...io,
      spawn: fakeSpawn,
    })

    assert.equal(code, 0)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].cmd, process.execPath)
    assert.ok(calls[0].args[0].endsWith('atlas-visuals.mjs'))
    assert.deepEqual(calls[0].args.slice(1), ['dev', '--port', '1'])
    assert.equal(calls[0].opts.stdio, 'inherit')
  })
})

describe('runVisuals usage', () => {
  test('unknown subcommand exits 1', () => {
    const io = silentIo()
    const code = runVisuals(['bogus'], { cwd: mkRepo(), ...io })
    assert.equal(code, 1)
    assert.ok(io.err.some((line) => line.includes('unknown subcommand')))
  })

  test('no subcommand prints usage and exits 0', () => {
    const io = silentIo()
    const code = runVisuals([], { ...io })
    assert.equal(code, 0)
    assert.ok(io.out.some((line) => line.includes('atlas visuals')))
  })
})
