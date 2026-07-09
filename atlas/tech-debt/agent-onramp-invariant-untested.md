---
type: debt
summary: "The agent-onramp zone's invariant (skill names + adapter script paths referenced by docs/ONRAMP.md must match what actually ships) has no automated enforcement."
tags: [agent-onramp, testing]
status: open
created: 2026-07-09
updated: 2026-07-09
severity: "low"
effort: "small"
related:
  - [[agent-onramp]]
sources: []
---

## What's deferred

A regression test that renders `docs/ONRAMP.md`'s CLAUDE.md/AGENTS.md
blocks (or at minimum greps them) and asserts: (1) every skill name named
in the install-flow steps has a matching directory under `skills/`, and
(2) the adapter script path named in the hook-wiring JSON
(`adapters/ctx-search/nav-refresh-index.mjs`) actually exists. Today this is
checked only by eyeballing the docs during a change, which is exactly the
kind of drift SPEC.md's `owns.globs` anchors exist to prevent for zone
cards — this zone just doesn't have an equivalent for its own prose yet.

## Why

Confirmed by grep during the dogfood pass (Plan-driven vault build for this
repo, 2026-07-09): no file under `test/` references `skills/`, `adapters/`,
or any of the three skill slugs (`atlas-nav`, `atlas-recollection`,
`writing-for-retrieval`) by name. `lib/config.mjs`'s `DEFAULT_SKILLS.nav`
(`"atlas-nav"`) is likewise never checked against the real `skills/`
directory listing. Filing this rather than inventing a fake `enforcedBy` on
the zone card's invariant, per the convention that an invariant with no
enforcement is a warning, not a lie.
