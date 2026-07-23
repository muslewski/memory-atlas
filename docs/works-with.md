---
title: "Works with"
description: "How memory-atlas fits the muslewski fleet — real interop, not a laundry list."
section: recipes
order: 5
---

# Works with

Atlas is **code-verified vaults** for the past tense of a repo. Sibling tools cover other slices of the same desk. Name them in feature docs when a **real** integration exists; this page is the short map.

| Package | Relationship to Atlas | Links |
|---------|----------------------|--------|
| **agentic-sage** | Optional project adapter reads `atlas.config.json` + zone cards so territory/board can show zone names and treat `map/index.md` as generated. Coupling is file-only and one-directional (sage → vault). Example: [`examples/with-agentic-sage/`](../examples/with-agentic-sage/). SessionStart hooks coexist fail-open. | [sage.muslewski.com](https://sage.muslewski.com) · [npm](https://www.npmjs.com/package/agentic-sage) |
| **status-herald** | Same install/wire etiquette family (fail-open SessionStart, backup-before-write). No runtime data exchange with the vault. | [herald.muslewski.com](https://herald.muslewski.com) · [npm](https://www.npmjs.com/package/status-herald) |
| **token-oracle** | Optional read-only budget hint before large backlog claims — consumer of `oracle snapshot` / `forecast.json`. Example: [`examples/with-token-oracle/`](../examples/with-token-oracle/). Atlas never writes oracle state. | [oracle.muslewski.com](https://oracle.muslewski.com) · [npm](https://www.npmjs.com/package/token-oracle) |
| **llm-armory** | Named executor loadouts spawn sessions; those sessions recollect into an Atlas **when the repo has a vault**. Atlas does not invoke or configure armory. | [armory.muslewski.com](https://armory.muslewski.com) · [npm](https://www.npmjs.com/package/llm-armory) |
| **mossferry** | Remote tmux/mosh path to the machine that holds your repos and vaults. Atlas runs **on the app host** next to the code; ferry is how a laptop reaches that host. | [mossferry.muslewski.com](https://mossferry.muslewski.com) · [npm](https://www.npmjs.com/package/mossferry) |

## Rules for authors

1. **Contextual first** — when documenting a feature that displays or depends on a sibling, say so in that page (one clear sentence + link).
2. **Update this table** when you add or remove a real edge.
3. **Do not invent** — if code does not wire it, do not claim it.

## See also

- [On-ramp](./ONRAMP.md) — wire hooks; shared SessionStart etiquette with sage
- [CI recipe](./CI.md) — `atlas check` as the vault honesty gate
- [Examples](../examples/README.md) — sage adapter + oracle budget hint + solo baseline
