---
type: spec
summary: "Local-first debug telemetry for memory-atlas: OFF by default on publish; fleet enables via global config; JSONL events + atlas telemetry report for performance/improve."
status: approved
created: 2026-07-28
tags: [telemetry, fleet, debug, privacy, zero-dep]
---

# Telemetry — local-first fleet debug

## Intent

With 34 consumer repos, observe how the toolkit **performs and fails** so we can improve it. Not public product growth analytics.

| Rule | Value |
|------|--------|
| Published default | **OFF** |
| Fleet (manjaro) | **ON** via `~/.config/memory-atlas/config.json` once |
| Storage | Local JSONL only (v1) |
| Network | None in v1 |
| Deps | Zero (Node builtins) |
| Privacy | No vault note content, no free-text paths/queries |

## Control plane

Priority (first decisive wins):

1. `ATLAS_TELEMETRY=0|false` → off  
2. `--no-telemetry` → off  
3. `ATLAS_TELEMETRY=1|true` → on  
4. Global `~/.config/memory-atlas/config.json` → `telemetry.enabled`  
5. Repo `atlas.config.json` → `telemetry.enabled`  
6. Default → **false**

## Storage

```
~/.cache/memory-atlas/events.jsonl
~/.cache/memory-atlas/install-id
```

## Events

One event per finished CLI command (not `status --hook`, not `telemetry *`).

Fields: `v`, `ts`, `cmd`, `argv_shape`, `exit`, `ms`, `atlas_version`, `install_id`, `node`, `os`, `repo_id` (path hash), optional `vault` counts, optional `freshness`, optional `result.class`.

## CLI

`atlas telemetry status|report|dump|clear|on|off`

## Emit guarantees

Never throws; never changes command exit code; &lt;5ms typical overhead.
