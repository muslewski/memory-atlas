# Atlas dogfood vault (this repository)

This folder is the **memory-atlas** project’s own mind: code-verified map of
`bin/`, `lib/`, skills, and config. Agents working on **this** codebase start
at [`map/index.md`](./map/index.md).

## npm vs this vault

| | |
|--|--|
| **Published on npm** | CLI (`atlas` / `memory-atlas`), `lib/`, `skills/`, `templates/`, `schema/`, docs — see root `package.json` → `files` |
| **Not on npm** | This `atlas/` directory (dogfood data only) |

Installing `memory-atlas` from npm never includes this vault or any other
repo’s `*-mind/`. Adopting projects create their own vault with `atlas init`
and optionally commit it in **git**.

## Agent loop

1. Orient → `map/index.md` → zone → code  
2. Work  
3. Recollect → `atlas stamp <slug>` → `atlas build` / `atlas check`

```bash
npx memory-atlas status
npx memory-atlas build
npx memory-atlas check
```

Convention: [SPEC.md](../SPEC.md) · site: [atlas.muslewski.com](https://atlas.muslewski.com).

## Contributing with the mind

Updating this vault when you change architecture is an **informal** habit that
improves PR quality for the next human or agent — not a formal review gate.
See the repo **CONTRIBUTING.md** (Project mind section). Skip for pure typos.


## Internal notes (not public docs)

| Path | What |
|------|------|
| `reports/LAUNCH-CHECKLIST.md` | Launch checklist (moved from `docs/`) |
| `reference/RELEASING.md` | Release process (moved from `docs/`) |
| `specs/` · `plans/` | Design & implementation notes |

Public guides remain in [`../docs/`](../docs/).
