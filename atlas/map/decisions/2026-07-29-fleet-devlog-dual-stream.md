---
type: decision
summary: "Emit fleet-devlog v1 alongside legacy local telemetry; contract repo_id for the new stream only; enable only via env/machine config."
status: accepted
created: 2026-07-29
tags: [fleet-devlog, telemetry, privacy, zero-dep]
---

# Dual-stream fleet-devlog during deprecation window

## Context

Four fleet tools each had (or lacked) a private local event log with different
install-ids and schemas, so cross-tool questions could not be answered. The
fleet-devlog v1 contract defines one shared `$XDG_STATE_HOME/fleet-devlog/` stream.

## Decision

1. **Vendor** `lib/fleet-devlog.mjs` byte-identical to the work-kb reference (checksum test).
2. **Emit both** the legacy `~/.cache/memory-atlas/events.jsonl` stream and fleet-devlog
   during the deprecation window — nothing that reads the old file breaks.
3. **Enable** only via `FLEET_DEVLOG` / `--no-devlog` / machine config. Repo
   `atlas.config.json` is never an enable source for fleet-devlog.
4. **Contract `repo_id`** for fleet events only (`basename-sha2568` of main root).
   Legacy `repoId()` stays path-hash-12 so historical rows remain interpretable.

## Consequences

Shared `install_id` across tools on one machine. Strangers who clone still log
nothing. Drift is caught by the vendored checksum test when work-kb is present.
