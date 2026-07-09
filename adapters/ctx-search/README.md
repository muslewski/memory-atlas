# ctx-search adapter

A reference adapter that keeps a [context-mode](https://github.com) `ctx_search`
index fresh for a repository that has an Atlas. It indexes two buckets — your
code and the Atlas vault — so `ctx_search` results come back tagged
`Source: code:…` / `Source: atlas:…` and a bare `ctx_search` call (no
`project` param) just works, because both buckets are keyed to the repo root.

This is optional. An Atlas is plain markdown and greppable by any tool; this
adapter exists for repos that already use the context-mode MCP plugin and
want the index kept warm automatically. If your repo prefers Obsidian's
official agent skills instead, see `adapters/obsidian-skills/README.md`.

## Install

1. Copy `nav-refresh-index.mjs` into your repo at `scripts/nav-refresh-index.mjs`.
   The script auto-detects the repo root from its own location (two
   directories up), so it must live at `<repo>/scripts/nav-refresh-index.mjs`
   for that detection to resolve correctly.
2. Wire it into `.claude/settings.json` as a `SessionStart` hook, alongside
   `atlas status`:

   ```json
   {
     "hooks": {
       "SessionStart": [
         { "hooks": [
           { "type": "command", "command": "npx --no-install atlas status" },
           { "type": "command", "command": "node scripts/nav-refresh-index.mjs" }
         ]}
       ]
     }
   }
   ```

3. Make sure the context-mode Claude Code plugin is installed
   (`/plugin install context-mode@context-mode`) — the script resolves its
   CLI bundle from the plugin cache and no-ops with a logged error if it
   can't find one.

## What it does

- **Detects buckets automatically.** Code: the first of `src/`, `app/`,
  `lib/`, `components/` that exists. Atlas: the first sibling directory
  whose *structure* looks like a vault (`map/index.md` or `map/zones/`
  present) — falling back to a `-atlas`, `-mind`, or `-brain` name suffix if
  structure detection finds nothing.
- **Keys both buckets to the repo root**, distinguished by `--source
  code|atlas`, so the MCP `ctx_search` tool's default project (the cwd) picks
  up both without the caller passing an explicit `--project`.
- **Respects `retrieval.excludeFromSearch`.** It reads
  `atlas.config.json` → `retrieval.excludeFromSearch` (default `["drafts/",
  "visuals/"]` per SPEC.md) and passes each entry to the CLI's own `--exclude
  <glob>` flag (confirmed present via `node <cli> --help` → "Index options:
  `--exclude <glob>` Directory exclude pattern, repeatable") when indexing
  the atlas bucket. No invented flag — this is the CLI's documented
  mechanism.
- **10-minute staleness guard.** A `.navidx.stamp` file in the repo root
  records the last successful run; a SessionStart hook invocation younger
  than 10 minutes since the last stamp is a no-op. Pass `--force` to bypass
  it (`node scripts/nav-refresh-index.mjs --force`).
- **PID lock.** `.navidx.lock` prevents two concurrent workers; a lock older
  than the 10-minute window is treated as stale and reclaimed.
- **Self-detaching.** The hook invocation (no flags) spawns a detached
  `--worker` child and returns in under a second — indexing itself can take
  well over a second and must never block session startup. The stamp is only
  written once ALL buckets index successfully; a partial failure leaves the
  stamp stale so the next SessionStart retries.
- **Logs to `.navidx.log`** in the repo root (timestamps, per-bucket timing,
  errors).

Do NOT set `CONTEXT_MODE_DIR` when invoking the CLI: that overrides the
storage root on write, while the MCP `ctx_search` reader always uses the
default global root — so writes and reads end up in different stores and
reads come back empty. Use `--project` for DB identity only; the script
already does this correctly and the source carries the warning verbatim.

## Known limitation

The exclusion mechanism depends on the installed context-mode CLI actually
supporting `--exclude <glob>` (verified present as of the version checked
during authoring). If a future CLI version drops or renames that flag, the
adapter will pass an unrecognized argument — check `node <cli> --help`
output for the current flag set before filing that as a bug in this
adapter.

Files this script creates in your repo root (`.navidx.lock`, `.navidx.log`,
`.navidx.stamp`) are working state, not vault content — add them to
`.gitignore`.
