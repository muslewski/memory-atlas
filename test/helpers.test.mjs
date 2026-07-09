import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { removeDirWithRetry } from './helpers.mjs'

// Fast backoff for these tests — the retry *count* and *rethrow* behavior is
// what's under test, not real wall-clock timing.
const FAST = { baseDelayMs: 1 }

function err(code) {
  const e = new Error(code)
  e.code = code
  return e
}

describe('removeDirWithRetry', () => {
  test('retries on a transient error and succeeds once it clears', async () => {
    let calls = 0
    const rm = () => {
      calls++
      if (calls < 3) throw err('ENOTEMPTY')
    }
    await removeDirWithRetry('/fake/dir', { ...FAST, rm })
    assert.equal(calls, 3, 'should have retried twice before succeeding on the 3rd attempt')
  })

  test('retries on EBUSY and ENOENT too', async () => {
    for (const code of ['EBUSY', 'ENOENT']) {
      let calls = 0
      const rm = () => {
        calls++
        if (calls < 2) throw err(code)
      }
      await removeDirWithRetry('/fake/dir', { ...FAST, rm })
      assert.equal(calls, 2, `should have retried once for ${code}`)
    }
  })

  test('rethrows a non-transient error immediately, without retrying', async () => {
    let calls = 0
    const rm = () => {
      calls++
      throw err('EACCES')
    }
    await assert.rejects(
      () => removeDirWithRetry('/fake/dir', { ...FAST, rm }),
      (e) => e.code === 'EACCES',
    )
    assert.equal(
      calls,
      1,
      'a genuine cleanup bug must surface on the first attempt, not be retried away',
    )
  })

  test('rethrows the transient error once bounded retries are exhausted', async () => {
    let calls = 0
    const rm = () => {
      calls++
      throw err('ENOTEMPTY')
    }
    await assert.rejects(
      () => removeDirWithRetry('/fake/dir', { ...FAST, attempts: 3, rm }),
      (e) => e.code === 'ENOTEMPTY',
    )
    assert.equal(
      calls,
      3,
      'should stop retrying at the configured attempt cap and rethrow, not hang forever',
    )
  })
})
