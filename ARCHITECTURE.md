# Local Markdown Editor — Production Architecture

A complete, production-grade architecture for a Tauri + React + TypeScript desktop markdown editor (codename: **Inkstone**) targeting Windows, Linux, and macOS. Designed to match the polish of Typora, the workspace model of Obsidian, and the rendering fidelity of VSCode's markdown preview.

---

## 1. High-Level Architecture

### 1.1 Process Topology

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Tauri Host Process (Rust)                   │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Core Services (Rust)                                          │  │
│  │   • FS Bridge (sandboxed)     • Workspace Indexer (Tantivy)    │  │
│  │   • Watcher (notify-rs)       • Export Engine (wkhtmltopdf/    │  │
│  │   • Crypto/Keychain             headless WebView print)        │  │
│  │   • Plugin Loader (WASM)      • IPC Router (typed commands)    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              ▲   ▼  (invoke / event)                 │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  WebView (Chromium/WebKit/WebView2) — React 18 + Vite          │  │
│  │   ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │  │
│  │   │ Editor Pane  │  │ Preview Pane │  │ Sidebar / Palette   │  │  │
│  │   │ CodeMirror 6 │  │ unified MDAST│  │ File Tree / Search  │  │  │
│  │   └──────────────┘  └──────────────┘  └─────────────────────┘  │  │
│  │   Workers: parser.worker • search.worker • mermaid.worker      │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.2 Layered Responsibilities

| Layer | Tech | Responsibility |
|---|---|---|
| **Shell** | Tauri (Rust) | OS integration, FS, indexing, plugins, export |
| **Bridge** | `@tauri-apps/api` + typed IPC | Strongly-typed command/event surface |
| **App** | React 18 + Zustand | UI, panels, commands, shortcuts |
| **Editor** | CodeMirror 6 | Source-of-truth text editing |
| **Render** | unified + markdown-it (hybrid) | AST + HTML pipeline |
| **Workers** | Web Workers + Comlink | Parsing, search, mermaid offload |
| **Plugins** | WASM (host) + sandboxed JS (UI) | Extensibility |

**Why hybrid markdown-it + unified?** `markdown-it` for fast incremental token streams used by the live preview; `unified/remark/rehype` for export, transforms, and plugin AST manipulation. They share a normalization layer (see §4).

---

## 2. Folder Structure

