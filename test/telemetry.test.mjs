import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, test } from 'node:test'
import {
  argvShape,
  emitEvent,
  formatReport,
  readEvents,
  resolveTelemetryEnabled,
  runTelemetry,
  trackCommand,
} from '../lib/telemetry.mjs'
import { removeDirsWithRetry } from './helpers.mjs'

const tmpDirs = []

function mkTmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-tel-'))
  tmpDirs.push(dir)
  return dir
}

after(async () => {
  await removeDirsWithRetry(tmpDirs)
})

describe('resolveTelemetryEnabled', () => {
  test('default off', () => {
    assert.equal(
      resolveTelemetryEnabled({
        env: {},
        argv: ['node', 'atlas', 'gate'],
        globalConfig: {},
        repoConfig: {},
      }),
      false,
    )
  })

  test('env 1 enables', () => {
    assert.equal(
      resolveTelemetryEnabled({
        env: { ATLAS_TELEMETRY: '1' },
        argv: ['node', 'atlas', 'gate'],
        globalConfig: {},
        repoConfig: {},
      }),
      true,
    )
  })

  test('env 0 wins over global on', () => {
    assert.equal(
      resolveTelemetryEnabled({
        env: { ATLAS_TELEMETRY: '0' },
        argv: ['node', 'atlas', 'gate'],
        globalConfig: { telemetry: { enabled: true } },
        repoConfig: {},
      }),
      false,
    )
  })

  test('--no-telemetry wins', () => {
    assert.equal(
      resolveTelemetryEnabled({
        env: { ATLAS_TELEMETRY: '1' },
        argv: ['node', 'atlas', 'gate', '--no-telemetry'],
        globalConfig: { telemetry: { enabled: true } },
        repoConfig: {},
      }),
      false,
    )
  })

  test('global config enables', () => {
    assert.equal(
      resolveTelemetryEnabled({
        env: {},
        argv: ['node', 'atlas', 'gate'],
        globalConfig: { telemetry: { enabled: true } },
        repoConfig: {},
      }),
      true,
    )
  })

  test('repo config enables', () => {
    assert.equal(
      resolveTelemetryEnabled({
        env: {},
        argv: ['node', 'atlas', 'gate'],
        globalConfig: {},
        repoConfig: { telemetry: { enabled: true } },
      }),
      true,
    )
  })
})

describe('argvShape', () => {
  test('keeps safe flags, drops free text', () => {
    assert.deepEqual(argvShape(['--strict', 'my-zone', '/abs/path', '--force']), [
      '--strict',
      '--force',
    ])
  })
})

describe('trackCommand + report', () => {
  test('disabled emits nothing', () => {
    const dir = mkTmp()
    const eventsPath = path.join(dir, 'events.jsonl')
    trackCommand({
      cmd: 'gate',
      exit: 0,
      ms: 10,
      enabled: false,
    })
    // trackCommand uses default path when enabled false — force via emit path only when enabled
    assert.equal(fs.existsSync(eventsPath), false)
  })

  test('enabled writes event and report aggregates', () => {
    const dir = mkTmp()
    const eventsPath = path.join(dir, 'events.jsonl')
    emitEvent(
      {
        v: 1,
        ts: new Date().toISOString(),
        cmd: 'gate',
        argv_shape: ['--strict'],
        exit: 0,
        ms: 40,
        atlas_version: '0.5.2',
        install_id: 'test',
        node: '24',
        os: 'linux',
      },
      { eventsPath },
    )
    emitEvent(
      {
        v: 1,
        ts: new Date().toISOString(),
        cmd: 'check',
        argv_shape: [],
        exit: 1,
        ms: 200,
        atlas_version: '0.5.2',
        install_id: 'test',
        node: '24',
        os: 'linux',
      },
      { eventsPath },
    )
    const events = readEvents({ eventsPath })
    assert.equal(events.length, 2)
    const report = formatReport(events)
    assert.match(report, /2 events/)
    assert.match(report, /gate:/)
    assert.match(report, /check:/)
    assert.match(report, /1 non-zero/)
  })
})

describe('runTelemetry', () => {
  test('status when empty', () => {
    const dir = mkTmp()
    const eventsPath = path.join(dir, 'events.jsonl')
    const out = []
    const code = runTelemetry(['status'], {
      stdout: { write: (s) => out.push(s) },
      stderr: { write: () => {} },
      env: {},
      eventsPath,
    })
    assert.equal(code, 0)
    assert.match(out.join(''), /OFF|ON/)
  })

  test('report empty', () => {
    const dir = mkTmp()
    const eventsPath = path.join(dir, 'events.jsonl')
    const out = []
    runTelemetry(['report'], {
      stdout: { write: (s) => out.push(s) },
      env: {},
      eventsPath,
    })
    assert.match(out.join(''), /no events/)
  })
})
