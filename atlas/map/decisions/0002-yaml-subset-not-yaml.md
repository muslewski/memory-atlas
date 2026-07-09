---
type: decision
summary: "lib/frontmatter.mjs parses only the subset of YAML the note templates emit, by design — not a general-purpose YAML parser and never meant to become one."
tags: [architecture, parsing]
status: active
created: 2026-07-09
updated: 2026-07-09
decided: 2026-07-03
supersededBy: ""
zones:
  - vault-io
related:
  - [[0001-zero-dependency-constraint]]
sources: []
---

## Context

Every note's frontmatter (SPEC.md §3) needs to be parsed without a runtime
YAML dependency (see [[0001-zero-dependency-constraint]]). Full YAML is a
large surface — multi-line scalars, anchors/aliases, flow maps, arbitrary
nesting depth — most of which no Atlas note template ever emits.

## Decision

`lib/frontmatter.mjs` implements exactly the subset its own header comment
enumerates: `key: scalar` lines, inline arrays (`key: [a, "b", 3]`), block
arrays of scalars, block arrays of one-level maps (e.g. `invariants:`), one
level of nested maps (e.g. `owns:`), and `# comment` stripping. It
explicitly does NOT support multi-line scalars, flow maps, anchors/aliases,
tab indentation, more than one level of map nesting, or arbitrary-depth
block-array-of-arrays — these throw or mis-parse, on purpose. The module
header states the constraint directly: "a deliberate constraint, not a
general YAML parser — resist the temptation to grow it into a general one."

## Why

A general YAML parser is both a large dependency (violating
[[0001-zero-dependency-constraint]]) and a large attack/complexity surface
for a format only ever hand-written by a human or an agent following this
project's own templates. The consequence runs the other direction too: the
templates under `templates/notes/*.md` define the *writable* shape of a
note's frontmatter — SPEC.md's Interop section notes the same discipline
for `owns.globs`' block-list style, "so zero-dependency line-scanner
adapters in companion tools can parse them without a full YAML parser."
Any future template change that wants a YAML feature outside this subset
(e.g. a multi-line scalar for a long `summary`) must extend the parser
deliberately, in the same commit as the template change — not assume the
parser already handles it.