```
inkstone/
├── src-tauri/                          # Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   └── src/
│       ├── main.rs
│       ├── lib.rs
│       ├── commands/                   # IPC commands (typed)
│       │   ├── mod.rs
│       │   ├── fs.rs                   # read/write/move/trash
│       │   ├── workspace.rs            # open/close vault
│       │   ├── search.rs               # tantivy queries
│       │   ├── export.rs               # pdf/html/docx
│       │   ├── plugin.rs               # load/unload WASM
│       │   └── session.rs              # autosave/restore
│       ├── services/
│       │   ├── indexer.rs              # Tantivy index
│       │   ├── watcher.rs              # notify-rs
│       │   ├── crypto.rs               # keychain + AES
│       │   ├── plugin_host.rs          # wasmtime sandbox
│       │   └── export/
│       │       ├── pdf.rs
│       │       ├── html.rs
│       │       └── docx.rs             # pandoc bridge or pure-rust
│       ├── ipc/
│       │   ├── mod.rs
│       │   ├── router.rs
│       │   └── schema.rs               # ts-rs exported types
│       └── util/
│           ├── path.rs
│           └── error.rs
│
├── src/                                # React frontend
│   ├── main.tsx
│   ├── App.tsx
│   ├── app/
│   │   ├── routes.tsx
│   │   ├── shortcuts.ts                # global keymap
│   │   └── commands.ts                 # command palette registry
│   ├── ipc/
│   │   ├── client.ts                   # typed invoke wrapper
│   │   ├── events.ts                   # event bus
│   │   └── generated.ts                # ts-rs output
│   ├── state/                          # Zustand stores
│   │   ├── workspace.store.ts
│   │   ├── editor.store.ts
│   │   ├── preview.store.ts
│   │   ├── settings.store.ts
│   │   ├── plugins.store.ts
│   │   ├── search.store.ts
│   │   └── ui.store.ts
│   ├── features/
│   │   ├── editor/
│   │   │   ├── Editor.tsx
│   │   │   ├── extensions/             # CM6 extensions
│   │   │   │   ├── markdownLang.ts
│   │   │   │   ├── decorations.ts      # inline preview (Typora-like)
│   │   │   │   ├── pasteHandlers.ts
│   │   │   │   ├── tableEditor.ts
│   │   │   │   ├── slashMenu.ts
│   │   │   │   └── linkCompletion.ts
│   │   │   └── theme/
│   │   │       ├── cm-light.ts
│   │   │       └── cm-dark.ts
│   │   ├── preview/
│   │   │   ├── Preview.tsx
│   │   │   ├── renderer.tsx            # rehype-react renderer
│   │   │   ├── components/
│   │   │   │   ├── CodeBlock.tsx       # Shiki
│   │   │   │   ├── Mermaid.tsx
│   │   │   │   ├── Math.tsx            # KaTeX
│   │   │   │   ├── Callout.tsx
│   │   │   │   └── Embed.tsx
│   │   │   └── scrollSync.ts
│   │   ├── workspace/
│   │   │   ├── FileTree.tsx
│   │   │   ├── Tabs.tsx
│   │   │   └── Breadcrumb.tsx
│   │   ├── search/
│   │   │   ├── GlobalSearch.tsx
│   │   │   └── QuickOpen.tsx
│   │   ├── command-palette/
│   │   │   └── Palette.tsx
│   │   ├── settings/
│   │   │   └── Settings.tsx
│   │   └── export/
│   │       └── ExportDialog.tsx
│   ├── markdown/                       # Parsing pipeline
│   │   ├── pipeline.ts                 # unified processor factory
│   │   ├── markdownIt.ts               # incremental parser
│   │   ├── plugins/
│   │   │   ├── remarkWikilink.ts
│   │   │   ├── remarkCallout.ts
│   │   │   ├── remarkFrontmatter.ts
│   │   │   ├── remarkMath.ts
│   │   │   ├── rehypeShiki.ts
│   │   │   ├── rehypeMermaid.ts
│   │   │   └── rehypeSlug.ts
│   │   └── sanitize.ts
│   ├── workers/
│   │   ├── parser.worker.ts
│   │   ├── search.worker.ts            # local fallback (Lunr)
│   │   └── mermaid.worker.ts
│   ├── plugins/
│   │   ├── api.ts                      # public PluginAPI
│   │   ├── runtime.ts                  # iframe sandbox loader
│   │   ├── manifest.ts                 # zod schema
│   │   └── builtin/
│   │       ├── word-count/
│   │       └── toc/
│   ├── themes/
│   │   ├── tokens.css                  # CSS variable contract
│   │   ├── light.css
│   │   ├── dark.css
│   │   └── registry.ts
│   ├── ui/                             # design system primitives
│   │   ├── Button.tsx
│   │   ├── Dialog.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Menu.tsx
│   │   └── Icon.tsx
│   ├── lib/
│   │   ├── debounce.ts
│   │   ├── lru.ts
│   │   ├── diff.ts
│   │   └── logger.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── prose.css                   # markdown typography
│   └── types/
│       └── index.d.ts
│
├── plugins-sdk/                        # Published @inkstone/plugin-sdk
│   ├── package.json
│   └── src/index.ts
│
├── e2e/                                # Playwright + tauri-driver
├── tests/                              # Vitest unit tests
├── scripts/                            # build, sign, notarize
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## 3. Rendering Pipeline

```
 ┌────────────┐ change  ┌─────────────────┐ tokens ┌────────────────┐
 │ CodeMirror │────────►│ parser.worker   │───────►│ Virtual DOM    │
 │  (source)  │ (debounce│ markdown-it +   │        │ rehype-react   │
 │            │  120ms) │ unified)        │        │ + Suspense     │
 └────────────┘         └─────────────────┘        └───────┬────────┘
       │                                                   │
       │ scroll/caret events                               ▼
       │                                          ┌────────────────┐
       └─────────────────────────────────────────►│ Preview Pane   │
                       scrollSync.ts              │ (React)        │
                                                  └───────┬────────┘
                                                          ▼
                                            ┌──────────────────────────┐
                                            │ Lazy children:           │
                                            │  • Shiki (idle)          │
                                            │  • Mermaid (worker)      │
                                            │  • KaTeX (sync)          │
                                            └──────────────────────────┘
