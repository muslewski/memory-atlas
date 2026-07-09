---
type: decision
summary: "memory-atlas ships with zero runtime dependencies — every file under lib/ imports only Node built-ins (node:fs, node:path, node:child_process, node:url) or a sibling lib/*.mjs file."
tags: [architecture, supply-chain]
status: active
created: 2026-07-09
updated: 2026-07-09
decided: 2026-07-03
supersededBy: ""
zones:
  - verifier-core
  - vault-io
related: []
sources: []
---

## Context

An Atlas is meant to be adopted into an arbitrary consumer repo's own
dependency tree — every `package.json` this CLI touches (via `npx`, a
global install, or a vendored copy) is a repo the tool's author does not
control. `package.json` here carries only `devDependencies` (`@biomejs/biome`,
for lint only); `dependencies` is absent entirely.

## Decision

No entry in this package's `dependencies` is permitted, ever. `lib/config.mjs`
does not depend on a JSON-schema validator. `lib/frontmatter.mjs` does not
depend on a YAML library. `lib/resolvers.mjs` shells out to the `git`
binary via `node:child_process` rather than depending on a JS glob library
(`minimatch`, `globby`, …) to resolve `owns.globs`.

## Why

Three reasons, in order of how concretely they bit in practice on this
project's owner's own prior tooling (per the origin audit this project's
planning drew on): **install-surface** — a zero-dep CLI installs instantly
and has nothing to break across a consumer's own lockfile resolution;
**supply-chain** — every transitive dependency is an audit surface a
security-conscious adopter has to accept, and a knowledge-base convention
asking a team to trust its supply chain is a harder sell than one that
doesn't need to; **family bar** — this project is one of a family of
sibling developer tools (see SPEC.md's Interop section) that share this
constraint as a baseline expectation for anything meant to sit close to a
consumer's own build. The consequence for this repo's own code is direct:
`lib/frontmatter.mjs` is a hand-rolled parser for a deliberate YAML
*subset* rather than pulling in `js-yaml` — see
[[0002-yaml-subset-not-yaml]] for that follow-on decision.
