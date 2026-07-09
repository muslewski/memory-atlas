import fs from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'

// after() cleanup hooks across this suite call fs.rmSync(dir, { recursive:
// true, force: true }) on temporary git repos created under os.tmpdir().
// node:test runs test FILES in parallel, so a temp dir's recursive removal
// can race the OS still releasing a just-exited child process's (e.g. `git`)
// handle on a file inside it — throwing ENOTEMPTY or EBUSY out of the
// cleanup hook. That's a spurious, rerun-fixes-itself failure unrelated to
// the test's own assertions, not a real bug.
//
// removeDirWithRetry retries a bounded number of times, with a short linear
// backoff, ONLY for that class of transient error. Any other error (a
// genuine cleanup bug) rethrows immediately — this must never become a
// blanket try/ignore.
const TRANSIENT_CODES = new Set(['ENOTEMPTY', 'EBUSY', 'ENOENT'])

function defaultRm(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

/**
 * Remove `dir` recursively, retrying on a transient OS-timing error.
 *
 * @param {string} dir
 * @param {{attempts?: number, baseDelayMs?: number, rm?: (dir: string) => void}} [options]
 *   `rm` is injectable so helpers.test.mjs can simulate transient/non-transient
 *   failures without touching the real filesystem; production callers never
 *   need to pass it.
 */
export async function removeDirWithRetry(dir, options = {}) {
  const { attempts = 5, baseDelayMs = 20, rm = defaultRm } = options
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      rm(dir)
      return
    } catch (err) {
      if (attempt === attempts || !TRANSIENT_CODES.has(err?.code)) throw err
      await delay(baseDelayMs * attempt)
    }
  }
}

/** Remove each directory in `dirs`, in order, via removeDirWithRetry. */
export async function removeDirsWithRetry(dirs, options) {
  for (const dir of dirs) await removeDirWithRetry(dir, options)
}
