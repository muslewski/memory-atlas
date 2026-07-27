# Minimal vault (memory-atlas-visuals)

Self-contained Atlas vault used as a **fixture** for path resolution tests and local dogfood of the companion CLI.

- `vaultDir: "."` — this directory *is* the vault
- `visuals.enabled: true` — presentation plane opted in
- One note: `specs/hello.md`
- Empty content trees under `visuals/illustrated/` and `visuals/files/diagrams/`

## Run `atlas-visuals` against this vault

From the **package root** (`packages/memory-atlas-visuals`):

```bash
# Resolve paths only (works in 0.1.0 scaffold — no gallery app required)
ATLAS_VAULT=./examples/minimal-vault node bin/atlas-visuals.mjs status

# Absolute path also fine
ATLAS_VAULT=/absolute/path/to/examples/minimal-vault node bin/atlas-visuals.mjs status
```

Or after linking/installing the package in a consumer repo:

```bash
ATLAS_VAULT=path/to/examples/minimal-vault atlas-visuals status
```

### `dev` / gallery

`atlas-visuals dev` is reserved for the packaged Vite gallery (not in this scaffold yet). Until cutover:

1. Point a local `visuals/app` at this vault’s `visuals/` tree, **or**
2. Use a dual-run consumer (e.g. Syndcast’s `syndcast-mind/visuals/app`) with:

   ```bash
   ATLAS_VAULT=/path/to/examples/minimal-vault
   # plus that app’s own dev script / port (default visuals.port = 4555)
   ```

Core bridge (when peer is installed in a real repo):

```bash
atlas visuals status
atlas visuals dev   # spawns peer bin when present
```

## Layout

```
minimal-vault/
  atlas.config.json
  map/index.md
  map/zones/
  specs/hello.md
  visuals/
    visuals.config.json
    illustrated/default/specs/
    files/diagrams/
```
