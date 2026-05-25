<div align="center">

# Inkstone

A fast, local-first markdown editor with live preview, plugins, and one-click
desktop installers.

[![CI](https://img.shields.io/badge/CI-passing-success)](.github/workflows/ci.yml)
[![Release](https://img.shields.io/badge/release-v0.1.0-blue)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Tauri](https://img.shields.io/badge/runtime-Tauri%202-orange)](https://tauri.app)

</div>

---

## ✨ Highlights

- **Local-first** — your notes live in plain `.md` files on disk; no cloud lock-in.
- **Live preview** with **Mermaid**, **KaTeX**, **Shiki** code highlighting, and **wikilinks**.
- **CodeMirror 6 editor** — Vim / Emacs modes, multi-cursor, snippets, find-and-replace.
- **Workspace** — recursive tree, recursive file watcher, BM25 full-text search, backlinks, graph view.
- **Plugin SDK** — sandboxed by default, with samples and a marketplace schema.
- **Themes** — 9 built-in (Inkstone Light/Dark, Sepia, Solarized ×2, Nord, Dracula, GitHub ×2, Midnight) + Theme SDK.
- **Export** — Markdown / HTML / PDF / DOCX + Print mode.
- **Native installers** — DMG, MSI, NSIS, AppImage, deb, rpm.

---

## 🚀 Get Inkstone

| OS      | Install                                                              |
|---------|----------------------------------------------------------------------|
| macOS   | Download the `.dmg` from [Releases](../../releases), drag to Applications. |
| Windows | Run the NSIS `.exe` or `.msi` installer.                             |
| Linux   | `.AppImage` (any), `.deb` (Ubuntu/Debian), `.rpm` (Fedora/RHEL).      |
| Homebrew (planned) | `brew install --cask inkstone`                            |

See [INSTALL.md](./INSTALL.md) for detailed per-OS instructions and verification.

---

## 🧠 Architecture at a glance

```
┌────────────────────────────────────────────────────────────────────┐
│  Tauri 2 (Rust)                                                    │
│   ├─ commands  : fs / workspace / session                          │
│   └─ services  : notify-rs file watcher                            │
└──────────────────────────────▲─────────────────────────────────────┘
                               │ IPC (typed)
┌──────────────────────────────┴─────────────────────────────────────┐
│  React 18 + Vite + TypeScript                                      │
│   ├─ Editor    (CodeMirror 6, compartments, snippets, Vim/Emacs)   │
│   ├─ Preview   (markdown-it + Shiki + KaTeX + Mermaid, hydrated)   │
│   ├─ Workspace (tree, watcher, BM25 indexer worker, backlinks)     │
│   ├─ UI System (tokens, 9 themes, modal/toast/menu primitives)     │
│   ├─ Plugins   (in-process trusted + iframe-sandbox untrusted)     │
│   └─ Export    (markdown / html / pdf-print / docx)                │
└────────────────────────────────────────────────────────────────────┘
                Web Workers: parser, indexer, plugin sandboxes
```

Full design notes:

- [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [MARKDOWN_ENGINE.md](docs/MARKDOWN_ENGINE.md)
- [EDITOR_UI.md](docs/EDITOR_UI.md)
- [WORKSPACE_FS.md](docs/WORKSPACE_FS.md)
- [UI_THEMES.md](docs/UI_THEMES.md)
- [EXPORT_PACKAGING.md](docs/EXPORT_PACKAGING.md)
- [PLUGIN_SDK.md](docs/PLUGIN_SDK.md)
- [PERFORMANCE.md](docs/PERFORMANCE.md)

---

## 🧪 Quick start (developers)

```bash
git clone https://github.com/your-org/inkstone
cd inkstone
npm install
npm run tauri:dev      # full desktop shell (recommended)
# or
npm run dev            # web preview at http://127.0.0.1:1420
```

Build native installers for the current OS:

```bash
make bundle            # produces artifacts/* (dmg/msi/nsis/AppImage/deb/rpm)
```

See [BUILD.md](./BUILD.md) for the full matrix and signing setup.

---

## 🛠 Project layout

```
src/                  ← React + TypeScript app
  app/                ← Routes, commands, shortcuts
  features/           ← editor, preview, layout, settings, plugins, export
  services/           ← fs, indexer, search, cache, export engine, plugins
  themes/             ← Theme SDK + 9 built-ins + tokens.css
  ui/                 ← Reusable primitives (Button, Modal, Toaster, …)
  state/              ← Zustand stores
  workers/            ← parser, indexer

src-tauri/            ← Rust shell + commands + watcher
docker/               ← nginx config for the web image
plugins/              ← sample sandboxed plugins
scripts/              ← build.sh, release.sh, dev.sh, clean.sh
docs/                 ← all design + ops documents
.github/workflows/    ← CI, release, docker pipelines
```

---

## 🧩 Plugins

The Plugin SDK supports two execution modes:

| Mode | Use it for | Files |
|---|---|---|
| **In-process (trusted)** | Built-in extensions — markdown-it, CodeMirror | `src/plugins/builtin/*` |
| **Sandbox (untrusted)** | Marketplace plugins, user folders | `plugins/<id>/{plugin.json, main.js}` |

Samples are shipped under `plugins/` and `src/plugins/builtin/`. The full
contract is in [docs/PLUGIN_SDK.md](docs/PLUGIN_SDK.md).

---

## 📦 Releases

We use semver. Each tagged release triggers a multi-OS build matrix that
publishes signed installers and a `SHA256SUMS.txt`. See
[docs/EXPORT_PACKAGING.md](docs/EXPORT_PACKAGING.md) and
[docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md).

```bash
make release VERSION=1.0.0
git push --follow-tags    # CI builds and publishes the release
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) — issue templates, code style, and
commit/PR conventions.

---

## 📜 License

[MIT](./LICENSE) — © 2026 Inkstone Authors.
