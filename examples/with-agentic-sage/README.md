# Interop example: agentic-sage reading an Atlas

agentic-sage is a session-judge tool (territory, why-diverged, merge-brief,
a fleet backlog board) that works on any repo with zero configuration —
paths only, no names. An *adapter* is optional per-project enrichment that
teaches it a repo's vocabulary. This example is that adapter, generalized so
any Atlas-adopting repo can copy it in unmodified: it reads `atlas.config.json`
to find the vault instead of hardcoding a path.

Coupling is one-directional and file-only: sage reads the Atlas's zone cards
and `BACKLOG.md`; the Atlas never imports sage's code, and sage's core never
inspects Atlas content beyond what this adapter hands it back as plain
strings.

## What lights up

With this adapter installed, agentic-sage's board and territory commands
gain:

- **Semantic zone names.** `sage territory` / `sage why-diverged` /
  `sage merge-brief` show `(zone: billing)` instead of a bare path, resolved
  from a zone card's `owns.globs`.
- **Drift detection over the Atlas's `BACKLOG.md`.** `sage backlog` can
  report who holds each row and flag when the file drifts from what a
  session's branch claims — reading the same `BACKLOG.md` a human already
  maintains under SPEC.md's Coordination convention, no second ledger.
- **Generated-file awareness.** `sage`'s guard treats the vault's generated
  `map/index.md` as "regenerate, don't merge" instead of a mergeable file, so
  a contested `map/index.md` never gets hand-merged by two sessions.

## Install

1. Run `sage adapter init` in the repo — it stamps a no-op adapter at
   `<repoRoot>/.agentic-sage/adapter.mjs`.
2. Replace its contents with this file (`adapter.mjs`), unmodified. It reads
   `atlas.config.json` at `ctx.repoRoot` for the vault location, falling back
   to structural detection if the config is missing or invalid — nothing to
   edit.
3. Alternatively, keep the adapter out of the project's own git history:
   symlink it to sage's out-of-tree storage location instead of committing
   it in-repo. Both are legal discovery slots per agentic-sage's `ADAPTERS.md`
   ("Out-of-tree adapters").

## Discovery and fail-closed guarantees

agentic-sage's own `ADAPTERS.md` states two guarantees this adapter relies
on and never has to re-implement:

> So a bad adapter degrades gracefully to exactly what you'd get with no
> adapter — it can't take SAGE down.

Every export in this file is additionally wrapped in its own try/catch
(vault missing, config unparseable, file unreadable → `null`/`[]`) — belt
and suspenders on top of sage's own safety net, not a substitute for it.

## Shared hook etiquette

Both tools follow the same family convention for SessionStart hooks
(SPEC.md's "The SessionStart hook contract", under Interop): a hook prints
nothing and exits 0 when its owning tool is disabled, each tool reads only
its own configuration for enablement, and a CLI invoked by both a hook and a
human distinguishes the two call sites with a `--hook` flag. Wiring both
`atlas status --hook` and sage's own SessionStart hook side by side in
`.claude/settings.json` is safe: neither reads the other's config, and
neither blocks the session if the other is absent or disabled.

## Future: the handoff `project` blob

agentic-sage's generic handoff sidecar carries the core session fields plus
an opaque `project` object:

> an opaque `project` object the adapter may fill. The core never inspects
> `project` — it's a passthrough for adapter-specific truth a future
> enrichment step can read.

No code path in agentic-sage today calls adapter code to populate `project`
(the PreCompact auto-dump that writes the handoff sidecar is deliberately
core-only, for hot-path cost). If a future sage release wires this up, the
convention this adapter would follow is: fill `project` with
`{ zones: [...], row: '<id>' }`, where `zones` is `ownsZone` applied to the
session's touched paths and `row` is `claimedWork(rec, ctx).row` — a
recollection pointer back into the Atlas, never a claim sage's core acts on
directly.
