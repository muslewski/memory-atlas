# Changelog

## 0.1.0 — Unreleased

### Added
- Initial extract of Atlas Visuals (Vellum) gallery engine from Syndcast dogfood
- Path resolver: `ATLAS_VISUALS_ROOT` / `ATLAS_VAULT` / `atlas.config.json` / legacy parent-of-app
- CLI `atlas-visuals` (dev, preview, build, manifest, check, stock, status)
- Skills: `atlas-skin`, `atlas-visuals-kit`, `excalidraw-diagrams`
- Example fixture vault under `examples/minimal-vault/`
- Kit catalog, Excalidraw diagram checks, digest freshness (`check:stale`)

## 0.1.1

- Fix consumer vault content resolution: rewrite Vite globs to ATLAS_VISUALS_ROOT so diagrams/digests/heroes load from the vault when the package runs from node_modules.
- Normalize glob keys via content-keys helper.