```

**Lifecycle:**

1. CM6 dispatches `Transaction` → `editor.store` updates doc revision.
2. Debounced change shipped to `parser.worker` via Comlink (transferable string).
3. Worker parses incrementally (block-level cache keyed by hash of block).
4. Returns `hast` tree + sourcemap (line ↔ node).
5. Main thread reconciles via `rehype-react` into the existing React tree (keyed by stable block id → no full remount).
6. Heavy nodes (`<Mermaid>`, `<CodeBlock>`) suspend until their async deps resolve.
7. `scrollSync.ts` uses the sourcemap to keep editor/preview aligned bidirectionally.

---

## 4. Markdown Parsing Pipeline

Two coordinated processors share one normalization contract (`NormalizedAst`):

```
                     ┌─────────────────────────────┐
   raw markdown ───► │ markdown-it (live preview)  │ ──► tokens → hast
                     │  • fast, incremental         │
                     │  • plugins: footnote, task,  │
                     │    anchor, container         │
                     └─────────────────────────────┘
                     ┌─────────────────────────────┐
   raw markdown ───► │ unified (export/transform)  │ ──► mdast → hast → html
                     │  remark-parse               │
                     │  ├─ remark-gfm              │
                     │  ├─ remark-frontmatter      │
                     │  ├─ remark-math             │
                     │  ├─ remark-wikilink         │
                     │  ├─ remark-callout          │
                     │  └─ remark-rehype           │
                     │  rehype-katex               │
                     │  rehype-shiki               │
                     │  rehype-mermaid             │
                     │  rehype-sanitize            │
                     │  rehype-stringify           │
                     └─────────────────────────────┘
```

**Incremental strategy:** `parser.worker` keeps an LRU of block hashes → parsed hast subtrees. Only changed blocks are re-parsed; unchanged blocks are spliced back in. This keeps editing a 50k-line document under one frame of work per keystroke.

---

## 5. Plugin Architecture

Two-tier sandbox model:

### 5.1 Tiers

| Tier | Runtime | Capabilities | Use cases |
|---|---|---|---|
| **UI plugin** | Sandboxed `<iframe>` + `postMessage` | DOM in dedicated panel, editor commands via API | Word count, TOC, custom panels |
| **Core plugin** | WASM via `wasmtime` in Rust host | FS read (scoped), parse hooks, exporters | Importers, custom renderers, sync |

### 5.2 Manifest (Zod-validated)

```ts
// src/plugins/manifest.ts
export const PluginManifest = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]+$/),
  name: z.string(),
  version: z.string(),
  entry: z.string(),
  type: z.enum(["ui", "core"]),
  permissions: z.array(z.enum([
    "fs.read", "fs.write", "editor.command",
    "preview.render", "network"
  ])).default([]),
  contributes: z.object({
    commands: z.array(z.object({ id: z.string(), title: z.string() })).optional(),
    remarkPlugins: z.array(z.string()).optional(),
    rehypePlugins: z.array(z.string()).optional(),
    themes: z.array(z.string()).optional(),
  }).default({}),
});
```

### 5.3 PluginAPI surface

```ts
// plugins-sdk/src/index.ts
export interface PluginAPI {
  editor: {
    getActiveDoc(): DocSnapshot;
    insertText(range: Range, text: string): void;
    registerCommand(id: string, handler: () => void): Disposable;
  };
  preview: {
    registerRemarkPlugin(plugin: Plugin): Disposable;
    registerRehypePlugin(plugin: Plugin): Disposable;
    registerComponent(tag: string, component: ReactComponent): Disposable;
  };
  workspace: {
    onFileOpen(cb: (path: string) => void): Disposable;
    readFile(path: string): Promise<string>;       // requires fs.read
  };
  ui: {
    addPanel(panel: PanelDef): Disposable;
    notify(msg: string, level?: "info" | "warn" | "error"): void;
  };
}
```

### 5.4 Loading flow

```
User installs .inkplugin (zip)
  → Rust verifies signature (ed25519) and manifest schema
  → Extracts to {appData}/plugins/{id}/
  → On startup: plugin_host enumerates and grants capabilities
  → UI plugins mount in sandboxed iframe with API proxied over MessageChannel
  → Core plugins instantiate as WASM modules with host-bound imports
