================================================================================
 INKSTONE — local-first markdown editor
================================================================================
Version : 0.1.0
License : MIT
Runtime : Tauri 2 (Rust) + React 18 + TypeScript + Vite
Status  : production-ready

--------------------------------------------------------------------------------
1. PRODUCT SUMMARY
--------------------------------------------------------------------------------
Inkstone is a fast, local-first markdown editor for desktop. It is built as a
single Tauri 2 application: a Rust shell hosts a React + TypeScript UI, with
markdown rendered by `markdown-it` and (optionally) `unified` for export.

What you get out of the box:
  - CodeMirror 6 editor (Vim, Emacs, multi-cursor, snippets, search/replace).
  - Live preview with Mermaid diagrams, KaTeX math, Shiki code highlighting,
    GitHub-style callouts, and `[[wikilinks]]` with backlinks + graph view.
  - Workspace with recursive folder tree, file watcher (notify-rs), BM25
    full-text search, fuzzy quick-open, recents, favorites.
  - Themes: 9 built-in palettes + a Theme SDK for unlimited custom themes.
  - Plugin SDK with in-process (trusted) and iframe-sandboxed (untrusted)
    execution modes, plus a marketplace JSON schema.
  - Export: Markdown / HTML / PDF (print pipeline) / DOCX (pure JS) + print
    stylesheet.
  - Production installers for macOS (.app / .dmg), Windows (.msi / NSIS .exe),
    Linux (.deb / .rpm / .AppImage).

Inkstone never phones home, never indexes files outside your selected vault,
and never executes plugin code outside its declared permission set.

