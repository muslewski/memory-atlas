---
type: spec
summary: "Two-tier package freshness so consumer repos follow memory-atlas: registry lag (soft) + wired lag (warn default, fail when strict); atlas gate for predev/CI."
status: approved
created: 2026-07-28
tags: [package-freshness, fleet, gate, dry, update]
---

# Package freshness — fleet follow design

## Intent

Mind **tooling** evolves only in `memory-atlas`. Consumer vaults (`*-mind/`) keep **content**. Repos must **follow** the package:

1. **Tier B — Registry lag (soft always in warn mode)**  
   Published npm latest > installed package version → tell the human/agent to bump the dep.
2. **Tier A — Wired lag**  
   Installed package ≠ `.atlas-state.json` `atlasVersion`, or pending migrations → run `atlas-update` (migrate + wire).  
   Default **warn**; **fail** only when `check.packageFreshness.mode: "fail"` or CLI `--strict`.

Approach: **core owns gates** (single SSOT). Network is optional, TTL-cached, fail-open (zero runtime deps).

## Config

```json
"check": {
  "packageFreshness": {
    "mode": "warn",
    "registry": true,
    "wired": true,
    "registryTtlHours": 24
  }
}
```

Defaults as above. Unknown keys still ignored by the tolerant loader.

## Surfaces

| Command | Behavior |
|---------|----------|
| `atlas status` | Vault line + soft lines for enabled tiers (always exit 0; SessionStart-safe) |
| `atlas doctor` | Inventory lines for both tiers; always exit 0 unless `--strict` |
| `atlas gate [--strict]` | Consumer predev/CI entry: print findings; exit 1 only in fail/strict when issues |

## Registry probe

- Prefer `npm view memory-atlas version` (PATH), timeout ~2.5s, fail-open.
- Cache result in `.atlas-state.json` → `updateCheck: { checkedAt, latest, source }`.
- Re-query only when cache older than `registryTtlHours` (unless force).
- Offline / no npm → no registry line (not a failure).

## Wired probe

Existing semantics: `packageVersion()` vs `state.atlasVersion`; plus `pendingMigrations`.

## Non-goals

- Auto-bump package.json or auto-migrate on status.
- Moving vault content into the npm package.
- Hard-fail bare `pnpm dev` by default (consumers opt in via config or `atlas gate --strict` in CI).

## Consumer recipe

```json
"predev": "atlas gate",
"scripts": { "check": "… && atlas gate --strict && atlas check" }
```

Content-preserving cutover (Syndcast/Delieta/Eventizer) is a separate adoption wave after this engine ships.

## Success

- Unit/integration tests cover both tiers, cache, fail-open, warn vs fail.
- `atlas gate` usable from predev without blocking by default.
- Doctor/status remain fail-open for SessionStart etiquette.
