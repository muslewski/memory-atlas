# Launch checklist (owner-executed)

This is a checklist for the project owner. Nothing on it has been run by
tooling or an agent — it is the numbered sequence of irreversible or
account-scoped actions that turn this repository into a published package.
Run the items in order; none of steps 3–7 are safe to run out of order.

## 1. Confirm the brand sub-decisions

Three sub-decisions were locked as defaults and are already baked into this
repo's code and docs. Confirm each still holds, or override before
continuing (an override touches `package.json`'s `bin` map, this repo's own
vault directory name, and prose using the concept noun — all small, contained
edits):

- **Bin name**: `atlas`, with `memory-atlas` installed as a second bin alias
  pointing at the same file. **Preflight**: run `command -v atlas` before
  install. MongoDB Atlas CLI installs a binary literally named `atlas` — if
  one is already on `PATH`, the `memory-atlas` alias is the documented
  install fallback, and the README's install instructions should say so
  explicitly for anyone hitting the same collision. (Note: this is a search
  and PATH collision, not an npm package-name collision — nothing on npm
  today is named `atlas` or `memory-atlas`; the collision risk is entirely
  about the CLI binary name and about "Atlas" as a *search term*.)
- **Vault directory**: `atlas/` as the default the CLI scaffolds (this
  repo's own dogfood vault is also named `atlas/`).
- **Concept noun**: "an Atlas" / "the Atlas" in prose.

## 2. Re-check npm name availability

```
npm view memory-atlas name
```

Expected: `npm error code E404` (name free). This was last verified
2026-07-09 and returned E404 — re-run it now, since availability can change
between planning and publish. If the name is taken by the time you run this:
stop before step 3 and pick an alternate (either a different bare name, or
scope the package as `@<your-npm-org>/memory-atlas`) rather than publishing
under a name that collides.

## 3. Create the GitHub repository

- Create `muslewski/memory-atlas` (or your chosen org/name).
- `package.json` already defaults `repository`, `homepage`, and `bugs` to
  `github.com/muslewski/memory-atlas` — confirm these are correct for the
  repo you actually created, or edit them before publishing. These were
  filled in as reasonable defaults, not confirmed against a real repository
  (none existed while this checklist was written).

## 4. Push

```
git remote add origin git@github.com:muslewski/memory-atlas.git
git push -u origin main
```

Not run by the executor of this checklist's authoring plan — this is the
first step in the whole sequence that leaves local disk.

## 5. Add CI

A single workflow: `node --test`, Biome, and `atlas check` against this
repo's own dogfood vault. Inline, copy-paste ready:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npx @biomejs/biome check .
      - run: node bin/atlas.mjs check
```

Save as `.github/workflows/ci.yml`.

## 6. Bring badges live

Swap the static placeholder badges in `README.md` (tests/node/license/deps)
for the real ones now that CI and the repo exist: a GitHub Actions status
badge for the workflow above, and — once step 7 is done — an npm version
badge.

## 7. Publish

```
npm publish --dry-run
```

first, and read the file list it prints. Then:

```
npm publish
```

**Known issue — publish from a clean checkout.** `adapters/.navidx.log` is a
runtime artifact of the ctx-search adapter (see
`adapters/ctx-search/README.md`). It is gitignored and absent from a clean
checkout, but `package.json`'s `files` array includes the whole `adapters/`
directory, so if that adapter has ever run in the working directory you
publish from, `npm pack`/`npm publish` will sweep the log file into the
tarball. This was verified directly: running `npm pack --dry-run` in a
working copy where the file existed listed
`adapters/.navidx.log` in the tarball contents. Before publishing, either:

- publish from a fresh `git clone` (guarantees no local runtime artifacts
  exist), or
- run `git clean -xdn` first and confirm it lists nothing unexpected under
  `adapters/`, or
- add a `.npmignore` entry for `adapters/.navidx.log` / `adapters/*.log`.

`npm pack --dry-run` again immediately before the real publish and re-check
the file list either way.

## 8. Post-launch

- Watch for name feedback. The npm/bin name `atlas` collides with nothing on
  npm, but "Atlas" as a project name collides with MongoDB Atlas in search
  results — this was flagged during naming and accepted as a known,
  non-blocking tradeoff. If it generates real confusion post-launch, the
  `memory-atlas` alias (already shipped, see step 1) is the fallback to lead
  with in the README's install section.
- File issues as `ideas/` notes in this repo's own dogfood vault (`atlas/ideas/`),
  same as any other adopting repo would.

## Known pre-1.0 items (not fixed by this checklist, carried forward)

These are real, currently-open issues. Neither is fixed here — both are
out of scope for a docs-only launch pass, and are recorded so they aren't
lost or accidentally implied to be resolved by "launch."

1. **The npm-pack artifact sweep above** (§7) — the underlying fix (either
   an `.npmignore` or narrowing the `files` glob for `adapters/`) is a small,
   real code change that hasn't been made; publishing-from-clean-checkout is
   a process workaround, not a fix.
2. **A flaky test-suite cleanup hook.** `node --test` has been observed,
   more than once, to report a single spurious test failure that vanishes on
   rerun. The suspected cause: `after()` hooks in the integration tests call
   `fs.rmSync(dir, { recursive: true, force: true })` on temporary git
   repositories while `node:test` runs test files in parallel, racing the
   OS releasing a just-exited git child process's directory handle. This is
   pre-existing, nobody owns a fix for it yet, and the README does not (and
   must not) claim a rock-solid suite — it's 126 tests green on a normal
   run, with this known, occasional flake.
