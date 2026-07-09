# Interop example: a token-oracle budget hint

token-oracle is a session-window token forecaster: it projects whether the
current usage window will hit its cap before it resets, and writes that
projection to a stable, versioned snapshot file. This example is a
read-only Atlas-side consumer of that file — a small script an agent can run
before claiming a large `BACKLOG.md` item, so it can weigh "how much budget
is actually left" against "how big is this item" before committing to it.

Coupling is file-only and one-directional: this script reads
`forecast.json`; the Atlas never imports oracle's code, and oracle never
reads or writes anything about the Atlas.

## The schema-1 contract

`oracle snapshot` writes this shape (token-oracle `ADAPTERS.md` → "Consumer
interface", schema version 1):

```json
{
  "schema": 1,
  "generated_at": 1751234567.89,
  "windows": [
    {
      "window": "5h",
      "used": 45200,
      "cap": 220000,
      "projected_pct": 21.0,
      "eta_to_cap_secs": null,
      "reset_in_secs": 13320.0,
      "idle": false,
      "confidence": 1.0
    }
  ]
}
```

Consumers must check `schema === 1` before reading further — a future
breaking change bumps this number, and an old consumer that doesn't check it
would misread a reshaped file.

## Where the file lives

Default: `$XDG_DATA_HOME/token-oracle/forecast.json`, falling back to
`~/.local/share/token-oracle/forecast.json` when that variable is unset —
overridable with `oracle snapshot --out PATH` on the writing side. This
example's reader (`budget-hint.mjs`) resolves the same default and additionally
accepts `--path <file>` or a `TOKEN_ORACLE_SNAPSHOT` env override, mainly so
it (and its tests) can point at a fixture without touching the real path.

## Read-only, by design

**Only `oracle snapshot` (or `oracle snapshot --out`) writes this file.** It
is not updated automatically by `oracle forecast` or the forecasting engine —
keeping it fresh (cron, a shell alias, a tmux hook) is the oracle side's
concern, documented in its own `ADAPTERS.md`.

The Atlas side never writes to it, and never will: auto-writing a hint into
a sibling's own config was explicitly considered and rejected in oracle's
planning record ("the hint is the product") — the correct integration is a
pure reader that degrades to silence when the file is missing, stale-schema,
or every window is idle. `budget-hint.mjs` follows exactly that: missing
file, unparseable JSON, `schema !== 1`, or an idle window all print nothing
and exit 0 (fail-open — safe to wire into a hook unconditionally).

## Usage

```sh
node examples/with-token-oracle/budget-hint.mjs
node examples/with-token-oracle/budget-hint.mjs --warn-pct 90
node examples/with-token-oracle/budget-hint.mjs --path /tmp/forecast.json
```

Prints one advisory line per non-idle window at or above `--warn-pct`
(default `80`), e.g.:

```
⏳ 5h window projected 88% (used 194k/220k, resets in 3.9h) — consider a smaller backlog item.
```

## Wiring

- **Routine**: `atlas routine session-planning` prints the paired routine
  template (`templates/routines/session-planning.md`) — read it before
  claiming a large BACKLOG track item; it points back at this script and
  states the "propose, never auto-claim" invariant explicitly.
- **Hook (optional)**: this script is intentionally NOT wired into
  `.claude/settings.json` by default — it's meant to be run deliberately (via
  the routine above) before a claim decision, not on every session start. A
  repo that wants it on every prompt can still add it as a `UserPromptSubmit`
  or similar hook; it is fail-open and returns in well under a second when
  the snapshot is absent, so it is safe to add there too.
