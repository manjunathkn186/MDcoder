# Export & Packaging (Phase 7)

## Export subsystem

```
src/services/export/
├── types.ts                ← ExportFormat, ExportOptions, ExportArtifact
├── engine.ts               ← runExport / runPrint / buildContext
├── printRenderer.ts        ← injects .ink-print + calls window.print()
└── exporters/
    ├── markdown.ts         ← passthrough (optional frontmatter strip)
    ├── html.ts             ← single-file standalone .html + inline CSS
    ├── pdf.ts              ← popup print → "Save as PDF"
    └── docx.ts             ← mdast → docx package

src/features/export/ExportDialog.tsx
src/state/export.store.ts
src/styles/print.css
```

### Commands

| Command id | Shortcut | Action |
|---|---|---|
| `file.export` | `⌘E` / `Ctrl+E` | Open export dialog |
| `file.print`  | `⌘⌥P` / `Ctrl+Alt+P` | Print active document |

### Format matrix

| Format | Mechanism | Notes |
|---|---|---|
| Markdown | direct source dump | Can strip frontmatter and re-emit synthesized title |
| HTML     | `markdown-it` → inline CSS template | Optional TOC built from heading scan |
| PDF      | popup window → `window.print()` | Uses OS "Save as PDF"; no native dep |
| DOCX     | `unified`/`remark` → `docx` package | Pure JS, no pandoc / native deps |

### Print mode

`printRenderer.ts` builds the same HTML the HTML exporter does, mounts it
inside a `.ink-print` container, hides `#root`, calls `window.print()`,
and restores the UI on `afterprint`. The print stylesheet
(`src/styles/print.css`) is `@import`-ed from `globals.css` so the
`@media print` rules are always available.

### API

```ts
import { buildContext, runExport, runPrint } from "@/services/export/engine";

await runExport(
  buildContext({
    source: doc.content,
    html: "",
    sourcePath: doc.path,
    format: "pdf",
    title: "My Note",
    overrides: { includeToc: true, embedAssets: true },
  }),
);
```

## Installer matrix

| OS       | Bundles                     | CI runner         |
|----------|-----------------------------|-------------------|
| macOS    | `.app`, `.dmg`              | `macos-14` (arm64) + `macos-13` (x64) |
| Windows  | `.msi` (WiX), `.exe` (NSIS) | `windows-latest`  |
| Linux    | `.deb`, `.rpm`, `.AppImage` | `ubuntu-22.04`    |

Configured in `src-tauri/tauri.conf.json` under `bundle.targets`.

### Local builds

```bash
# Current OS, default bundles:
make bundle

# Targeted bundles:
make bundle-macos      # app, dmg
make bundle-windows    # msi, nsis
make bundle-linux      # deb, rpm, appimage

# Or via the script:
scripts/build.sh dmg
scripts/build.sh msi nsis
scripts/build.sh deb appimage rpm
```

Artifacts are copied to `./artifacts/`.

### Docker builds

```bash
# Build the web preview image (nginx + dist):
make docker-web
docker run --rm -p 8080:8080 inkstone:web

# Build Linux installers inside Docker (no host Rust toolchain needed):
make docker-linux
# Produces .deb / .AppImage / .rpm in ./artifacts/
```

`docker-compose up web` brings up the web preview on
`http://localhost:8080`; `docker compose run --rm linux-bundler`
produces installers via the `tauri-runtime` stage.

## CI/CD

### `.github/workflows/ci.yml`

Runs on every push/PR to `main` and `develop`:
- **frontend**: `npm ci`, `lint`, `typecheck`, `test`, `build`, uploads `dist`.
- **rust**: installs WebKitGTK 4.1 deps, runs `cargo fmt --check`, `cargo clippy -D warnings`, `cargo build --release`.

### `.github/workflows/release.yml`

Triggered by tag push `v*.*.*`:
1. Matrix builds across macOS Apple Silicon, macOS Intel, Windows, Linux.
2. Wires optional code-signing secrets (Apple developer cert, Tauri signing key).
3. Collects platform installers into `out/`.
4. Aggregates per-platform artifacts, generates `SHA256SUMS.txt`, and
   publishes a GitHub Release with auto-generated notes.

### `.github/workflows/docker.yml`

Pushes the `inkstone-web` image to GHCR on main + tags.

### Cutting a release

```bash
make release VERSION=1.2.3      # bumps package.json + tauri.conf.json, commits, tags
git push --follow-tags          # triggers release workflow
```

Or via script: `scripts/release.sh 1.2.3`.

## Required signing secrets (optional but recommended)

| Secret | Used by |
|---|---|
| `APPLE_CERTIFICATE` (base64-encoded `.p12`) | macOS bundles |
| `APPLE_CERTIFICATE_PASSWORD` | macOS bundles |
| `APPLE_SIGNING_IDENTITY` | macOS bundles |
| `APPLE_ID` / `APPLE_TEAM_ID` / `APPLE_PASSWORD` | macOS notarization |
| `TAURI_SIGNING_PRIVATE_KEY` | Updater + Windows signing |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Updater + Windows signing |

Without these the build still succeeds but produces unsigned artifacts.

## File associations

The bundle config registers `.md` / `.markdown` / `.mdx` as Inkstone
documents so the installer wires up file associations on each platform.

## CSP & print popups

The PDF exporter opens a new window with `noopener`. Tauri's default
window policy allows in-app `window.open` to a `blank` URL, which is the
only target we use. The print stylesheet is bundled directly in the
HTML so the popup is fully self-contained.

## Roadmap

- Native PDF via Tauri command using `printpdf` (no popup) — Phase 8.
- DOCX with image embedding through asset resolver.
- macOS notarization helper script.
