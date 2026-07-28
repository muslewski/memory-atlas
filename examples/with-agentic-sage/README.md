# Interop example: agentic-sage reading an Atlas

**Copy one file.** That is the whole install.

This directory ships a single ES module — [`adapter.mjs`](./adapter.mjs) — that teaches
[agentic-sage](https://www.npmjs.com/package/agentic-sage) to read an Atlas vault
(zone names, `BACKLOG.md`, generated `map/index.md`). There is nothing else to wire,
configure, or rename. Vault location comes from `atlas.config.json` (with structural
detection as fallback). No hardcoded project paths.

```sh
# from a repo that already has atlas.config.json (and preferably agentic-sage on PATH)
cp node_modules/memory-atlas/examples/with-agentic-sage/adapter.mjs .agentic-sage/adapter.mjs
# or, if you cloned this repo / are dogfooding from source:
# cp path/to/memory-atlas/examples/with-agentic-sage/adapter.mjs .agentic-sage/adapter.mjs
```

If `.agentic-sage/` does not exist yet, run `sage adapter init` first (stamps a no-op
stub), then overwrite that stub with the command above — same destination path either way.

## What this is

agentic-sage is a session-judge tool (territory, why-diverged, merge-brief, fleet backlog
board) that works on any repo with zero configuration — paths only, no names. An
*adapter* is optional per-project enrichment that teaches it a repo's vocabulary.

This example is that adapter, generalized so any Atlas-adopting repo can drop it in
unmodified. Coupling is one-directional and file-only: sage reads the Atlas's zone cards
and `BACKLOG.md`; the Atlas never imports sage's code, and sage's core never inspects
Atlas content beyond the plain strings this adapter returns.

## What lights up

With the file installed, agentic-sage's board and territory commands gain:

- **Semantic zone names.** `sage territory` / `sage why-diverged` / `sage merge-brief`
  show `(zone: billing)` instead of a bare path, resolved from a zone card's
  `owns.globs`.
- **Drift detection over the vault's `BACKLOG.md`.** `sage backlog` can report who holds
  each row and flag when the file drifts from what a session's branch claims — the same
  `BACKLOG.md` humans already maintain under the Atlas Coordination convention (optional
  `backlog` module), not a second ledger.
- **Generated-file awareness.** sage's guard treats the vault's generated index
  (default `…/map/index.md`) as "regenerate, don't merge" instead of a mergeable file.

## Install (detail)

1. **One file to destination.** Prefer the `cp` one-liner above. Destination is always
   `<repoRoot>/.agentic-sage/adapter.mjs` (agentic-sage discovery slot 1).
2. **No edits.** The module reads `atlas.config.json` at `ctx.repoRoot` for `vaultDir` /
   `folders.zones`, falling back to structural detection (`*/map/index.md` or
   `*/map/zones/`) if the config is missing or invalid.
3. **Optional: keep it out of git.** Symlink the same file into sage's out-of-tree
   storage instead of committing in-repo. Both slots are legal per agentic-sage
   [`ADAPTERS.md`](https://github.com/muslewski/agentic-sage/blob/main/ADAPTERS.md)
   ("Out-of-tree adapters").

Prerequisites: an Atlas vault in the repo (`atlas init` or adopted), and agentic-sage
installed if you want the CLI enrichments. The adapter itself has **zero npm
dependencies** (Node builtins + a `git` subprocess only).

## Discovery and fail-closed guarantees

agentic-sage's own `ADAPTERS.md` states two guarantees this adapter relies on and never
re-implements:

> So a bad adapter degrades gracefully to exactly what you'd get with no adapter — it
> can't take SAGE down.

Every export here is also wrapped in its own try/catch (vault missing, config
unparseable, file unreadable → `null` / `[]`) — belt and suspenders on top of sage's
safety net, not a substitute for it.

This repo's living contract tests live in
[`test/example-adapter.test.mjs`](../../test/example-adapter.test.mjs) (run via
`npm test`). They seed a real `atlas init` scaffold and assert `ownsZone`,
`claimedWork`, `backlogRows`, kill-switch, structural fallback, and `generatedGlobs`.

## Shared hook etiquette

Both tools follow the same family convention for SessionStart hooks: a hook prints
nothing and exits 0 when its owning tool is disabled, each tool reads only its own
configuration for enablement, and a CLI invoked by both a hook and a human
distinguishes the two call sites with a `--hook` flag. Wiring both `atlas status --hook`
and sage's own SessionStart hook side by side in `.claude/settings.json` is safe:
neither reads the other's config, and neither blocks the session if the other is absent
or disabled.

## Future: the handoff `project` blob

agentic-sage's generic handoff sidecar carries core session fields plus an opaque
`project` object the adapter may fill. The core never inspects `project` — it is a
passthrough for adapter-specific truth a future enrichment step can read.

No code path in agentic-sage today calls adapter code to populate `project` (the
PreCompact auto-dump that writes the handoff sidecar is deliberately core-only, for
hot-path cost). If a future sage release wires this up, the convention this adapter
would follow is: fill `project` with `{ zones: [...], row: '<id>' }`, where `zones` is
`ownsZone` applied to the session's touched paths and `row` is
`claimedWork(rec, ctx).row` — a recollection pointer back into the Atlas, never a claim
sage's core acts on directly.
