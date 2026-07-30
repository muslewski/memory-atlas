---
title: "Troubleshooting"
description: "Literal atlas error messages, what they mean, the fix command, and what atlas doctor checks today."
section: guide
order: 32
---

# Troubleshooting

When `atlas` fails, match the **literal message** below. Every line on this
page was reproduced with `node bin/atlas.mjs` (package **0.5.4**) on a real
git repo. If a command and this page disagree, trust the command.

Full verb catalogue: [Command reference](./COMMANDS.md). Write-path refusals:
[Containment and honesty](./containment.md).

## Quick happy path (works after init)

In a git repository with at least one commit:

```bash
npm i -D memory-atlas
npx atlas init --vault atlas
npx atlas check
# → atlas check: ok
```

Empty vault (no zone cards yet) is valid. Seed cards under `map/zones/`, then
`atlas stamp <slug>` → `atlas build` → `atlas check`.

---

## `atlas: command not found` (exit 127)

**Means:** the shell has no `atlas` binary on `PATH`. The package installs a
bin under the project's `node_modules`, not globally.

**Fix:**

```bash
# After npm i -D memory-atlas in the consumer repo:
npx atlas <command>
./node_modules/.bin/atlas <command>

# In a memory-atlas source checkout:
node bin/atlas.mjs <command>
```

Do not assume `atlas` is on `PATH`. Prefer `npx atlas` in consumer repos.

---

## `atlas: no git repository found above the current directory`

**Means:** you are not inside a git working tree (or any parent of one).
Almost every verb needs a repo root.

**Exit:** **1** for `check`, `build`, `stamp`, and other vault verbs that
call `resolveVault`.

**Fix:**

```bash
cd <your-repo>   # directory that contains .git
# or: git init && git commit (empty tree is not enough — need ≥1 commit for useful stamps)
```

`atlas status` still exits **0** outside a git repo (fail-open, often silent).
`atlas doctor` also exits **0** and prints a partial inventory (no lockfile).

---

## `atlas: no Atlas vault found — run \`atlas init\` first`

**Means:** a git root was found, but no Atlas vault directory (no
`map/zones/` structure / configured vault).

**Exit:** **1** for `check` / `build` (and similar). Stamp prints
`atlas stamp: no Atlas vault found — run \`atlas init\` first` and exits **1**.

**Fix:**

```bash
npx atlas init --vault atlas
# or omit --vault to get <repo-dirname>-atlas
npx atlas check
# → atlas check: ok
```

### Does check fail right after init?

**No (observed on 0.5.4).** `atlas init` creates a vault that `atlas check`
accepts with zero zones:

```
atlas check: ok
```

Exit **0**. An empty structure is not an error; there is nothing to verify yet.

---

## `error: zone <id>: status "active" requires a commit SHA or "unverified" for verifiedAt, found "…"`

**Means:** `verifiedAt` is not one of the two legal encodings. ISO calendar
dates (`2026-07-30`), empty strings, and other garbage are **hard errors**.
They never count as "fresh".

Observed:

```
error: zone demo: status "active" requires a commit SHA or "unverified" for verifiedAt, found "2026-07-30"
```

```
error: zone bad: status "active" requires a commit SHA or "unverified" for verifiedAt, found ""
```

**Exit:** **1** (`atlas check`).

**Fix:** set a real short SHA (after review) or the sentinel `unverified`:

```yaml
# Not yet verified (or stamp invalidated by merge):
status: active          # or seeded
verifiedAt: unverified

# After review against current HEAD:
#   npx atlas stamp <slug>
# writes verifiedAt: <8-char HEAD sha>
```

Do **not** write today's date into `verifiedAt`. Dates are not SHAs.

### Seeded zones

`status: seeded` is stricter: it **requires** `verifiedAt: unverified`. A date
(or a SHA) on a seeded card is also a hard error:

```
error: zone bad: status "seeded" requires verifiedAt "unverified", found "2026-07-30"
```

---

## `error: zone <id>: file "…" owned by N zones: a, b, …`

**Means:** two or more **mounted** zones expand `owns.globs` to the same
tracked file. Ownership is single-source-of-truth — one artifact, one owner.

Observed:

```
error: zone demo: file "f" owned by 2 zones: demo, other
```

**Exit:** **1**.

**Fix:** edit the cards so each tracked path appears in only one zone's
positive globs (use `:(exclude)…` / `:!…` pathspecs to narrow, not to claim).
Then rebuild and re-check:

```bash
# edit map/zones/*.md owns.globs
npx atlas build
npx atlas check
```

