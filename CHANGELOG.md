# Changelog

All notable changes to Inkstone are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-05-17

The initial production release. Inkstone is feature-complete across the ten
implementation phases described in `docs/ARCHITECTURE.md`.

### Phase 1 — Architecture

- Established the Tauri 2 + React + TypeScript layering, IPC contract, and
  module boundaries in `docs/ARCHITECTURE.md`.
- Token-based theming contract; markdown-it + unified hybrid rendering.

### Phase 2 — Project bootstrap

- Vite + React + TS scaffolding with strict tsconfig and ESLint config.
- TailwindCSS with CSS-variable tokens; Prettier; Vitest setup.
- Tauri shell with dialog + fs plugins; CSP hardened.
- Zustand stores: `ui`, `editor`, `settings`, `preview`, `workspace`.
- UI primitives: `Button`, `Dialog`, `Icon`; `AppShell` layout.

### Phase 3 — Markdown engine

- markdown-it pipeline with anchor, footnote, attrs, task-lists.
- Math (`remark-math` + KaTeX inline + block).
- Mermaid rendering via React portals.
- Shiki code highlighting with light/dark themes + on-demand language load.
- Source-line mapping plugin for scroll sync.
- Parser worker (`workers/parser.worker.ts`) with latest-wins semantics.
- Preview hydration in `features/preview/renderer.tsx`.

### Phase 4 — Editor UI

- CodeMirror 6 with theme/font/keymap compartments (no remount on settings).
- Multi-tab editing with drag/drop reorder + dirty indicator.
- Outline, minimap, breadcrumb, status bar.
- Vim + Emacs keybinding modes (lazy-loaded).
- Autocomplete + snippets (`h1`, `ul`, `tbl`, `code`, `mermaid`, `math`).
- Find / replace / multi-cursor / undo-redo.
- Autosave (debounced, atomic), session restore, command palette,
  quick-open (Cmd+P), distraction-free + fullscreen modes.

### Phase 5 — Workspace & filesystem

- Rust `workspace_tree`, `watch_workspace`, `unwatch_workspace`,
  `move_path`, `delete_path` commands.
- notify-rs file watcher → `inkstone://fs-event`.
- FS facade, LRU file cache, workspace manager, recents, favorites.
- BM25 inverted index in a Web Worker; fuzzy + indexed search.
- Sidebar tabs: Explorer, Search, Favorites, Recent, Backlinks, Graph.
- Wikilinks (`[[Page]]`) + backlinks index + 2-hop graph view.
- Drag/drop in the explorer; context menus with keyboard navigation.

### Phase 6 — UI system & themes

- Full token contract (typography, spacing, radii, motion, density).
- 9 built-in themes: Inkstone Light/Dark, Sepia, Solarized Light/Dark,
  Nord, Dracula, GitHub Light/Dark.
- Theme SDK (`themes/sdk.ts`), observable registry, JSON validator.
- Toast system, generic `ContextMenu`, `Modal`, `confirm()` host.
- Animation tokens + reduced-motion support; custom scrollbars.
- Theme picker with swatch previews; density modes.
- Markdown prose styling fully driven by tokens.

### Phase 7 — Export & packaging

- Export engine with Markdown, HTML, PDF (print pipeline), DOCX (pure JS).
- Print stylesheet + `printDocument()` service.
- Export dialog with TOC / embed-assets / author options.
- Tauri bundle config with macOS DMG layout, Windows NSIS + MSI, Linux
  deb/rpm/AppImage. File associations for `.md`, `.markdown`, `.mdx`.
- Multi-stage Dockerfile: web image + Linux bundler; docker-compose.
- Makefile with 18 targets; scripts `build.sh`, `release.sh`.
- GitHub Actions: `ci.yml`, `release.yml` (matrix, signing-ready), `docker.yml`.

### Phase 8 — Plugin SDK

- Public SDK: `PluginManifest`, `InkstoneAPI`, `Disposable`, permissions.
- Observable extension-point registries (commands, toolbar, status-bar,
  markdown, CM6 extensions).
- In-process runner for trusted built-ins; iframe-sandbox runner for
  untrusted code (postMessage protocol + capability checks).
- Marketplace JSON schema (`inkstone-marketplace@1`) with SHA-256
  verified bundles.
- Sample plugins: hello-world, word-counter, callout (built-in), midnight-theme.
- Plugins UI in Settings; command palette aggregates plugin commands.

### Phase 9 — Performance

- Vite manual chunks (mermaid, shiki, katex, docx, vim, emacs, codemirror,
  markdown, icons, react, state) + tree-shake; lightningcss minifier.
- Route-level lazy load for Settings, component-level for ExportDialog +
  GraphView.
- Render cache keyed by source hash; parser fast-path on cache hit.
- Large-file gating: 256 KB → 3× parser debounce, 2 MB → preview disabled
  and parser skipped.
- `React.memo` on `TreeNode`; plugin items via `useSyncExternalStore`.
- Indexer yields via `requestIdleCallback` between 8-file chunks.
- GPU layer utility class for editor + preview compositing.
- Bundle target: < 350 kB gzipped initial download.

### Phase 10 — Release

- README.md, README.txt (master plain-text doc), INSTALL.md, BUILD.md,
  CONTRIBUTING.md, CHANGELOG.md.
- docs/RELEASE_CHECKLIST.md, docs/PRODUCTION_NOTES.md.

[0.1.0]: https://github.com/your-org/inkstone/releases/tag/v0.1.0
