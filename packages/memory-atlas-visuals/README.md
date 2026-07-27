# memory-atlas-visuals

Optional **presentation plane** for [memory-atlas](https://www.npmjs.com/package/memory-atlas) vaults.

- **Core (`memory-atlas`)** = data plane (zones, stamp, check) — zero runtime deps  
- **This package** = Vite + React gallery for frozen MDX digests, kit primitives, diagrams  
- **Your vault** keeps content only: `visuals/illustrated/`, `visuals/files/`

## Install (consumer repo)

```bash
npm i -D memory-atlas memory-atlas-visuals
```

In `atlas.config.json`:

```json
{
  "vaultDir": "my-atlas",
  "visuals": {
    "enabled": true,
    "dir": "visuals",
    "package": "memory-atlas-visuals",
    "port": 4555,
    "concurrentDev": true
  }
}
```

```bash
npx atlas visuals init --write   # content tree under vault
npx atlas wire all               # vendors atlas-skin skills when peer present
npx atlas-visuals dev            # gallery on :4555
# or: npx atlas visuals dev
```

## Env

| Variable | Meaning |
|----------|---------|
| `ATLAS_VISUALS_ROOT` | Absolute/relative path to `visuals/` (illustrated + files) |
| `ATLAS_VAULT` | Vault root (uses `<vault>/visuals` unless ROOT set) |
| `ATLAS_VISUALS_PORT` | Dev/preview port (default 4555) |
| `PIXABAY_API_KEY` | Optional heroes via `atlas-visuals stock` |

## Layout

```
my-atlas/                    # vault (atlas.config vaultDir)
  map/ zones/ specs/ …
  visuals/                   # presentation content (excluded from agent search)
    illustrated/<skin>/…mdx
    files/diagrams|stocks/
    visuals.config.json
# gallery app lives in node_modules/memory-atlas-visuals — not in the vault
```

## Skills (vendored by `atlas wire` when enabled)

- `atlas-skin` — skin a note → MDX digest  
- `atlas-visuals-kit` — composition craft  
- `excalidraw-diagrams` — diagram craft bar  

## concurrentDev

When `visuals.concurrentDev: true`, run the gallery **alongside** product `dev` (two processes). Core does not inject into Next/Vite of your app — wire it in your repo scripts if you want one command:

```json
"dev:all": "concurrently \"pnpm dev\" \"atlas-visuals dev\""
```

## License

MIT