Unmounted zones are ignored for this check. Set `check.ownership: false` in
`atlas.config.json` only if you deliberately opt out (not recommended).

---

## `atlas check: map/index.md is out of date — run \`atlas build\` (working-tree index must match a fresh render)`

**Means:** the on-disk `map/index.md` does not match what a fresh render would
write **right now**. This is a working-tree comparison, not "must equal git
HEAD". Editing zone cards (or anything that changes the rendered index)
without rebuilding triggers it.

Observed after changing a zone `summary` without `atlas build`:

```
atlas check: map/index.md is out of date — run `atlas build` (working-tree index must match a fresh render)
```

**Exit:** **1** when `check.indexSync` is enabled (the default). Set
`check.indexSync: false` in config to skip this comparison.

**Fix:**

```bash
npx atlas build
npx atlas check
# → atlas check: ok
```

Workers in a parallel fleet should not stage `map/index.md`; the integrator
runs `build` once. See [Recollecting in parallel](./recollecting-in-parallel.md).

---

## `atlas check: warning: N stale zone(s): …` / `error: N stale zone(s)`

**Means:** for those zones, `git diff <verifiedAt>..HEAD` over `owns.globs`
shows changes (or the SHA is unresolvable — see below). By default this is a
**warning** and does **not** fail the command.

```
atlas check: warning: 1 stale zone(s): z
atlas check: ok
```

Exit **0** unless `check.strictFreshness: true` in `atlas.config.json`, which
labels the same line `error` and exits **1**.

**CLI flag note:** `atlas check --strict` is advertised in help but **does not
harden staleness**. Only the config key does. See [COMMANDS](./COMMANDS.md).

**Fix:**

```bash
# review the zone against current code, then:
npx atlas stamp <slug>
npx atlas build
npx atlas check
```

### Unknown / missing SHA in history

If `verifiedAt` looks like a SHA but git cannot resolve it:

```
warning: zone z: verifiedAt deadbeef not found in history
atlas check: warning: 1 stale zone(s): z
atlas check: ok
```

Still exit **0** by default (freshness shows stale, never silently "ok").
Re-stamp after review.

---

## `error: zone <id>: owns.globs is empty — code profile requires…`

**Means:** profile is `code` (default) and the zone claims no pathspecs.

```
error: zone z: owns.globs is empty — code profile requires at least one pathspec (or set profile: operator)
```

**Exit:** **1**.

**Fix:** add real globs, or use `--profile operator` at init / set
`profile: operator` for policy-only vaults (empty globs become warnings only).

---

## `warning: zone <id>: active with verifiedAt unverified — re-stamp after merge or review`

**Means:** legal encoding (active + `unverified`) after a stamp-invalidating
merge or deliberate un-verify. Not a hard failure.

**Exit:** does not by itself fail check.

**Fix:** when the card is reviewed again, `npx atlas stamp <slug>`.

---

## `atlas stamp: zone "…" not found (…/map/zones/….md)`

**Means:** no card file for that slug.

```
atlas stamp: zone "missing" not found (atlas/map/zones/missing.md)
```

**Exit:** **1**.

**Fix:** create `map/zones/<slug>.md` (or pass the correct slug). Stamp never
blanket-stamps; missing/unsafe slugs fail before any write.

---

## Silence: nothing printed, exit 0

**Means:** `atlas.config.json` has `"enabled": false`. Every command **except**
`init` prints nothing and exits **0** — a kill switch, not a green vault.

**Fix:** set `"enabled": true` (or remove the key) when you want the tool
active again.

---

## `atlas doctor` — what it checks today

`atlas doctor` is a **dry-run inventory**. It writes nothing. It does **not**
validate zone cards, ownership, or index sync (use `atlas check` for that).

### Exit behaviour vs fleet intent

Fleet intent often is: **nonzero only on hard/broken failures**; soft
"suboptimal" lines stay exit 0.

**What 0.5.4 does:**

| Condition | Marker in output | Exit without `--strict` | Exit with `--strict` |
|-----------|------------------|-------------------------|----------------------|
| Inventory printed; wiring/lockfile gaps | `✗` / `⚠` / `ℹ` | **0** | **0** (those marks alone never fail) |
| Package-freshness issues (wired lag, pending migrations, registry lag when enabled) | `⚠ update pending…`, `⚠ N migration(s)…`, `⚠ registry:…` | **0** | **1** + stderr `atlas doctor: strict — package freshness issues present` |
| Unexpected throw inside doctor | (may be partial) | **0** | **1** |

