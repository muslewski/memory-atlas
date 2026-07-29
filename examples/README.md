# Examples

The Atlas is one of three deliberately independent sibling tools: a session
judge (agentic-sage — **the present** / fleet sessions), a token forecaster
(token-oracle — the future), and the Atlas itself (**the past** / architecture
memory). Core pair for a full desk:

```bash
npm i -D memory-atlas
npm i -g agentic-sage
atlas wire && sage init
# stay current: atlas gate / sage gate (soft by default)
```

They work well together **without being tied together**: separate projects, no
shared code, coupling only via file contracts each already publishes on its
own. These examples are the proof, entirely from the Atlas's side — neither
sibling required any change to make them work.

- **`solo/`** — the no-companions baseline. Everything below still applies
  with zero siblings installed; this is what "just the Atlas" looks like.
- **`with-agentic-sage/`** — copy one file (`adapter.mjs`) so agentic-sage
  can read an Atlas vault for semantic zone names and `BACKLOG.md` drift
  detection. No project-specific paths; vault from `atlas.config.json`.
- **`with-token-oracle/`** — a read-only reader of token-oracle's forecast
  snapshot, plus a routine that weighs it against a BACKLOG claim.

Each example is deletable on its own without touching the others, or the
core Atlas: `with-agentic-sage/` only matters if agentic-sage is installed,
`with-token-oracle/` only matters if token-oracle is installed, and neither
is required for `atlas init` / `build` / `check` / `stamp` / `status` /
`routine` to work. Coupling only ever happens via a file contract each
sibling already documents for its own reasons — a config key, a zone card's
`owns.globs`, `BACKLOG.md`, a versioned JSON snapshot — never via imported
code.
