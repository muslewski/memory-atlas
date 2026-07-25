---
type: decision
summary: "Ship profile code|operator + atlas search (rg floor) for dual dogfood (product minds + Hermes ops) without MCP lock-in."
tags: [profile, search, hermes, dual-dogfood]
status: accepted
created: 2026-07-25
updated: 2026-07-25
---

## Context

Hermes dual-atlas research (Q4) asked for `code | operator` profiles and a portable retrieval floor so Grok/Hermes can dogfood vaults without Claude MCP-only ctx_search. Hermes Tier A consumer landed 2026-07-25.

## Decision

1. Config `profile` + `atlas init --profile operator|code`
2. Code profile keeps HARD empty-glob error; operator softens to warning
3. `atlas search` is the rg-first floor for all hosts

## Consequences

- Hermes sets `profile: operator` on hermes-mind
- Product minds stay `code` (default)
- Not a MemoryProvider / warm bank