So: **`✗` lines are not hard failures.** Missing Claude SessionStart wiring,
missing lockfile, and "merge-driver not installed" all leave exit **0**.
Only **package freshness** (and only with `--strict`) flips the process to **1**.
That is narrower than a full broken-vs-suboptimal severity model.

Default after a plain `init` (no `atlas wire`):

```
✓ lockfile: atlasVersion 0.5.4
✓ version: installed 0.5.4 matches wired
✗ claude wiring: SessionStart atlas status --hook missing
✓ grok wiring: global drop-in present   # if global drop-in exists on this machine
✓ config: atlas.config.json version 1
ℹ merge-driver: not installed — run `atlas wire merge-driver` then `--write` (per-clone)
✓ registry: installed 0.5.4 is current (latest 0.5.4)
```

Exit **0**. With `--strict` and no freshness lag, still **0**.

### Inventory lines (in order of appearance)

| Line pattern | Meaning | Typical next step |
|--------------|---------|-------------------|
| `✗ no .atlas-state.json — run atlas wire` | No provenance lockfile | `npx atlas wire` (writes; not a dry-run) |
| `✓ lockfile: atlasVersion X` | Lockfile present | — |
| `✓ version: installed V matches wired` | Package version equals lockfile | — |
| `⚠ update pending (installed A, wired B) — run the atlas-update skill` | Version drift | Run the **atlas-update** skill (not invent flags) |
| `⚠ N migration(s) pending — run atlas migrate` | Versioned migrations not applied | `npx atlas migrate` (dry-run) then `--write` when ready |
| `✓` / `✗ claude wiring: SessionStart atlas status --hook …` | `.claude/settings.json` has/missing the hook | `npx atlas wire claude` or `wire` |
| `✓` / `✗ grok wiring: global drop-in …` | `~/.grok/hooks/atlas.json` (global) | `npx atlas wire grok` or `wire` |
| `✗ … malformed JSON` | Settings/hooks file not parseable | Fix JSON by hand; wire refuses malformed targets |
| `✓` / `⚠` / `✗` vendored keys (`CLAUDE.md#atlas:onramp`, `skills/…`) | Hash vs lockfile: pristine / locally edited / missing | Update skill path or accept AI-merge on next update |
| `✓ config: atlas.config.json version 1` | Supported config version | — |
| `⚠ config: … version N (supported: 1)` | Unexpected config version | Align config; see [CONFIG](./CONFIG.md) |
| visuals lines (`✓` / `⚠`) | Only if `visuals.enabled: true` | Install peer / `atlas visuals init --write` |
| `✓ merge-driver: atlas-index + atlas-zone configured` | Both local git merge drivers set | — |
| `⚠ merge-driver: partial — …` | Only one of the two drivers | `npx atlas wire merge-driver` then `--write` |
| `ℹ merge-driver: not installed — …` | Neither driver in local git config | Same; `.gitattributes` alone is inert |
| `✓` / `ℹ agentic-sage: …` | Optional; only if `sage` is on PATH | Copy adapter from `examples/with-agentic-sage` if wanted |
| `✓ registry: installed V is current (latest V)` | npm latest matches installed | — |
| `⚠ registry: memory-atlas X available (installed Y)` | Registry newer than installed | Bump dependency / reinstall |
| `ℹ registry: latest unknown (offline or cache empty)` | Could not learn npm latest | Network or wait for cache; fail-open |

### What doctor does **not** do

- Does not run zone validation, ownership SSOT, or index sync.
- Does not write hooks, lockfile, skills, or config (unlike `atlas wire`).
- Does not treat missing wiring (`✗`) as exit **1**.
- Is silenced entirely by `"enabled": false` (empty output, exit **0**).

### Related: `atlas gate`

Package-freshness only (same tiers). Default warn mode exits **0**;
`--strict` exits **1** when issues exist. See [COMMANDS](./COMMANDS.md).

---

## `atlas check` failure checklist

When check exits **1**, stderr may stack several classes:

1. **`error: …`** — structural / lifecycle / ownership / corpus (if enabled). Fix cards.
2. **Index out of date** — run `atlas build`.
3. **Ledger violations** — fix frontmatter on specs/plans/… (printed as plain lines).
4. **Stale zones as `error`** — only with `check.strictFreshness: true`; otherwise warning + still ok.

Success line (only when nothing hard failed):

```
atlas check: ok
```

`check` never writes files.

---

## Still stuck?

```bash
npx atlas --help          # index of primary verbs
npx atlas doctor          # wiring / lockfile / freshness inventory
npx atlas check --report  # + ledger: N/M clean line
npx atlas status          # one-line health (always exit 0)
```
