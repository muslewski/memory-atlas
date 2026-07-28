---
title: "Works with"
description: "How memory-atlas fits the muslewski fleet — real interop, not a laundry list."
section: recipes
order: 5
---

# Works with

Atlas is **code-verified vaults** for the architecture past (and map present) of a repo. Sibling tools cover other slices of the same desk. Name them in feature docs when a **real** integration exists; this page is the short map.

| Package | Relationship to Atlas | Links |
|---------|----------------------|--------|
| **memory-atlas-visuals** | Optional presentation plane (gallery, typeset/derived views, digests) over a vault. Declared via `atlas.config.json` → `visuals`; installed separately (`npm i -D memory-atlas-visuals`). Core never imports it — zero runtime deps stay intact. Content under reserved `visuals/` (excluded from agent search). | [docs/VISUALS.md](./VISUALS.md) · [CONFIG](./CONFIG.md#visuals) |
| **agentic-sage** | **Dual superpower with Atlas.** SAGE is the **session present** of the desk (live sessions, territory, merge-brief, optional live judge). Atlas is the **architecture past + map present** (verified zone cards, decisions, specs). Optional project adapter reads `atlas.config.json` + zone cards so territory/board can show zone names and treat `map/index.md` as generated. Coupling is file-only and one-directional (sage → vault). SessionStart hooks coexist fail-open. Example: [`examples/with-agentic-sage/`](../examples/with-agentic-sage/). | [sage.muslewski.com](https://sage.muslewski.com) · [npm](https://www.npmjs.com/package/agentic-sage) · [sage SETUP](https://github.com/muslewski/agentic-sage/blob/main/SETUP.md) · [ONRAMP](./ONRAMP.md) |
| **status-herald** | Same install/wire etiquette family (fail-open SessionStart, backup-before-write). No runtime data exchange with the vault. | [herald.muslewski.com](https://herald.muslewski.com) · [npm](https://www.npmjs.com/package/status-herald) |
| **token-oracle** | Optional read-only budget hint before large backlog claims — consumer of `oracle snapshot` / `forecast.json`. Example: [`examples/with-token-oracle/`](../examples/with-token-oracle/). Atlas never writes oracle state. | [oracle.muslewski.com](https://oracle.muslewski.com) · [npm](https://www.npmjs.com/package/token-oracle) |
| **llm-armory** | Named executor loadouts spawn sessions; those sessions recollect into an Atlas **when the repo has a vault**. Atlas does not invoke or configure armory. | [armory.muslewski.com](https://armory.muslewski.com) · [npm](https://www.npmjs.com/package/llm-armory) |
| **mossferry** | Remote tmux/mosh path to the machine that holds your repos and vaults. Atlas runs **on the app host** next to the code; ferry is how a laptop reaches that host. | [mossferry.muslewski.com](https://mossferry.muslewski.com) · [npm](https://www.npmjs.com/package/mossferry) |

## Dual superpower — past vs present

| Tense | Tool | Answers |
|-------|------|---------|
| **Architecture past + map present** | **Atlas** (this package) | What does the code *mean*? Which zones own which paths? What was decided, and is the card still verified at HEAD? |
| **Session present** | [agentic-sage](https://sage.muslewski.com) | Who is editing *right now*? Are two sessions about to collide? What belongs in a merge-brief? |

Neither tool needs the other. Alone, Atlas keeps vault honesty (`atlas check`); alone, SAGE judges parallel sessions. Together, the optional adapter maps contested globs → zone names so the judge speaks your architecture vocabulary.

Bootstrap Atlas with **[On-ramp](./ONRAMP.md)**; bootstrap SAGE with its **[SETUP.md](https://github.com/muslewski/agentic-sage/blob/main/SETUP.md)** (required → recommended → optional). Shared SessionStart etiquette: both fail-open when the sibling is missing.

## Rules for authors

1. **Contextual first** — when documenting a feature that displays or depends on a sibling, say so in that page (one clear sentence + link).
2. **Update this table** when you add or remove a real edge.
3. **Do not invent** — if code does not wire it, do not claim it.

## See also

- [On-ramp](./ONRAMP.md) — wire hooks; shared SessionStart etiquette with sage
- [CI recipe](./CI.md) — `atlas check` as the vault honesty gate
- [Examples](../examples/README.md) — sage adapter + oracle budget hint + solo baseline