--------------------------------------------------------------------------------
2. ARCHITECTURE OVERVIEW
--------------------------------------------------------------------------------
   ┌──────────────────────────────────────────────────────────────────┐
   │  Tauri 2 / Rust                                                  │
   │   commands/    fs.rs, workspace.rs, session.rs                   │
   │   services/    watcher.rs (notify-rs → "inkstone://fs-event")    │
   └─────────────────────────────▲────────────────────────────────────┘
                                 │ JSON IPC (typed)
   ┌─────────────────────────────┴────────────────────────────────────┐
   │  React 18 + Vite + TypeScript                                    │
   │                                                                  │
   │   features/                                                      │
   │     editor/    CodeMirror 6 host, compartments, snippets,        │
   │                 Vim/Emacs (lazy), pasteHandlers, autosave,       │
   │                 session restore, undo/redo, multi-cursor.        │
   │     preview/   markdown-it + Shiki + KaTeX + Mermaid + sourceMap │
   │                 + wikilink hydration + sanitizer.                │
   │     workspace/ Tree, breadcrumb, outline, minimap, view modes.   │
   │     explorer/  FileTree + drag/drop + context menu + favorites.  │
   │     search/    Global search backed by BM25 indexer worker.      │
   │     graph/     Force-directed 2-hop SVG graph.                   │
   │     export/    Dialog + engine + Markdown/HTML/PDF/DOCX/Print.   │
   │     plugins/   PluginsView, toolbar/status renderers.            │
   │     command-palette/ + quick-open/ + settings/                   │
   │                                                                  │
   │   services/                                                      │
   │     fs / cache / fileWatcher / workspaceManager / search /       │
   │     indexer (worker-backed) / renderCache / export/* /           │
   │     wireWatcher (FS events → tree + reindex).                    │
   │                                                                  │
   │   plugins/  SDK (sdk/), Runtime (runtime/), Marketplace,         │
   │             Built-in (callout + midnight theme).                 │
   │                                                                  │
   │   state/    Zustand stores: ui, editor, preview, settings,       │
   │             workspaceTree, favorites, recent, index, plugins,    │
   │             toast, confirm, export, session.                     │
   │                                                                  │
   │   themes/   Theme SDK + 9 built-ins, runtime CSS variables.      │
   │   ui/       Button, Dialog, Modal, Toaster, ContextMenu, Icon.   │
   │   workers/  parser.worker.ts, indexer.worker.ts.                 │
   │   markdown/ markdown-it instance + plugins + frontmatter.        │
   └──────────────────────────────────────────────────────────────────┘

Key design choices:
  - Plain `.md` files on disk; no opaque database.
  - Off-thread parsing (parser worker) + off-thread indexing (indexer worker).
  - Sandboxed plugins by default; trusted in-process only for built-ins.
  - Single token contract (CSS custom properties) drives every theme.
  - Code-split bundle: Mermaid/Shiki/KaTeX/docx/Vim/Emacs all lazy-loaded.

See docs/ARCHITECTURE.md for the full design rationale.

--------------------------------------------------------------------------------
3. INSTALL — HOMEBREW (planned, recommended for macOS)
--------------------------------------------------------------------------------
A Homebrew tap is planned but not yet published. The intended commands are:

  brew tap your-org/inkstone
  brew install --cask inkstone

When the cask is unavailable, install via DMG (see section 5).

--------------------------------------------------------------------------------
4. BUILD COMMANDS
--------------------------------------------------------------------------------
Prerequisites:
  - Node.js >= 18.18 (use `nvm install --lts`)
  - Rust toolchain  (https://rustup.rs)
  - Platform native deps:
      macOS    : Xcode Command Line Tools (`xcode-select --install`)
      Windows  : Visual Studio 2022 Build Tools with C++ workload
                 WebView2 Runtime
      Linux    : webkit2gtk-4.1-dev, libgtk-3-dev, libsoup-3.0-dev,
                 librsvg2-dev, libayatana-appindicator3-dev, libxdo-dev

One-off setup:
  npm ci                     # reproducible install
  rustup target add aarch64-apple-darwin  # if cross-building on macOS

Common tasks (Makefile wraps everything):
  make install               # npm ci
  make dev                   # vite dev server (web only)
  make tauri-dev             # full Tauri shell in dev mode
  make typecheck             # tsc --noEmit
  make lint                  # eslint, zero warnings
  make test                  # vitest
  make build                 # vite build (frontend bundle → dist/)
  make bundle                # tauri build (current OS, default targets)

Targeted bundles:
  make bundle-macos          # app, dmg
  make bundle-windows        # msi, nsis
  make bundle-linux          # deb, appimage, rpm

Scripts (equivalent to make targets):
  scripts/build.sh                       # all default bundles
  scripts/build.sh dmg                   # macOS DMG only
  scripts/build.sh msi nsis              # Windows installers
  scripts/build.sh deb appimage rpm      # Linux bundles
  scripts/release.sh 1.0.0               # bump versions, tag, push

--------------------------------------------------------------------------------
5. PACKAGING COMMANDS
--------------------------------------------------------------------------------
All bundle settings live in src-tauri/tauri.conf.json. The Tauri bundler
runs as part of `tauri build`; the following invocations are equivalent:

  npx tauri build                                # current OS, default targets
  npx tauri build --bundles dmg                  # macOS DMG only
  npx tauri build --bundles msi,nsis             # Windows
  npx tauri build --bundles deb,appimage,rpm     # Linux
  npx tauri build --bundles app                  # macOS .app only (unsigned)

After a successful bundle the artifacts land under:
  src-tauri/target/release/bundle/
The `make artifacts` target copies them to ./artifacts/.

Signing (optional but recommended for distribution):
  macOS    : set APPLE_CERTIFICATE, APPLE_CERTIFICATE_PASSWORD,
             APPLE_SIGNING_IDENTITY, APPLE_ID, APPLE_TEAM_ID,
             APPLE_PASSWORD.
  Windows  : set TAURI_SIGNING_PRIVATE_KEY,
             TAURI_SIGNING_PRIVATE_KEY_PASSWORD.

CI/CD: pushing a tag matching `v*.*.*` triggers .github/workflows/release.yml
which produces signed installers on macOS, Windows, and Linux runners and
publishes a GitHub Release with a SHA256SUMS.txt file.

--------------------------------------------------------------------------------
6. DOCKER IMAGE CREATION
--------------------------------------------------------------------------------
A multi-stage Dockerfile is provided. Available build targets:

  web              minimal nginx image serving the static frontend
  tauri-builder    Debian image with Rust + WebKitGTK to build Linux bundles
  tauri-runtime   carries the resulting .deb / .AppImage / .rpm artifacts

Web preview image (works on any Docker host):
  docker build --target web -t inkstone:web .
  docker run --rm -p 8080:8080 inkstone:web
  # open http://localhost:8080

Linux installers via Docker (no host Rust required):
  make docker-linux            # populates ./artifacts/ with deb/AppImage/rpm
  # equivalent to:
  # docker build --target tauri-runtime -t inkstone:linux .
  # docker cp $(docker create inkstone:linux):/artifacts/bundle/. artifacts/

docker-compose:
  docker compose up web                            # serves the web preview
  docker compose run --rm linux-bundler            # runs the bundler service

The web image is also published to GHCR by .github/workflows/docker.yml on
each push to `main` and on every release tag.

--------------------------------------------------------------------------------
7. OS-SPECIFIC INSTALLATION
--------------------------------------------------------------------------------
macOS (Apple Silicon and Intel):
  1. Download Inkstone-<version>-{aarch64|x64}.dmg from Releases.
  2. Open the DMG, drag Inkstone to /Applications.
  3. First launch: right-click → Open (Gatekeeper) until signed builds ship.
  Uninstall: drop Inkstone.app into the Trash.

Windows 10/11 (x64):
  1. Download Inkstone-<version>-x64.msi  (recommended), or
     Inkstone-<version>-setup.exe (NSIS).
  2. Double-click the installer; it sets up file associations for .md.
  Uninstall: Settings → Apps → Inkstone → Uninstall.

Linux:
  Ubuntu / Debian:
    sudo apt install ./Inkstone-<version>_amd64.deb
  Fedora / RHEL:
    sudo dnf install ./Inkstone-<version>.x86_64.rpm
  Any distro (portable):
    chmod +x Inkstone-<version>.AppImage
    ./Inkstone-<version>.AppImage
  Uninstall:
    sudo apt remove inkstone   (or)   sudo dnf remove inkstone
    For AppImage: delete the file.

File associations: `.md`, `.markdown`, and `.mdx` are registered with
Inkstone on all three platforms.

--------------------------------------------------------------------------------
8. TROUBLESHOOTING
--------------------------------------------------------------------------------
"Inkstone is damaged and can't be opened" (macOS):
  Unsigned/unnotarized builds: right-click → Open, or:
  xattr -d com.apple.quarantine /Applications/Inkstone.app

"WebView2 not found" (Windows):
  The NSIS installer downloads WebView2 silently. If install was skipped,
  install manually from https://developer.microsoft.com/en-us/microsoft-edge/webview2/

"Failed to load webkit2gtk" (Linux):
  Install runtime deps:
    Ubuntu/Debian: sudo apt install libwebkit2gtk-4.1-0 libgtk-3-0
    Fedora      : sudo dnf install webkit2gtk4.1 gtk3

App opens blank / white screen:
  Most often a corrupt cache. Quit and run:
    macOS   : rm -rf ~/Library/Application\ Support/app.inkstone.desktop
    Linux   : rm -rf ~/.local/share/app.inkstone.desktop
    Windows : del /S %APPDATA%\app.inkstone.desktop

"npm run tauri:dev" fails on first run:
  - Ensure Rust toolchain installed: `rustup --version`
  - Linux: install the dev packages listed in section 4.
  - Cargo cache: `cargo clean` inside src-tauri/ and retry.

Plugin won't load:
  - Check Settings → Plugins; the error string is printed inline.
  - Untrusted plugin sandboxes refuse top-level navigation, IPC, and DOM
    access; if your plugin tries any of those it will silently fail.

Export to PDF prints an unstyled page:
  PDF export uses a popup print window. If popups are blocked, allow them
  for the Inkstone window. The popup carries inlined CSS — refresh once.

Performance degraded on huge files:
  Inkstone disables the live preview past 2 MB and triples the parser
  debounce past 256 KB. These thresholds live in src/lib/fileSize.ts.

For anything else, file an issue with:
  - OS + version
  - Inkstone version (Settings → About)
  - Console log (DevTools → Console)

--------------------------------------------------------------------------------
9. DEVELOPMENT WORKFLOW
--------------------------------------------------------------------------------
1. Fork the repo and clone:
     git clone git@github.com:<you>/inkstone.git
     cd inkstone
2. Install deps:
     npm ci
3. Start the desktop shell:
     npm run tauri:dev
4. Make changes. The relevant places per feature:
     - Editor          src/features/editor/
     - Preview         src/features/preview/ + src/markdown/
     - Workspace       src/features/explorer/ + src/services/
     - UI / theming    src/ui/ + src/themes/ + src/styles/
     - Plugins         src/plugins/
     - Export          src/services/export/
5. Run tests + checks:
     npm run typecheck
     npm run lint
     npm run test
6. Commit using Conventional Commits:
     feat(editor): add foldable callouts
     fix(workspace): debounce watcher events
     docs: update INSTALL for Linux
7. Open a PR. CI (.github/workflows/ci.yml) runs frontend + Rust suites.

Branching:
  main    : protected, always green, tagged releases come from here.
  develop : integration branch (optional).
  feat/*  : feature branches.
  fix/*   : bug fixes.

Release flow:
  scripts/release.sh 1.0.0    # bumps versions, commits, tags v1.0.0
  git push --follow-tags      # triggers release.yml → signed installers
                              # + GitHub Release + SHA256SUMS.

--------------------------------------------------------------------------------
10. PROJECT FILE MAP (TOP-LEVEL)
--------------------------------------------------------------------------------
  src/                      React app
  src-tauri/                Rust shell + commands + watcher
  plugins/                  Sample untrusted plugins (sandboxed)
  docker/                   nginx.conf
  scripts/                  build.sh, release.sh, dev.sh, clean.sh
  docs/                     ARCHITECTURE / MARKDOWN_ENGINE / EDITOR_UI /
                            WORKSPACE_FS / UI_THEMES / EXPORT_PACKAGING /
                            PLUGIN_SDK / PERFORMANCE / RELEASE_CHECKLIST /
                            PRODUCTION_NOTES
  .github/workflows/        ci.yml, release.yml, docker.yml
  Dockerfile, docker-compose.yml, Makefile
  package.json, tsconfig*.json, vite.config.ts, tailwind.config.ts
  README.md, README.txt, INSTALL.md, BUILD.md, CHANGELOG.md, LICENSE,
  CONTRIBUTING.md

--------------------------------------------------------------------------------
11. WHERE TO LEARN MORE
--------------------------------------------------------------------------------
  Architecture overview ............... docs/ARCHITECTURE.md
  Markdown engine ..................... docs/MARKDOWN_ENGINE.md
  Editor UI ........................... docs/EDITOR_UI.md
  Workspace + filesystem .............. docs/WORKSPACE_FS.md
  UI + themes ......................... docs/UI_THEMES.md
  Export + packaging .................. docs/EXPORT_PACKAGING.md
  Plugin SDK .......................... docs/PLUGIN_SDK.md
  Performance ......................... docs/PERFORMANCE.md
  Release checklist ................... docs/RELEASE_CHECKLIST.md
  Production notes .................... docs/PRODUCTION_NOTES.md

--------------------------------------------------------------------------------
COPYRIGHT
--------------------------------------------------------------------------------
© 2026 Inkstone Authors. Released under the MIT License — see LICENSE.