```

---

## 6. Theme Architecture

**CSS variable contract** (`src/themes/tokens.css`) is the single source of truth. All components, editor, and preview consume these tokens. Dark mode flips `[data-theme="dark"]` on `<html>`; no component-level conditionals.

```
:root {
  --ink-bg, --ink-surface, --ink-fg, --ink-muted,
  --ink-accent, --ink-border, --ink-code-bg,
  --ink-prose-h1, --ink-link, --ink-selection, …
}
[data-theme="dark"] { /* overrides */ }
```

**Layers:**

1. **Tokens** — semantic variables.
2. **Tailwind theme extension** — maps tokens to utility classes.
3. **Prose stylesheet** (`prose.css`) — markdown typography scoped to `.ink-prose`.
4. **CM6 theme adapters** — `cm-light.ts` / `cm-dark.ts` derive from tokens via `getComputedStyle`.
5. **Shiki theme sync** — picks `github-light` / `github-dark` (or user-selected) on theme change and re-highlights.
6. **User themes** — plugins contribute additional `*.css` files that only override token values.

---

## 7. State Management (Zustand)

Stores are sliced by domain, persisted selectively, and never cross-import.

| Store | Persisted | Responsibility |
|---|---|---|
| `workspace.store` | yes (path) | active vault root, recent vaults |
| `editor.store` | no | open docs, dirty state, CM6 view refs |
| `preview.store` | no | hast cache, sourcemap |
| `settings.store` | yes (file) | preferences, keymap, theme |
| `plugins.store` | yes (enabled set) | enabled plugins, manifests |
| `search.store` | no | query, results, filters |
| `ui.store` | yes (layout) | panels, sidebar width, zoom |

**Patterns:**

- **Selectors** with `useShallow` to avoid re-renders.
- **Transient state** (CM6 `EditorView` instance) stored via `useRef` map keyed by docId — not in Zustand.
- **IPC events** mutate stores via a single `events.ts` subscriber to keep mutation paths auditable.

```
IPC event ─► events.ts ─► store.setState ─► React re-render (shallow-selected)
UI action ─► command ──► store.setState + ipc.invoke
```

---

## 8. File Indexing & Search

**Backend:** [Tantivy](https://github.com/quickwit-oss/tantivy) (Rust). Lucene-class performance, embedded.

```
Vault open
  └─► watcher.rs (notify-rs) emits Create/Modify/Delete
       └─► indexer.rs
            ├─ extracts frontmatter + plaintext (strip markdown)
            ├─ tokenizes with cangjie/standard analyzer
            └─ writes to {appData}/index/{vaultHash}/

UI search box
  └─► invoke("search", { query, limit })
       └─► tantivy QueryParser → ranked TopDocs
            └─► returns { path, score, highlights }
