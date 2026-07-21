# Contributing

Thanks for considering a contribution to memory-atlas.

## The project mind (informal, high-leverage)

This repo dogfoods its own product: a markdown **Atlas** under [`atlas/`](./atlas/).
Think of it as a small **knowledge base beside the code** — not a second
product to maintain for its own sake.

| | |
|--|--|
| **What it is** | Zone cards + decisions that map *this* codebase for humans and coding agents |
| **Tone** | **Informal convention**, not a gatekeeping ritual |
| **Why it helps** | Better PR orientation, fewer “where does X live?” loops, higher quality agent-assisted edits, less architectural amnesia |
| **npm** | The vault is **git only** — `npm install memory-atlas` never downloads `atlas/` or anyone else’s mind |

### When to touch the mind

- **Please do** when your change moves architecture, ownership, or a hard invariant — update the relevant zone under `atlas/map/zones/`, then `atlas stamp <slug>` for zones you actually verified, and commit regenerated `atlas/map/index.md` with the code.
- **Skip without guilt** for typos, pure docs, or drive-by nits that don’t change how the system is shaped.
- **Honest over complete:** a short accurate `seeded` / `unverified` note beats a polished lie. Never blanket-stamp every zone.

Reading path for newcomers: `atlas/map/index.md` → one zone → code. That alone usually beats grepping cold.

If you maintain **another open-source repo** and want the same quality boost for *your* contributors, add a mind with `npx atlas init`, keep it in git (not in npm `files`), and point CONTRIBUTING at it the same way — optional, informal, quality-first. See README § *What is what (npm vs git)*.

## Community

| Kind | Where |
|---|---|
| Questions, ideas, show-and-tell | [Discussions](https://github.com/muslewski/memory-atlas/discussions) |
| Bugs & concrete feature requests | [Issues](https://github.com/muslewski/memory-atlas/issues/new/choose) |
| Security | [SECURITY.md](./SECURITY.md) — private only |

Please follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Ground rules

- **Zero runtime dependencies.** Nothing may be added under `dependencies`
  in `package.json` — this is a hard project constraint, not a preference.
  Dev tooling (currently just Biome) lives under `devDependencies` only.
- **`node --test` must stay green.** Run `npm test` before opening a PR.
- **Biome must stay clean.** `npm run lint` (`npx @biomejs/biome check .`)
  must exit `0`.
- **SPEC.md changes require enum-sync.** A lifecycle enum lives in two
  places: `SPEC.md`'s Lifecycles section (prose) and `lib/ledger.mjs`'s
  `LIFECYCLES` constant (code) — see the `MAINTENANCE` comment at the top of
  that file. Update both in the same commit, or the ledger linter silently
  drifts from the spec it exists to enforce.
- **Vault honesty (when you change owned code).** If your change touches a
  zone’s owned files, update that zone card, re-stamp *exactly* it
  (`atlas stamp <slug>` — never a blanket re-stamp), and commit the regenerated
  index with the code. `atlas check` runs in CI and fails PRs that let the
  vault drift. See *The project mind* above — small PRs need not invent
  ceremony.

## Getting started

```
git clone https://github.com/muslewski/memory-atlas.git
cd memory-atlas
npm install
npm test
node bin/atlas.mjs check
```

## Pull requests

- Keep changes scoped. Docs/typo fixes, feature work, and `SPEC.md` content
  changes are reviewed differently — a `SPEC.md` change is a convention
  change, not just a code change.
- Conventional-commit style messages are preferred (`feat:`, `fix:`,
  `docs:`, `test:`).
