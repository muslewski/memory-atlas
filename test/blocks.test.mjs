import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import { BLOCK_BEGIN, BLOCK_END, renderOnrampBlock, upsertBlock } from '../lib/blocks.mjs'
import { sha256 } from '../lib/state.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const tmpDirs = []

function mkTmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-blocks-'))
  tmpDirs.push(dir)
  return dir
}

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('blocks', () => {
  test('renderOnrampBlock substitutes vaultName for claude and agents kinds', () => {
    const claude = renderOnrampBlock('claude', { vaultName: 'my-repo-atlas' })
    assert.ok(claude.startsWith(BLOCK_BEGIN))
    assert.ok(claude.endsWith(BLOCK_END))
    assert.ok(claude.includes('my-repo-atlas/'))
    assert.ok(claude.includes('Orient Atlas-first'))
    assert.ok(!claude.includes('<repo>-atlas'))

    const agents = renderOnrampBlock('agents', { vaultName: 'my-repo-atlas' })
    assert.ok(agents.startsWith(BLOCK_BEGIN))
    assert.ok(agents.endsWith(BLOCK_END))
    assert.ok(agents.includes('my-repo-atlas/map/index.md'))
    assert.ok(!agents.includes('atlas-nav')) // tool-agnostic
    assert.ok(!agents.includes('<repo>-atlas'))
  })

  test('on-ramp bodies document stamp-after-commit order and worker/integrator split', () => {
    const claude = renderOnrampBlock('claude', { vaultName: 'demo-atlas' })
    assert.ok(
      claude.includes('commit code + card edits first'),
      'claude body must document stamp-after-commit order',
    )
    assert.ok(
      claude.includes('do not') && claude.includes('map/index.md'),
      'claude body must tell workers not to stage the index',
    )

    const agents = renderOnrampBlock('agents', { vaultName: 'demo-atlas' })
    assert.ok(
      agents.includes('anchors to the committed HEAD'),
      'agents body must document that stamp anchors to committed HEAD',
    )
    assert.ok(
      agents.includes('Workers do not stage'),
      'agents body must tell workers not to stage the index',
    )
  })

  test('agents body points at vault paths and default skills dir', () => {
    const agents = renderOnrampBlock('agents', { vaultName: 'my-repo-atlas' })
    assert.ok(
      agents.includes(
        'Route spec-writing output to `my-repo-atlas/specs/` and plan-writing output to `my-repo-atlas/plans/`',
      ),
      'agents body must route specs/plans with substituted vault name',
    )
    assert.ok(
      agents.includes(
        'plain markdown files under `.claude/skills/<name>/SKILL.md` — read the matching one before doing those tasks',
      ),
      'agents body must point at default skills dir',
    )
  })

  test('agents body substitutes custom skillsDir opt', () => {
    const agents = renderOnrampBlock('agents', {
      vaultName: 'demo-atlas',
      skillsDir: '.agents/skills',
    })
    assert.ok(
      agents.includes(
        'plain markdown files under `.agents/skills/<name>/SKILL.md` — read the matching one before doing those tasks',
      ),
      'custom skillsDir must appear in the procedures pointer',
    )
    assert.ok(!agents.includes('`.claude/skills/<name>/SKILL.md`'))
  })

  test('upsertBlock creates the file when missing', () => {
    const dir = mkTmp()
    const filePath = path.join(dir, 'CLAUDE.md')
    const block = renderOnrampBlock('claude', { vaultName: 'demo-atlas' })

    const result = upsertBlock(filePath, block)

    assert.equal(result.created, true)
    assert.equal(result.changed, true)
    assert.equal(result.hash, sha256(block))
    const onDisk = fs.readFileSync(filePath, 'utf8')
    assert.equal(onDisk, `${block}\n`)
  })

  test('upsertBlock appends and preserves existing user text byte-for-byte above the block', () => {
    const dir = mkTmp()
    const filePath = path.join(dir, 'CLAUDE.md')
    const userText = '# My project\n\nSome user notes.\n'
    fs.writeFileSync(filePath, userText)
    const block = renderOnrampBlock('claude', { vaultName: 'demo-atlas' })

    const result = upsertBlock(filePath, block)

    assert.equal(result.created, false)
    assert.equal(result.changed, true)
    const onDisk = fs.readFileSync(filePath, 'utf8')
    assert.ok(onDisk.startsWith(userText))
    assert.equal(onDisk, `${userText}\n\n${block}\n`)
  })

  test('upsertBlock replace-in-place preserves user text both above AND below', () => {
    const dir = mkTmp()
    const filePath = path.join(dir, 'AGENTS.md')
    const above = '## Preamble\nKeep me.\n'
    const below = '\n## Epilogue\nKeep me too.\n'
    const oldBlock = `${BLOCK_BEGIN}\nold content\n${BLOCK_END}`
    fs.writeFileSync(filePath, `${above}${oldBlock}${below}`)

    const newBlock = renderOnrampBlock('agents', { vaultName: 'demo-atlas' })
    const result = upsertBlock(filePath, newBlock)

    assert.equal(result.changed, true)
    assert.equal(result.created, false)
    const onDisk = fs.readFileSync(filePath, 'utf8')
    assert.ok(onDisk.startsWith(above))
    assert.ok(onDisk.endsWith(below) || onDisk.endsWith(below.replace(/\n$/, '')))
    // Exact: above + newBlock + below (no extra rewrites of user regions)
    assert.equal(onDisk, `${above}${newBlock}${below}`)
  })

  test('upsertBlock is idempotent: second run with same block → changed: false', () => {
    const dir = mkTmp()
    const filePath = path.join(dir, 'CLAUDE.md')
    const block = renderOnrampBlock('claude', { vaultName: 'demo-atlas' })

    const first = upsertBlock(filePath, block)
    assert.equal(first.changed, true)
    const before = fs.readFileSync(filePath, 'utf8')

    const second = upsertBlock(filePath, block)
    assert.equal(second.changed, false)
    assert.equal(second.created, false)
    assert.equal(second.hash, first.hash)
    assert.equal(fs.readFileSync(filePath, 'utf8'), before)
  })

  test('user-edited content inside markers is overwritten; hash mismatch is detectable', () => {
    const dir = mkTmp()
    const filePath = path.join(dir, 'CLAUDE.md')
    const block = renderOnrampBlock('claude', { vaultName: 'demo-atlas' })
    upsertBlock(filePath, block)
    const recordedHash = sha256(block)

    // User edits inside the markers
    let onDisk = fs.readFileSync(filePath, 'utf8')
    const beginIdx = onDisk.indexOf(BLOCK_BEGIN)
    const endIdx = onDisk.indexOf(BLOCK_END) + BLOCK_END.length
    const currentBlock = onDisk.slice(beginIdx, endIdx)
    assert.notEqual(currentBlock.length, 0)
    const edited = `${onDisk.slice(0, beginIdx)}${BLOCK_BEGIN}\nI edited this\n${BLOCK_END}${onDisk.slice(endIdx)}`
    fs.writeFileSync(filePath, edited)

    const editedSlice = fs
      .readFileSync(filePath, 'utf8')
      .slice(
        fs.readFileSync(filePath, 'utf8').indexOf(BLOCK_BEGIN),
        fs.readFileSync(filePath, 'utf8').indexOf(BLOCK_END) + BLOCK_END.length,
      )
    assert.notEqual(sha256(editedSlice), recordedHash)

    // Upsert overwrites the edit
    const result = upsertBlock(filePath, block)
    assert.equal(result.changed, true)
    assert.equal(result.hash, recordedHash)
    onDisk = fs.readFileSync(filePath, 'utf8')
    const restored = onDisk.slice(
      onDisk.indexOf(BLOCK_BEGIN),
      onDisk.indexOf(BLOCK_END) + BLOCK_END.length,
    )
    assert.equal(sha256(restored), recordedHash)
  })
})
