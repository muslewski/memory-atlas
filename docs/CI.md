---
title: "CI recipe"
description: "Local atlas check and index-in-sync gates; optional automation snippet for adopting repos."
section: recipes
order: 40
---

# CI recipe — verify the vault locally

**This package has no hosted CI.** Verification is what you run on your
machine (or what *your* adopting repo wires into its own automation). The
commands below are the gate; the YAML at the end is an optional paste for
repos that already use GitHub Actions.

Fleet note: when a repo also uses **agentic-sage**, this `atlas check` gate
is independent of sage's board/doctor — sage may *read* the vault via an
optional adapter; honesty for the vault still runs through Atlas. See
[Works with](./works-with.md).

## Local gate (run these)

In a git checkout with `memory-atlas` installed (`npm i -D memory-atlas` or
a path install):

```bash
# Soft package-freshness nudge (exit 0 by default)
npx --no-install atlas gate

# Structure, ownership, lifecycle, ledger; read-only — never writes
npx --no-install atlas check

# Index must match a fresh render of zone cards
npx --no-install atlas build
git diff --exit-code -- '*-atlas/map/index.md' || \
git diff --exit-code -- 'atlas/map/index.md'
```

Adjust the index path to match your vault directory (conventionally
`<repo>-atlas/map/index.md`, or `atlas/` in this toolkit's dogfood vault).

Optional predev script (soft by default — does not block coding unless you
set `check.packageFreshness.mode: "fail"`):

```json
"predev": "atlas gate"
```

Hard package-freshness when you want it:

```bash
npx --no-install atlas gate --strict
```

## What fails (exit 1)

From `atlas gate --strict` (optional):

- **Wired lag** — installed `memory-atlas` ≠ `.atlas-state.json` `atlasVersion`,
  or pending migrations (run the `atlas-update` skill / `atlas migrate --write` +
  `atlas wire all`)
- **Registry lag** — npm latest newer than installed (bump the dep, then update)

From `atlas check` (always structural; not package-freshness):

- **Structure** — missing globs, bad `verifiedAt` encoding, seeded/active
  mismatches, unresolvable hard anchors when configured
- **Ownership SSOT** — a tracked file claimed by more than one mounted zone
  (`check.ownership`, default on)
- **Lifecycle / ledger** — ledger lint violations; working-tree `map/index.md`
  out of date with what `atlas build` regenerates
- **Corpus** — only when `check.corpus.enabled: true` (summary cap, required
  section headers, broken body wikilinks, orphan zones)

### Known flag behaviour

`atlas check --strict` is **advertised but currently ignored** for exit
status. Staleness hard-fails only when config has
`check.strictFreshness: true`. Do not rely on the CLI flag alone. See
[Command reference](./COMMANDS.md).

## What never fails by default

**Staleness (`⚠ stale` freshness)** is always advisory — including under
`atlas check --strict`. A zone whose owned code moved past `verifiedAt` is
reported as a warning and listed under Verification gaps in the index; it
does **not** fail the gate unless the repo opts in with:

```json
"check": { "strictFreshness": true }
```

Structure and ownership are correctness invariants; freshness drift is a
human re-stamp signal unless you deliberately harden it.

## Enabling the corpus gate

In `atlas.config.json`:

```json
"check": {
  "corpus": { "enabled": true, "maxSummaryLen": 500 }
}
```

Then the same `atlas check` step hard-fails on over-long summaries, missing
zone template headers, body `[[wikilinks]]` that resolve to no note, and
mounted zones with zero inbound links.

## Optional: GitHub Actions for *your* repo

Copy only if you want Actions in **your** project. This repository does not
require or ship hosted CI.

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

      - run: npm ci
      # Or: npm i --no-save memory-atlas

      - name: package freshness (hard when you want it)
        run: npx --no-install atlas gate --strict

      - name: atlas check (structure, ownership, lifecycle, corpus-if-enabled)
        run: npx --no-install atlas check

      - name: index-in-sync gate
        run: |
          npx --no-install atlas build
          git diff --exit-code -- '*-atlas/map/index.md' || \
          git diff --exit-code -- 'atlas/map/index.md'
```

Prefer a short job (checkout + node + check + index sync). Keep install
minimal.
