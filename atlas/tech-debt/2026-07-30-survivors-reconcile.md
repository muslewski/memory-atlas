---
type: debt
summary: "Cold-review of 19 adversarial survivors after the desk-hardening repair wave — classification FIXED / NOT-FIXED / INTENDED / NOT-REPRODUCIBLE with file:line evidence and tests."
tags: [survivors, cold-review, security, cli]
status: open
created: 2026-07-30
updated: 2026-07-30
severity: "medium"
effort: "small"
related:
  - [[cli]]
  - [[config]]
  - [[vault-io]]
  - [[verifier-core]]
sources: []
---

## What's deferred

Only items still open after this pass (see table). Everything else is FIXED
with a regression test, INTENDED by SPEC contract, or NOT-REPRODUCIBLE on
this package's tree.

## Survivor table (19)

Format: `[severity] file:line — STATE — evidence`

1. **[critical] lib/stamp.mjs:85 — FIXED** — `isSafeSlug` + `resolveInside` +
   `assertWriteInside` refuse `../` slugs before write
   (`lib/stamp.mjs` ~92–104, `lib/paths.mjs`). Test:
   `test/stamp.test.mjs` "slug with ../ is refused".

2. **[major] bin/atlas.mjs:171 — FIXED** — `buildCore` calls
   `assertWriteInside` before `writeFileSync`
   (`bin/atlas.mjs` buildCore). Test:
   `test/paths-containment.test.mjs` "refuses to write through map/index.md symlink".

3. **[major] bin/atlas.mjs:172 — FIXED** — `buildCore` try/catch on write
   emits `atlas build: cannot write map/index.md (EACCES): …`, exit 1, no
   stack. Test: `test/cli-errors.test.mjs` "build: EACCES on map/index.md".

4. **[major] bin/atlas.mjs:442 — FIXED** — `main()` catch writes
   `atlas <cmd>: <msg>` and sets exitCode=1 without rethrow
   (`bin/atlas.mjs` main catch). Zone parse failures surface as clean lines.
   Test: `test/cli-errors.test.mjs` unparseable / empty / BOM cases.

5. **[major] bin/atlas.mjs:444 — FIXED** — same main catch; empty/BOM zone
   cards no longer dump stacks. Test: `test/cli-errors.test.mjs`
   "empty / BOM-only zone".

6. **[major] lib/config.mjs:17 — INTENDED** — SPEC.md § Vault layout places
   zone cards under `map/zones/` (default `DEFAULT_FOLDERS.zones`). Vault-root
   `zones/` is not a zone directory; remap via `folders.zones` if needed.
   Cards at `atlas/zones/*.md` are invisible to build/check by contract
   (observed: build → 0 zones; check can still be ok). `adopt --json` lists
   them under `unclassified`. No auto-relocate migration — would need product
   judgment to invent a second layout.

7. **[major] lib/frontmatter.mjs:307 — FIXED** — `upsertFrontmatterField`
   inserts missing `updated` during stamp (`lib/stamp.mjs` +
   `lib/frontmatter.mjs`). Test: `test/stamp.test.mjs`
   "zone card missing updated key still stamps (upsert)".

8. **[major] lib/init.mjs:265 — FIXED** — `emptyIndex()` writes
   `renderIndex` of empty vault so `atlas check` is green post-init.
   Test: `test/init.test.mjs`
   "init leaves a vault that passes atlas check with no further commands".

9. **[major] lib/migrations/index.mjs:22 — FIXED** —
   `0002-rewrite-iso-verifiedAt` rewrites illegal ISO/garbage stamps on
   upgrade when `state.atlasVersion` is behind the migration target.
   Test: `test/migrate.test.mjs` "rewrites ISO verifiedAt…". (Already-current
   vaults: use `atlas adopt --write`, which also rewrites ISO — see #16.)

10. **[major] lib/notes.mjs:111 — FIXED** — `loadVault` refuses
    `folders.zones` with `..` via `isSafeVaultRel` / `resolveInside`.
    Tests: `test/cli-errors.test.mjs` "loadVault throws when folders.zones
    contains .." + build path.

11. **[major] lib/notes.mjs:37 — FIXED** — `loadNote` throws
    `zone <id>: unparseable frontmatter (…)`; main catch makes it a clean
    CLI line. Test: `test/cli-errors.test.mjs` unparseable zone.

12. **[major] lib/notes.mjs:53 — FIXED** — `readNotes` checks
    `stat.isDirectory()` and throws `notes path is not a directory: …`.
    Test: `test/cli-errors.test.mjs` "map/zones is a regular file".

13. **[major] lib/notes.mjs:56 — FIXED** — symlink follow errors become
    `zone <id>: broken or looping symlink (ELOOP)`.
    Test: `test/cli-errors.test.mjs` "self-referential zone symlink".

14. **[major] lib/stamp.mjs:139 — FIXED** — same as #7 (missing `updated`
    upsert). Test: `test/stamp.test.mjs` upsert case.

15. **[minor] bin/atlas.mjs:205 — FIXED** (this pass) — `runCheck` loads
    config once and passes it into `renderCore({ config })` so type-mismatch
    warnings emit once. Test: `test/cli-errors.test.mjs`
    "type-mismatch config warning emits once".

16. **[minor] lib/adopt.mjs:279 — FIXED** — `fixZoneHonesty` rewrites
    present-but-invalid ISO verifiedAt → unverified.
    Test: `test/adopt.test.mjs`
    "present-but-invalid ISO verifiedAt → unverified (not ignored)".

17. **[minor] lib/config.mjs:246 — FIXED** (this pass) — `loadConfig`
    `statSync` + `isFile()` before `readFileSync`; FIFO/dir/socket warn and
    return defaults without hanging. Tests: `test/cli-errors.test.mjs` FIFO +
    `test/config.test.mjs` directory config.

18. **[minor] lib/package-freshness.mjs:135 — NOT-REPRODUCIBLE** — this
    package's `lib/package-freshness.mjs` has no `writeInstallState` and never
    writes `~/.claude/agentic-sage/state.json` (state is repo-local
    `.atlas-state.json` via `lib/state.mjs`). Line 135 is now registry fetch.
    Shared-file claim points at agentic-sage ownership; no memory-atlas repro
    path found. Ran: grepped package-freshness + state writers; exercised
    `computePackageFreshness` unit suite only.

19. **[minor] lib/stamp.mjs:140 — FIXED** — stamp write try/catch reports
    `cannot write (EACCES): …`, exit 1, no stack.
    Test: `test/cli-errors.test.mjs` "stamp: EACCES on zone file".

## Deferred (NOT-FIXED) detail

None remaining as code defects in this package after this pass.

**Related non-blocker (not in the 19, observed while probing #6):** when
`planAdoption.actions` is empty but `unclassified` is non-empty, dry-run
prints `✓ nothing to adopt — vault already conforms` and hides the
unclassified list (JSON still has them). Severity low; effort small; deferred
as adopt UX polish outside the survivor list.

## Verification (this pass)

- `npm test` — see commit / PROGRESS (must be exit 0).
- `PATH=/usr/bin:/bin:/usr/local/bin npm test` — verdict recorded in PROGRESS.
- `node_modules/.bin/atlas check` — must pass on this vault.
