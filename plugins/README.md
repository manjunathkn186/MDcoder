# Plugins

Drop-in plugin folder consumed by Inkstone at runtime.

## Structure

```
plugins/
├── README.md
└── <plugin-id>/
    ├── manifest.json    # validated against PluginManifest (zod)
    ├── index.js         # UI plugin entry (iframe-sandboxed)
    └── core.wasm        # optional WASM core plugin
```

## Manifest example

```json
{
  "id": "word-count",
  "name": "Word Count",
  "version": "0.1.0",
  "type": "ui",
  "entry": "index.js",
  "permissions": ["editor.command"],
  "contributes": {
    "commands": [{ "id": "wc.toggle", "title": "Word Count: Toggle Panel" }]
  }
}
```

See `src/plugins/manifest.ts` (Phase 3) for the full schema and
`plugins-sdk/` for the public API.
