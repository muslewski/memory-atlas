# Contributing

Thanks for considering a contribution to memory-atlas.

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
- **The vault moves with the code.** This repo dogfoods its own convention
  (`atlas/`): if your change touches a zone's owned files, update that
  zone card, re-stamp exactly it (`atlas stamp <slug>` — never a blanket
  re-stamp; there is no "all zones" shortcut), and commit the regenerated
  `atlas/map/index.md` together with the code change, not as a follow-up.
  `atlas check` runs in CI and fails a PR that lets the vault drift from the
  code it describes.

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
