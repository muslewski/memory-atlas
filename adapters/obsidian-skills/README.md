# Obsidian skills — an alternative to the ctx-search adapter

An Atlas is a plain-markdown Obsidian vault, so a repo that already leans on
Obsidian tooling can skip the ctx-search adapter (`adapters/ctx-search/`)
entirely and use Obsidian's own official agent skills instead. This is a
pointer, not a vendored copy — nothing here is code.

**Canonical upstream:** [`kepano/obsidian-skills`](https://github.com/kepano/obsidian-skills)
— MIT licensed, published by Steph Ango (`@kepano`), Obsidian's CEO.
Verified 2026-07-09: MIT `LICENSE` in the repo root, and the README lists
exactly five skills.

Install as a Claude Code plugin:

```
/plugin marketplace add kepano/obsidian-skills
/plugin install obsidian@obsidian-skills
```

(The repo also documents `npx skills add`, and manual install paths for
Codex/OpenCode — see its README.)

## The five skills, and what they're actually for

| Skill | What it does | Relation to the Atlas |
|---|---|---|
| `obsidian-markdown` | Author Obsidian-flavored markdown — wikilinks, embeds, callouts, properties | Authoring — complements `writing-for-retrieval` |
| `obsidian-bases` | Author `.base` view/filter/formula files | Authoring |
| `json-canvas` | Author `.canvas` files | Authoring |
| `defuddle` | Extract clean markdown from web pages | Authoring (source material for notes) |
| `obsidian-cli` | Query/interact with a vault via the Obsidian CLI | **Retrieval** |

**Read this accurately:** four of the five are vault-file *authoring* skills
— they help an agent write well-formed Obsidian markdown, bases, and
canvases, which is a companion concern to `writing-for-retrieval`, not a
replacement for it. Only `obsidian-cli` does retrieval, and it requires the
Obsidian application plus its CLI to be installed and the vault open — so it
is a genuine alternative retrieval path *where Obsidian is present*, and a
formats companion everywhere else, including repos that never open the
vault in the Obsidian app at all.

If a repo has no Obsidian install and no context-mode plugin, plain grep
over the vault's markdown always works — the Atlas convention never
requires either adapter.
