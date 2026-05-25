# Plugin SDK (Phase 8)

## Module map

```
src/plugins/
├── sdk/
│   ├── manifest.ts         ← PluginManifest, parseManifest (kebab id, semver, permissions)
│   ├── api.ts              ← InkstoneAPI interface seen by plugins
│   └── index.ts            ← Public re-exports + composeDisposables
├── runtime/
│   ├── bridge.ts           ← postMessage wire types (HostOp, HostEvent, …)
│   ├── extensionPoints.ts  ← Observable registries (commands/toolbar/status/markdown/CM6)
│   ├── apiFactory.ts       ← Build InkstoneAPI for in-process plugins
│   ├── InProcessRunner.ts  ← Activate trusted plugins as ES modules
│   ├── SandboxRunner.ts    ← Activate untrusted plugins inside an iframe
│   └── PluginHost.ts       ← Public facade: install/enable/disable/uninstall
├── marketplace/
│   └── index.ts            ← MarketplaceIndex schema + fetch + SHA-256 verify
└── builtin/
    ├── callout.ts          ← Built-in markdown plugin (GitHub callouts)
    ├── midnight-theme.ts   ← Built-in theme contribution
    └── index.ts            ← installBuiltinPlugins()
plugins/                    ← Untrusted user-folder plugins (sandboxed)
├── hello-world/{plugin.json, main.js}
└── word-counter/{plugin.json, main.js}
```

## Lifecycle

```
installBuiltin  ─┐
installFromSrc  ─┴► usePlugins.upsert  ──► enable  ──► activate (Runner)
                                            │             │
                                            └── disable ──┴► deactivate
                                                              │
                                                          uninstall
```

| Operation | Effect |
|---|---|
| `installBuiltin(manifest, mod)` | Adds + activates the bundled plugin in-process |
| `installFromSource(manifest, code)` | Adds (disabled) — user enables explicitly |
| `enable(id)` | Runs the appropriate runner |
| `disable(id)` | Calls `deactivate`, drops every extension owned by id |
| `uninstall(id)` | Disables (if needed) then removes from state |

## Execution modes

| Mode | Trigger | API surface |
|---|---|---|
| **In-process** | `manifest.trusted === true` and `source === "builtin"` | Full SDK incl. `markdown` + `editor` |
| **Sandbox** | All other cases (always for marketplace) | `commands`, `toolbar`, `statusBar`, `themes`, `ui`, `workspace`, `log` |

## Security model

- The sandbox iframe uses `sandbox="allow-scripts"` — **no** `allow-same-origin`, popups, or top-level navigation. The plugin cannot reach DOM, IPC, file system, or any host globals.
- All traffic is a JSON message over `postMessage`. The host validates `op` strings, checks declared permissions on every call, and ignores messages from foreign sources.
- Marketplace bundles are verified via SHA-256 before storage and forced `trusted: false`.
- Untrusted plugins **cannot** mutate the markdown-it pipeline or CodeMirror; those extension points are gated behind `markdown` / `editor` permissions which are only granted to in-process plugins.

## Permissions

| Permission | Grants |
|---|---|
| `commands` | Add palette / shortcut commands |
| `toolbar` | Add icon buttons to the title bar |
| `statusBar` | Add badges to the status bar |
| `ui` | Show toasts and confirm dialogs |
| `workspace` | Read the active document + subscribe to changes |
| `themes` | Register new themes in the global theme registry |
| `markdown` *(trusted)* | Extend the markdown-it pipeline |
| `editor` *(trusted)* | Add CodeMirror 6 extensions |

## API at a glance

```ts
export interface InkstoneAPI {
  version: string;
  pluginId: string;
  commands:   { register(cmd): Disposable };
  toolbar:    { addItem(item): Disposable };
  statusBar:  { addItem(item): Disposable };
  ui:         { toast(input); confirm(opts): Promise<boolean> };
  workspace:  { activeDocument(); onActiveDocumentChange(fn): Disposable };
  themes:     { register(theme): Disposable };
  markdown?:  { use(plugin): Disposable };   // trusted only
  editor?:    { addExtension(ext): Disposable }; // trusted only
  log(level, message, ...args);
}
```