```

**Schema fields:** `path` (stored), `title` (indexed+stored), `body` (indexed), `tags` (facet), `mtime` (fast). Highlights use Tantivy's `SnippetGenerator`.

**Fallback:** for portable/no-binary mode, `search.worker.ts` uses Lunr for ≤10k docs.

---

## 9. Export Pipeline

```
                ┌─────────────────────────────────────────────┐
   Document ──► │ unified pipeline (export profile)           │
                │  remark-parse → transforms → rehype         │
                │  with print-targeted plugins                │
                └──────────┬──────────────────────────────────┘
                           ▼
            ┌──────────────┼───────────────┐
            ▼              ▼               ▼
        ┌───────┐     ┌────────┐     ┌────────────┐
        │ HTML  │     │  PDF   │     │   DOCX     │
        │ self- │     │ Tauri  │     │ pandoc OR  │
        │ contained │ │ WebView│     │ docx-rs    │
        │ inline │   │ printToPdf│   │ from mdast │
        │ assets │   │ + CSS  │     │             │
        └───────┘     └────────┘     └────────────┘
```

- **HTML:** single-file output; assets inlined as base64 or relative folder. Prose CSS, KaTeX CSS, Shiki HTML pre-rendered.
- **PDF:** headless Tauri WebView loads the export HTML and calls `webview.print_to_pdf` (CDP on Win/Linux, `WKWebView` on macOS via PrintOperation). Page sizing/margins from settings; respects `@page` CSS.
- **DOCX:** primary path via bundled **pandoc** sidecar (best fidelity). Pure-Rust fallback walks `mdast` → `docx-rs` for footprint-sensitive builds. Option is exposed in `ExportDialog`.

Export is invoked as a Rust command so it runs off-thread and can stream progress events.

---

## 10. Packaging Strategy

| Platform | Bundle | Signing | Auto-update |
|---|---|---|---|
| **macOS** | `.dmg` + `.app` (universal arm64+x64) | Developer ID + notarytool | Tauri updater (ed25519 sig) |
| **Windows** | `.msi` (WiX) + portable `.exe` | EV code signing cert | Tauri updater |
| **Linux** | `.AppImage`, `.deb`, `.rpm`, Flatpak | GPG sign repos | AppImageUpdate / native pkg |

**Build matrix:** GitHub Actions with `tauri-action` on `macos-14`, `windows-latest`, `ubuntu-22.04`. Sidecars (pandoc) downloaded per-target in `scripts/fetch-sidecars.ts` and bundled via `tauri.conf.json` `externalBin`.

**Asset slimming:**
- Vite `build.target: 'es2022'`, `minify: 'esbuild'`.
- Shiki uses on-demand language imports.
- KaTeX fonts subset to used glyphs (build script).
- Mermaid lazy-loaded only when first diagram encountered.

---

## 11. Performance Strategy

| Concern | Strategy |
|---|---|
| Large files (10–50 MB) | CM6 viewport rendering + line-based chunking; never serialize full doc on each keystroke |
| Parsing | Block-level LRU cache in `parser.worker`; only dirty blocks reparsed |
| Preview reconciliation | Stable block keys via `rehype-slug` + content hash → React diffs subtrees only |
| Heavy nodes | `<Mermaid>`, `<CodeBlock>` use `React.lazy` + `IntersectionObserver` (render when visible) |
| Syntax highlight | Shiki with `getHighlighterCore` + WASM oniguruma; per-language lazy registration |
| Math | KaTeX (synchronous, fast); MathJax opt-in for advanced |
| Search index | Tantivy memory-mapped; incremental on FS events |
| IPC | Batched events; transferables for large strings; `tauri::ipc::Response` zero-copy where possible |
| Memory | Bounded caches (LRU sizes in settings); WebView `--disable-features=CalculateNativeWinOcclusion` etc. |
| Cold start | Defer plugins to `requestIdleCallback`; splash hidden once first paint of editor completes |

**Budgets** (enforced in CI via Playwright traces): keystroke→preview ≤ 80 ms p95 on 10k-line doc; cold start ≤ 1.2 s on M1; memory ≤ 350 MB with 50 MB doc.

---

## 12. Security Model

- **Tauri allowlist** is minimal: `fs.scope` restricted to opened vault root + app data dir; `shell.open` only for `https?:` and `mailto:`; `http` plugin disabled.
- **CSP** strict: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: asset: https:; connect-src 'self' ipc: https://ipc.localhost`.
- **Sanitization:** `rehype-sanitize` with a schema that permits KaTeX/Mermaid output classes but strips inline event handlers and `javascript:` URLs.
- **Plugins:** signature verified (ed25519, publisher key pinned for marketplace); UI plugins isolated in sandboxed iframes (`sandbox="allow-scripts"`, no `allow-same-origin`), all FS goes through capability-checked IPC.
- **Secrets:** stored via OS keychain (`keyring-rs`).
- **Updater:** signed manifests; rollback on signature mismatch.
- **Path traversal:** all FS commands canonicalize and assert prefix-match against allowed roots.

