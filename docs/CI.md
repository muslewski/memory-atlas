---
title: "CI recipe"
description: "Run atlas check and an index-in-sync gate in GitHub Actions."
section: recipes
order: 40
---

# CI recipe — `atlas check` in GitHub Actions

Copy-paste workflow to keep the vault honest on every push and pull request:
structural / ownership / lifecycle checks (and corpus when enabled) fail the
build; the committed `map/index.md` must match a fresh `atlas build`.

Fleet note: when a repo also uses **agentic-sage**, this `atlas check` gate
is independent of sage's board/doctor — sage may *read* the vault via an
optional adapter; CI honesty for the mind still runs through Atlas. See
[Works with](./works-with.md).

## Workflow

```yaml
name: atlas-check
on:
  push:
  pull_request:

jobs:
  atlas:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          # Full history so verifiedAt SHAs resolve for freshness reporting.
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      # Vendored in this repo (devDependency / workspace):
      - run: npm ci
      # Or, for adopters that install the package without vendoring the source:
      # - run: npm i --no-save memory-atlas

      - name: package freshness (wired + registry; hard on CI)
        run: npx --no-install atlas gate --strict

      - name: atlas check (structure, ownership, lifecycle, corpus-if-enabled)
        run: npx --no-install atlas check --strict

      - name: index-in-sync gate
        run: |
          npx --no-install atlas build
          git diff --exit-code -- '*-atlas/map/index.md' || \
          git diff --exit-code -- 'atlas/map/index.md'
```

Adjust the index path to match your vault directory (conventionally
`<repo>-atlas/map/index.md`, or `atlas/` in this toolkit's dogfood vault).

## What fails the build

Hard errors (exit 1) from `atlas gate --strict` (optional but recommended):

- **Wired lag** — installed `memory-atlas` ≠ `.atlas-state.json` `atlasVersion`,
  or pending migrations (run the `atlas-update` skill / `atlas migrate --write` +
  `atlas wire all`)
- **Registry lag** — npm latest newer than installed (bump the dep, then update)

Hard errors (exit 1) from `atlas check`:

- **Structure** — missing globs, bad `verifiedAt` encoding, seeded/active
  mismatches, unresolvable hard anchors when configured
- **Ownership SSOT** — a tracked file claimed by more than one mounted zone
  (`check.ownership`, default on)
- **Lifecycle / ledger** — ledger lint violations; committed `map/index.md`
  out of date with what `atlas build` regenerates (the index-sync step above)
- **Corpus** — only when `check.corpus.enabled: true` (summary cap, required
  section headers, broken body wikilinks, orphan zones)

Local **predev** (soft by default — does not block coding unless you set
`check.packageFreshness.mode: "fail"`):

```json
"predev": "atlas gate"
```

## What never fails the build by default

**Staleness (`⚠ stale` freshness)** is always advisory — including under
`atlas check --strict`. A zone whose owned code moved past `verifiedAt` is
reported as a warning and listed under Verification gaps in the index; it
does **not** fail CI unless the repo opts in with:

```json
"check": { "strictFreshness": true }
```

That is owner decision 3: structure and ownership are correctness invariants;
freshness drift is a human re-stamp signal unless you deliberately harden it.

## Enabling the corpus gate

In `atlas.config.json`:

```json
"check": {
  "corpus": { "enabled": true, "maxSummaryLen": 500 }
}
```

Then the same `atlas check --strict` CI step will hard-fail on over-long
summaries, missing zone template headers, body `[[wikilinks]]` that resolve
to no note, and mounted zones with zero inbound links.

## Billing note

Private-repo GitHub Actions minutes are billed; public repositories run free
on the standard GitHub-hosted runners. Prefer a short job (checkout + node +
check + index sync) — this recipe intentionally avoids install of unrelated
tooling.