## Manifest schema

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Optional short description.",
  "author": "Optional",
  "main": "main.js",
  "permissions": ["commands", "ui"],
  "engines": { "inkstone": "^0.1.0" },
  "category": "productivity",
  "keywords": ["example"]
}
```

`parseManifest` validates: kebab `id`, semver `version`, allow-listed permissions.

## Authoring a sandbox plugin

```js
// plugins/my-plugin/main.js
function activate(api) {
  const cmd = api.commands.register({
    id: "my.greet",
    title: "Greet me",
    run: () => api.ui.toast({ message: "Hello!", kind: "success" }),
  });
  return { dispose: () => cmd.dispose() };
}
window.activate = activate;
```

A `plugin.json` next to `main.js` declares permissions. The host loads
the source string and starts a sandboxed iframe — see the bundled
`hello-world` and `word-counter` examples.

## Authoring a trusted (in-process) plugin

```ts
// src/plugins/builtin/my-plugin.ts
import type { PluginManifest } from "@/plugins/sdk/manifest";
import type { PluginModule } from "@/plugins/sdk/api";

export const manifest: PluginManifest = {
  id: "my-plugin",
  name: "My Plugin",
  version: "1.0.0",
  main: "my-plugin.ts",
  permissions: ["markdown"],
  trusted: true,
};

export const plugin: PluginModule = {
  activate(api) {
    return api.markdown!.use((md) => { /* extend md */ });
  },
};
```

Register at boot in `@/plugins/builtin/index.ts`:

```ts
await pluginHost.installBuiltin(myPlugin.manifest, myPlugin.plugin);
```

## Extension points wired into the app

| Point | Renders in / Consumed by |
|---|---|
| Commands | `CommandPalette` (Cmd+Shift+P) |
| Toolbar | `TitleBar` quick-actions cluster |
| Status bar | `StatusBar` left/right groups |
| Themes | `ThemePicker` (Phase 6 registry) |
| Markdown | `createMarkdownIt()` (after core plugins) |
| Editor (CM6) | reserved — consumed by `Editor.tsx` extension array |

Each registry is observable: `useSyncExternalStore` subscribes UI elements (e.g. `PluginToolbarItems`, `PluginStatusItems`) so contributions appear/disappear without a remount.

## Marketplace

`fetchMarketplaceIndex()` GETs a static JSON at a configurable URL with
the shape:

```ts
interface MarketplaceIndex {
  schema: "inkstone-marketplace@1";
  updatedAt: string;
  plugins: MarketplaceEntry[];
}
interface MarketplaceEntry {
  id; name; version; description?; author?; homepage?;
  category?; keywords?;
  manifestUrl; sourceUrl; sourceSha256;
  publishedAt; rating?; downloads?;
}
```

`downloadPlugin(entry)` fetches the source bundle and verifies its
SHA-256 before parsing the manifest. The resulting plugin is forced
`trusted: false` and routed through the sandbox runner.

## Sample plugins shipped

| Sample | Mode | Demonstrates |
|---|---|---|
| `plugins/hello-world` | Sandbox | Command registration + toast UI |
| `plugins/word-counter` | Sandbox | Status bar item + active document subscription |
| `src/plugins/builtin/callout.ts` | Trusted | Markdown-it pipeline contribution |
| `src/plugins/builtin/midnight-theme.ts` | Trusted | Theme SDK contribution |

## Testing a sandbox plugin

```ts
import { pluginHost } from "@/plugins/runtime/PluginHost";
import { parseManifest } from "@/plugins/sdk";

const manifest = parseManifest(await fetch("/plugins/hello-world/plugin.json").then((r) => r.json()));
const source = await fetch("/plugins/hello-world/main.js").then((r) => r.text());
await pluginHost.installFromSource(manifest, source);
await pluginHost.enable(manifest.id);
```

## Performance notes

- Registries fire one notification per mutation; UI uses
  `useSyncExternalStore` so it only re-renders the items panel.
- Sandbox iframes are hidden and use `srcdoc` — no extra network requests.
- In-process plugins run inline; their `markdown` contributions are
  invoked once per `createMarkdownIt()` instantiation (memoized in the
  parser worker).

## Roadmap

- Inline plugin folder picker (`Tauri::open_dialog` → load `plugin.json`).
- Capability prompts on first activation (per permission).
- CM6 extension contributions wired into `Editor.tsx`.
- Plugin update notifications via marketplace `version` polling.
