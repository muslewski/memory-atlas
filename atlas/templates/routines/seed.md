# Atlas seed routine (initial zones)

One-shot bootstrap for an empty or near-empty vault. Cadence: **on demand**
after `atlas init` / fleet ensure-all — not a recurring garden.

This is a **write** pass (unlike gardening). Keep honesty: every new zone is
`status: seeded` + `verifiedAt: unverified`.

## 0. Confirm empty

- Run `atlas status`. If zone count ≥ 4 and cards look intentional, **stop**
  and use recollection instead.
- Read vault `map/overview.md` if present.

## 1. Analyze the codebase (do not invent)

- README / package manifest / AGENTS.md
- Top-level dirs; entrypoints under `bin/`, `src/`, `lib/`, `packages/`, `app/`
- `git ls-files` samples for candidate globs
- Skip `node_modules`, `dist`, build outputs

Live status footer (substituted when printed via `atlas routine seed`):

```
{{STATUS_LINE}}
```

## 2. Partition into 4–8 zones

Follow skill **atlas-seed** (package skill `skills/atlas-seed/SKILL.md`).
Each zone = one coherent subsystem with `owns.globs` that match tracked files.

## 3. Author cards

- Write `map/zones/<slug>.md` using vault `templates/zone.md`
- Apply **writing-for-retrieval** to every `summary` and `##` section
- Update `map/overview.md` thesis + zone list
- Do not invent ADRs; optional single tech-debt if systemic

## 4. Build

```bash
atlas build
atlas status
atlas check   # fix parse / empty-glob failures before finishing
```

## 5. Report

Bullet list: `slug` — one-line purpose. Note that all cards remain **seeded**
until human stamp.
