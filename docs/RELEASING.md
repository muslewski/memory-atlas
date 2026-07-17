# Releasing memory-atlas

Owner checklist for first publish and subsequent releases. Nothing in this
document is automated by agents in a packaging PR — create the GitHub repo,
push, and publish only from a human session with the right credentials.

## First publish

1. **Create the GitHub repo** `muslewski/memory-atlas` as **PUBLIC**. Actions
   minutes are free for public repositories; a private repo would bill.
2. **Push `main`:** `git push -u origin main`.
3. **Add the `NPM_TOKEN` repo secret** — an npm automation token with publish
   rights (npm account required). GitHub → Settings → Secrets and variables →
   Actions → New repository secret, name `NPM_TOKEN`.
4. **release-please** opens or updates a Release PR on every conventional-commit
   push to `main`. Merging that PR bumps `package.json` / the release-please
   manifest, updates `CHANGELOG.md`, and creates a version tag.
5. **Publishing:** push the tag by hand (`git push origin vX.Y.Z`) or run the
   **Publish to npm** workflow via `workflow_dispatch`. release-please's own
   `GITHUB_TOKEN` does **not** trigger the publish workflow on the auto-pushed
   tag — see the comment block at the top of `.github/workflows/publish.yml`.
6. **First-publish sanity (local, before you publish):**
   - `npm pack --dry-run` — confirm the file list matches `files` in
     `package.json` (bin, lib, templates, schema, skills, adapters, examples,
     docs, SPEC.md; no `test/` or dogfood `atlas/` vault).
   - `npm view memory-atlas` should 404 until the name is taken — confirm the
     package name is still free before the first publish.

## Ongoing releases

- Prefer conventional commits (`feat:`, `fix:`, `perf:`, …) on `main` so
  release-please can open the right bump.
- Merge the release-please PR when ready; then publish via tag push or
  workflow_dispatch as above.
- Do not hand-edit `CHANGELOG.md` for release notes — release-please owns it
  from the first release PR onward.
