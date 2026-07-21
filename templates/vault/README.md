# Atlas mind (this repository)

Code-verified knowledge vault for **this repo** — architecture map (zones),
decision ledger, specs/plans, and tech-debt. Agents orient here before
touching code.

| Start | Path |
|-------|------|
| Map index | [`map/index.md`](./map/index.md) |
| Zones | `map/zones/` |
| Decisions | `map/decisions/` |
| Specs / plans | `specs/` · `plans/` |
| Tech debt | `tech-debt/` |

## Agent loop

1. **Orient** — `map/index.md` → relevant zone card → code.
2. **Work** — change code with zone claims in mind.
3. **Recollect** — update touched zones, `atlas stamp <slug>`, `atlas build` / `atlas check`.

```bash
npx memory-atlas status
npx memory-atlas build
npx memory-atlas check
npx memory-atlas stamp <zone-slug>
```

## Powered by [memory-atlas](https://github.com/muslewski/memory-atlas)

This directory is **vault data in git**, not part of the `memory-atlas` **npm**
tarball. `npm install memory-atlas` only installs the CLI/skills/templates;
it does **not** download this mind or any other project’s mind. Commit the
vault next to your code so agents and clones see it; keep it out of your
own package’s `files` field if you publish a library on npm.

Site: [atlas.muslewski.com](https://atlas.muslewski.com).

## Contributing with the mind

Updating this vault when architecture moves is an **informal** habit that
improves PR quality for the next human or agent — not a formal review gate.
See the repository **CONTRIBUTING.md** if present. Skip for pure typos.

Do not hand-edit generated `map/index.md`.
