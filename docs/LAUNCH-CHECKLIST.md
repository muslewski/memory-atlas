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

## 6. Bring badges live, and produce the banner art

Swap the static placeholder badges in `README.md` (tests/node/license/deps)
for the real ones now that CI and the repo exist: a GitHub Actions status
badge for the workflow above, and — once step 7 is done — an npm version
badge.

Separately: `README.md` never had a banner — the art was never produced
(an image-generation task, owner-only), and the HTML-comment scaffolding
that once held the plan for it was removed from `README.md` so the
published source doesn't ship a `TODO-owner` marker. Nothing was lost —
the intent lives here now. If/when you want a banner:

1. Generate `assets/atlas-banner.avif` + `assets/atlas-banner.webp`: wide
   banner, 3:1. A muscular titan seen from behind, holding a glowing globe
   made of a code-repository world — file-tree continents, branching river
   deltas as git branches, small labeled map regions (zones). Style matched
   to the agentic-sage and token-oracle banners. Title text: memory-atlas.
2. Add a centered `<picture>` block back into `README.md`, above the
   `# memory-atlas` heading, with `<source>` entries for the `.avif` and
   `.webp` variants and an `<img>` fallback — same shape as the sibling
   agentic-sage / token-oracle project banners.

## 7. Publish

```
npm publish --dry-run
```

first, and read the file list it prints. Then:

```
npm publish
```

**Fixed — runtime artifacts can no longer leak into the tarball.**
`adapters/.navidx.log` (and its siblings `.navidx.lock` / `.navidx.stamp`)
are runtime artifacts of the ctx-search adapter (see
`adapters/ctx-search/README.md`). They're gitignored and absent from a
clean checkout, but `package.json`'s `files` array includes the whole
`adapters/` directory, so a naive `npm pack` from a working copy where the
adapter had ever run used to sweep the log file into the tarball —
verified directly by creating the artifact and confirming `npm pack
--dry-run` listed `adapters/.navidx.log`. This is now closed structurally:
`adapters/.npmignore` (a nested, per-directory ignore file, committed to
the repo) excludes `.navidx.*` from anything packed under `adapters/`,
regardless of what's present in the working copy. Verified empirically —
with `adapters/.navidx.log`, `.navidx.lock`, and `.navidx.stamp` all
present, `npm pack --dry-run` no longer lists any of them, while every
other file under `adapters/` (the adapter script itself, both README.md
files) still ships. Publishing from a non-clean checkout is no longer a
hazard for this specific artifact class; run `npm pack --dry-run` before
publishing anyway, as general practice, not because of this issue.

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

This item is *mitigated*, not provably eliminated — recorded so it isn't
overstated as "fixed" either.

1. **A flaky test-suite cleanup hook — mitigated, not provably eliminated.**
   `node --test` had been observed, more than once, to report a single
   spurious test failure that vanished on rerun. Suspected cause: every
   `after()` cleanup hook across `test/*.test.mjs` called
   `fs.rmSync(dir, { recursive: true, force: true })` on a temporary git
   repository while `node:test` runs test files in parallel, racing the OS
   releasing a just-exited git child process's directory handle — throwing
   ENOTEMPTY/EBUSY out of the cleanup hook. All such hooks (in
   `config.test.mjs`, `detect.test.mjs`, `example-adapter.test.mjs`,
   `example-budget-hint.test.mjs`, `init.test.mjs`, `integration.test.mjs`,
   `ledger.test.mjs`, `routine.test.mjs`) now go through a shared
   `test/helpers.mjs` (`removeDirWithRetry` / `removeDirsWithRetry`) that
   retries up to 5 times with a short linear backoff, but *only* for
   ENOTEMPTY / EBUSY / ENOENT — any other error still rethrows immediately,
   so a genuine cleanup bug still surfaces. `test/helpers.test.mjs` proves
   the retry/rethrow logic directly against simulated errors. The flake
   itself was never reliably reproducible on demand (one prior run of 12
   didn't hit it either), so 20 consecutive clean `node --test` runs after
   this change is evidence the fix doesn't regress anything, not proof the
   race is gone. The README does not (and must not) claim a rock-solid
   suite beyond "currently green."