---

## 13. Autosave & Session Restore

```
Editor change ─► debounce(800ms) ─► editor.store.markDirty(docId)
                                  └─► ipc.invoke("autosave", {docId, content, rev})
                                        └─► Rust writes to
                                            {appData}/sessions/{vaultHash}/{docId}.tmp
                                            then atomic rename → .draft

User saves (Cmd/Ctrl+S) ─► writes to real file, deletes .draft

Startup
  └─► session.rs scans drafts
       └─► UI prompts "Restore unsaved changes?" per file
```

- **Atomic writes** via temp file + rename to prevent corruption.
- **Revisions** tracked monotonically; conflicting external changes (detected by watcher) trigger a 3-way merge dialog using `lib/diff.ts`.
- **Crash recovery**: `session.json` persists window layout, open tabs, cursor, scroll, fold state.

---

## 14. Diagram Rendering Architecture

```
<pre><code class="language-mermaid"> ─► rehype-mermaid plugin
        │
        │ on main thread: emit <Mermaid code=... />
        ▼
   Mermaid.tsx
   ├─ visible? IntersectionObserver
   ├─ post to mermaid.worker (Comlink)
   ├─ worker uses mermaid.parse + mermaid.render in OffscreenCanvas-capable env
   └─ returns SVG string → injected via dangerouslySetInnerHTML (sanitized)
```

- **Worker isolation** prevents Mermaid's heavy init from blocking the main thread.
- **Theme-aware**: worker receives current `--ink-*` tokens as a Mermaid theme variables object.
- **Caching**: SVG keyed by SHA-256 of diagram source; cached in IndexedDB with LRU eviction.
- **Pluggable**: same pattern accommodates PlantUML (via Kroki sidecar), Graphviz (viz.js WASM), and Excalidraw embeds — each registered as a `rehype` component handler.

---

## 15. Future Extensibility

1. **Sync layer** — pluggable providers (Git, iCloud, WebDAV, S3, CRDT via Yjs for real-time collaboration). The `workspace` service already abstracts FS behind a trait — add `SyncedFs` impl.
2. **AI assistance** — local LLM via `llama.cpp` sidecar; commands exposed through PluginAPI (`ai.complete`, `ai.summarize`).
3. **Canvas / whiteboard** — second document type registered alongside `.md`; uses the same plugin/render contract.
4. **Mobile** — Tauri 2 supports iOS/Android; UI already token-driven and uses pointer-events abstractions.
5. **Marketplace** — signed plugin registry with semver resolution; manifest already versioned.
6. **Custom file formats** — `DocumentProvider` interface allows registering `.ipynb`, `.org`, `.adoc` readers that emit `mdast`.
7. **Themable everything** — because all surfaces consume the token contract, new themes are pure CSS.

---

## 16. Dependency Map

