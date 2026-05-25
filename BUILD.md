# Building Inkstone

This document covers building Inkstone from source on macOS, Windows, and
Linux, plus the Docker-based Linux build path.

## Prerequisites

| Tool | Minimum | Install |
|---|---|---|
| Node.js | 18.18 LTS | `nvm install --lts` |
| Rust toolchain | 1.82 stable | <https://rustup.rs> |
| Git | any recent | bundled with most platforms |

### Platform native dependencies

**macOS**

```bash
xcode-select --install
```

**Windows**

- Install [Visual Studio 2022 Build Tools](https://visualstudio.microsoft.com/downloads/)
  with the **Desktop development with C++** workload.
- Install the [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

**Linux (Debian/Ubuntu)**

```bash
sudo apt-get update
sudo apt-get install -y --no-install-recommends \
  build-essential pkg-config \
  libwebkit2gtk-4.1-dev libgtk-3-dev libsoup-3.0-dev \
  librsvg2-dev libayatana-appindicator3-dev libxdo-dev
```

**Linux (Fedora/RHEL)**

```bash
sudo dnf install -y \
  webkit2gtk4.1-devel gtk3-devel libsoup3-devel \
  librsvg2-devel libayatana-appindicator-gtk3-devel libxdo-devel \
  rpm-build
```

## Clone + install

```bash
git clone https://github.com/your-org/inkstone
cd inkstone
npm ci
```

## Development build

Web preview only (Vite dev server, no Tauri shell):

```bash
npm run dev          # http://127.0.0.1:1420
```

Full desktop shell (recommended):

```bash
npm run tauri:dev
```

Hot module replacement works in both modes. Rust commands rebuild when
their source changes.

## Production build — current OS

The Makefile is the canonical entry point:

```bash
make install         # npm ci
make typecheck       # tsc --noEmit
make lint            # eslint --max-warnings 0
make test            # vitest
make build           # vite build (frontend only)
make bundle          # tauri build (current OS, default targets)
make artifacts       # copies bundles to ./artifacts/
```

Or in one shot:

```bash
scripts/build.sh
```

## Production build — targeted bundles

```bash
make bundle-macos       # app + dmg (Apple Silicon or Intel — matches host)
make bundle-windows     # msi + nsis
make bundle-linux       # deb + appimage + rpm

# Selecting individual bundle ids:
scripts/build.sh dmg
scripts/build.sh msi nsis
scripts/build.sh deb appimage rpm
```

The Tauri bundler picks targets via `--bundles`; see
`src-tauri/tauri.conf.json` for the full list.

## Cross-building

Apple Silicon ↔ Intel on macOS:

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npx tauri build --target aarch64-apple-darwin --bundles dmg
npx tauri build --target x86_64-apple-darwin --bundles dmg
```

For cross-OS builds (e.g. Windows installers from Linux), use the GitHub
Actions release workflow (`.github/workflows/release.yml`) — it spins up
native runners for each platform.

## Docker-based Linux build

No host Rust toolchain required:

```bash
make docker-linux     # builds inside Debian container, copies bundles out
ls artifacts/
```

The Dockerfile has three relevant targets:

| Target | Purpose |
|---|---|
| `web-builder` | builds the Vite bundle |
| `web` | nginx image serving `dist/` on port 8080 |
| `tauri-builder` | full Linux installer build (uses cargo + WebKitGTK) |
| `tauri-runtime` | minimal image carrying the produced installers |

## Signing and notarization

### macOS

Set these as environment variables (e.g. via your CI secret manager):

| Variable | Required for |
|---|---|
| `APPLE_CERTIFICATE` (base64 `.p12`) | code signing |
| `APPLE_CERTIFICATE_PASSWORD` | code signing |
| `APPLE_SIGNING_IDENTITY` | code signing |
| `APPLE_ID` | notarization |
| `APPLE_TEAM_ID` | notarization |
| `APPLE_PASSWORD` (app-specific) | notarization |

### Windows

| Variable | Purpose |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Tauri updater signing |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | passphrase |
| (optional) `certificateThumbprint` in `tauri.conf.json` → `bundle.windows` |
   uses a local code-signing cert by thumbprint. |

Unsigned builds still produce valid installers but trigger SmartScreen / Gatekeeper warnings on first launch.

## Releasing

```bash
scripts/release.sh 1.0.0     # bumps package.json + tauri.conf.json, tags v1.0.0
git push --follow-tags       # triggers release.yml on GitHub Actions
```

The release workflow:

1. Spins up matrix runners: macOS Apple Silicon, macOS Intel, Windows, Linux.
2. Builds + signs (if secrets present) the appropriate installers.
3. Uploads per-runner artifacts.
4. Aggregates everything, generates `SHA256SUMS.txt`, and publishes a
   GitHub Release with auto-generated notes.

## Cleaning

```bash
make clean           # removes dist/, artifacts/, src-tauri/target/
```

## Validating a local build

```bash
npm run typecheck && npm run lint && npm run test
make bundle
open artifacts/<your-os>/...   # smoke-test the bundle
```

## Troubleshooting

See the **Troubleshooting** section of [README.txt](./README.txt). The
short version:

- `cargo` errors → `rustup update stable` then `cargo clean` inside `src-tauri/`.
- WebKitGTK not found (Linux) → install the dev packages listed above.
- `npm ci` fails → ensure Node ≥ 18.18; delete `node_modules` and `package-lock.json`, retry.
