---
type: decision
summary: "A skill installed at user scope (ATLAS_USER_SKILLS_DIR or ~/.claude/skills) satisfies atlas wiring; wire does not re-vendor it. State records source:user-scope. Re-vendor findings flag redundant or divergent repo copies without guessing which side is newer."
status: accepted
created: 2026-07-30
tags: [skills, wire, user-scope, drift, provenance]
zones:
  - cli
  - config
related: []
sources: []
---

# User-scope skills satisfy wiring

## Context

Six Atlas skills were vendored into five fleet repositories (30 copies). Content
hashes already silently diverged across repos — including three distinct
versions of `atlas-recollection`, none matching the package canonical. Every
common drift tool compares "installed versus upstream"; none compares "repo A
versus repo B", so fleet-wide skill drift was invisible.

Installing the canonical skills once at **user scope** (agent skill search
path) is the correct shared install. Vendoring a second copy into every repo is
redundant, re-creates divergence on the next `atlas wire`, and blocks later
deletion of vendored copies until wire/check/doctor/gate agree that user-scope
is enough.

## Decision

1. **User-scope satisfies wiring.** Default:
   `skills.vendorInRepo: false`. When
   `<user-skills>/<name>/SKILL.md` exists, `atlas wire` does **not** copy that
   skill into `config.skills.dir`. Location resolution order:
   - explicit test/opts inject
   - env **`ATLAS_USER_SKILLS_DIR`**
   - `<homedir()>/ .claude/skills`

2. **Explicit opt-in to keep repo copies.** Repos that genuinely need a
   committed vendored tree set `"skills": { "vendorInRepo": true }`. Then wire
   vendors as before and re-vendor findings are suppressed (the dual presence
   is deliberate).

3. **State representation.** `.atlas-state.json` `vendored["skills/<name>/SKILL.md"]`
   records either:
   - `{ sha256, atlasVersion, source: "user-scope" }` — satisfied at user scope;
     doctor hashes the user-scope path, not a missing repo file
   - `{ sha256, atlasVersion, source: "repo" }` — vendored into the repo

   Transitioning to user-scope **replaces** any prior repo claim so doctor never
   reports `✗ missing` for a path that was intentionally not written.

4. **Re-vendor check (doctor + gate).** When a package skill exists at **both**
   user-scope and the repo skills dir (and `vendorInRepo` is not true):
   - identical hashes → **redundant** (safe to delete the repo copy)
   - different hashes → **drift** (report both paths and both full hashes)

   User-scope only → silent (correct). Atlas **never assumes either side is
   newer** — it has no trustworthy clock or provenance for that claim. Drift
   output says so explicitly; a human chooses which wins.

5. **Agreement surface.** `lib/skills.mjs` is the single resolution + finding
   module. Wire, doctor, and gate all import it so skip/satisfy/report cannot
   disagree. Re-vendor findings are always soft on gate exit (human choice);
   package-freshness still owns gate fail mode.

## Consequences

- With user-scope populated, a fresh `atlas wire` on a scratch repo creates no
  `.claude/skills/<atlas-*>` copies for those skills.
- With user-scope empty, behaviour matches the previous release (vendor +
  `source: "repo"`).
- Fleet can delete vendored skill trees without breaking wire/gate once
  user-scope is installed; redundant/drift checks guide the cleanup.
