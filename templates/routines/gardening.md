# Atlas gardening routine

Cadence: every {{CADENCE_DAYS}} days. This is a **proposal-only** pass —
report findings for a human to act on; never edit vault notes yourself.

## 1. Gather the evidence

- Run `atlas build` then `atlas check --report` for current index/ledger state.
- List notes changed in the last {{CADENCE_DAYS}} days:
  `git log --since="{{CADENCE_DAYS}} days ago" --name-only -- '<vault>/'`.
- Read every `⚠ stale` and `seeded` row under map/index.md's
  "Verification gaps" section.

## 2. Look for

- **Missing connections** — notes touched in the same recent window that
  plausibly relate but carry no `[[wikilink]]` between them.
- **Stale-but-unedited zones** — a zone flagged `⚠ stale` whose card itself
  wasn't touched in the same window (the code moved, the claim didn't).
- **Ideas ready to move** — `idea` notes at `status: active` old enough,
  relative to the cadence, to either promote (`status: promoted`) or
  archive (`status: archived`).
- **Orphaned notes** — any note with zero inbound `related`/`sources`/
  `depends` links from elsewhere in the vault.

## 3. Report

A short bullet list, one line per finding: the note(s) involved and the
specific suggested action. Do not apply any of them.

## 4. Tech debt (at most one)

Only if the findings above reveal a *recurring pattern* — e.g. "zone cards
consistently lag their owned code" — rather than an isolated item, file
exactly one `tech-debt/` note describing the systemic gap. Never file more
than one per pass, and never file one for a single isolated finding.
