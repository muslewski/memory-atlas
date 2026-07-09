# Session planning — budget-aware backlog claims

Run before claiming a large BACKLOG track item, not on a fixed cadence.

## 1. Check remaining budget

- If token-oracle is installed, run
  `node examples/with-token-oracle/budget-hint.mjs` (or read
  `~/.local/share/token-oracle/forecast.json` directly, `$XDG_DATA_HOME`
  respected) for the current session-window projection.
- No oracle installed / no snapshot written yet → skip this step and
  proceed normally; nothing here is required.

## 2. Weigh window vs. item size

- A non-idle window projected near or over its cap, with little time left
  before reset, favors picking a smaller BACKLOG item over a large one —
  a signal, not a hard rule.
- A wide-open window (low projected %, plenty of time to reset) has no
  bearing on which item to pick.

## 3. Propose, never auto-claim

- Present the budget read plus the candidate item(s) to the human and let
  them decide which one to claim.
- Never auto-claim, auto-defer, or auto-split a BACKLOG row from this
  reading alone — routines are propose-only, never auto-apply.