```
                ┌──────────────────────────────┐
                │           App (React)        │
                └─────┬──────────────┬────────┘
                      │              │
              ┌───────▼──────┐  ┌────▼─────────┐
              │  features/*  │  │   state/*    │
              └───┬──────┬───┘  └──────┬───────┘
                  │      │             │
        ┌─────────▼─┐  ┌─▼──────┐  ┌───▼────┐
        │ editor    │  │preview │  │ ipc    │
        │ (CM6)     │  │(unified│  │ client │
        │           │  │ +md-it)│  │        │
        └─────┬─────┘  └───┬────┘  └───┬────┘
              │            │           │
              │       ┌────▼────┐      │
              │       │ workers │      │
              │       └────┬────┘      │
              │            │           ▼
              │            │     ┌────────────┐
              │            │     │ Tauri host │
              │            │     │  (Rust)    │
              │            │     │ ┌────────┐ │
              │            │     │ │tantivy │ │
              │            │     │ │notify  │ │
              │            │     │ │wasmtime│ │
              │            │     │ │export  │ │
              │            │     │ └────────┘ │
              │            │     └────────────┘
              ▼            ▼
        ┌──────────────────────┐
        │ themes/tokens (CSS)  │
        └──────────────────────┘
```

Strict import rule (enforced by `eslint-plugin-boundaries`):
`ui ⟵ features ⟵ app`, `state` only imported by `features`/`app`, `markdown` only by `features/preview` and `workers`, `ipc` only by `state` and `features`.

---

## 17. Event Flow (canonical: keystroke → rendered preview)

```
1. User types in CM6
2. EditorView.dispatch(tr)        [main]
3. editor.store updates docRevision
4. debounced(120ms) → parser.worker.parse(text, prevHashes)   [worker]
5. worker returns { hast, sourcemap, dirtyBlockIds }           [main]
6. preview.store applies patch (only dirty subtrees)
7. React reconciles Preview (stable keys → minimal DOM)
8. Suspense boundaries resolve:
     • CodeBlock → Shiki highlight (idle)
     • Mermaid → mermaid.worker.render (worker)
     • Math → KaTeX (sync)
9. IntersectionObserver triggers render only for in-viewport heavy nodes
10. scrollSync maps caret line → preview node via sourcemap
```

Parallel background:
```
A. CM6 change → autosave debounced(800ms) → Tauri fs.write atomic
B. notify-rs detects FS change → emits "file-changed" event
C. indexer.rs incrementally updates Tantivy
D. If external edit conflicts with dirty buffer → diff dialog
```

---

## 18. Module Responsibilities (cheat sheet)

| Module | Owns | Does not own |
|---|---|---|
| `src-tauri/commands` | IPC surface | Business logic (delegates to services) |
| `src-tauri/services/indexer` | Tantivy lifecycle | Query parsing UI |
| `src-tauri/services/plugin_host` | WASM sandbox | UI plugin sandbox (frontend) |
| `src/ipc` | Typed bridge, event bus | State |
| `src/state` | Domain state | IPC schemas |
| `src/features/editor` | CM6 view + extensions | Markdown rendering |
| `src/features/preview` | unified→React rendering | Editing |
| `src/markdown` | Pipeline factories | DOM |
| `src/workers` | CPU-heavy off-thread work | UI |
| `src/plugins` | SDK + runtime | Built-in features |
| `src/themes` | Token contract | Component styles |
| `src/ui` | Headless primitives | Feature logic |

---

## Summary

This architecture delivers a Typora-grade editing UX, Obsidian-grade workspace tooling, and VSCode-grade preview fidelity by:

- **Splitting parsing** into a fast incremental `markdown-it` path for live preview and a rigorous `unified` path for transforms/export, sharing one AST contract.
- **Offloading** parsing, search, and diagrams to workers / Rust to keep the main thread under one frame per keystroke.
- **Sandboxing** plugins at two tiers (WASM core, iframe UI) with capability-based permissions and signature verification.
- **Centralizing** theming on a CSS-variable token contract so dark mode, custom themes, and editor/preview/diagram theming stay in lockstep.
- **Hardening** the shell with strict CSP, scoped FS allowlists, atomic autosave, signed updates, and OS-keychain secrets.
- **Scaling** to large vaults via Tantivy indexing with `notify-rs` incremental updates.
- **Future-proofing** through a `DocumentProvider`/`SyncedFs` abstraction enabling collaboration, mobile, AI, and new document types without breaking existing contracts.
