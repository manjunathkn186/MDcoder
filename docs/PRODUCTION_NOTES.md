# Production Notes

Operational notes for shipping Inkstone in production.

## Versioning

Inkstone follows [Semantic Versioning](https://semver.org). The single source
of truth for the current version is `package.json`; `src-tauri/tauri.conf.json`
must mirror it. `scripts/release.sh` keeps both in sync.

## Reproducible builds

- Node version: pinned via `"engines.node": ">=18.18"` and CI uses 20 LTS.
- Rust version: stable channel; `Cargo.lock` is committed.
- Frontend lock file: `package-lock.json` is committed; `npm ci` is the
  install command everywhere (CI + scripts).
- Docker builds pin base images (`node:20-bookworm-slim`, `rust:1.82-bookworm`).

## Signing

| Platform | Mechanism | Required secrets |
|---|---|---|
| macOS | Developer ID Application + notarization | `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_PASSWORD` |
| Windows | Code-signing cert (SHA-256, EV recommended) | `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` |
| Linux | Optional GPG signing of `.deb` / `.rpm` | future |

The `release.yml` workflow detects missing secrets and skips signing — the
build still completes, but the resulting installers are unsigned.

## Update channel

There is no built-in updater in v0.1.0. The Tauri updater plugin is on the
roadmap; until then, users update by downloading new installers.

## Telemetry

**Inkstone collects no telemetry.** It does not call out to any server,
does not phone home for crash reports, and does not index files outside
the active workspace. The CSP in `tauri.conf.json` blocks third-party
hosts at the webview level.

If you fork and add opt-in telemetry, route it through a dedicated
service with explicit user consent and document it here.

## CSP & sanitization

- `tauri.conf.json` declares a strict CSP — no inline scripts, no
  arbitrary third-party origins, `connect-src 'self' ipc: https://ipc.localhost`.
- Preview HTML is sanitized in `features/preview/renderer.tsx`: inline
  event handlers and `javascript:` URIs are stripped.
- Plugin sandboxes use `sandbox="allow-scripts"` only — no same-origin,
  no DOM/IPC reach.

## Data locations

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/app.inkstone.desktop` |
| Linux | `~/.local/share/app.inkstone.desktop` |
| Windows | `%APPDATA%\app.inkstone.desktop` |

Inside, the editor persists:

- `inkstone.settings` — themes, density, editor preferences (v2 schema).
- `inkstone.session` — open tabs, active doc.
- `inkstone.favorites`, `inkstone.recent`.
- `inkstone.plugins` — installed plugin manifests + (for sandboxed
  plugins) the source bundle.

Plain `.md` files live wherever the user picks them — never inside the
above directories.

## Performance budgets

Tracked in `docs/PERFORMANCE.md`. Headline numbers:

- Cold start < 350 ms.
- Edit→preview latency < 90 ms (10 kB doc).
- 1k-file workspace index < 4 s, off-thread.
- Initial JS download < 350 kB gzipped.

The release workflow does not gate on these numbers but regressions are
expected to be addressed before publishing.

## Known limitations (v0.1.0)

- No in-app auto-updater yet.
- DOCX export does not embed images (placeholder text emitted).
- Two-document side-by-side split is in roadmap; only edit/split/preview
  for the active doc is wired today.
- Marketplace UI is not built — installs go through the SDK + JSON only.
- Workspace search does not yet support regex or path filters.
- No collaborative editing.

## Roadmap (post-v0.1.0)

- Tauri updater plugin + signed manifest.
- In-app marketplace UI.
- DOCX image embedding via asset resolver.
- Workspace search filters + regex.
- Two-doc side-by-side split with synced scroll.
- Mobile companion (iOS/Android) sharing the same plain-text vault.

## Channels

| Surface | Where |
|---|---|
| Releases | GitHub Releases (signed installers + SHA256SUMS.txt) |
| Web image | GHCR — `ghcr.io/<org>/inkstone-web` |
| Issues | GitHub Issues |
| Security | `security@inkstone.app` (placeholder) |

## Support matrix

| Platform | Supported | Notes |
|---|---|---|
| macOS 11+ | ✅ | Apple Silicon + Intel |
| Windows 10/11 (x64) | ✅ | WebView2 runtime required |
| Ubuntu 22.04+, Debian 12+ | ✅ | webkit2gtk-4.1, gtk-3 |
| Fedora 38+, RHEL 9+ | ✅ | matching dev libs |
| Other Linux (AppImage) | ✅ | requires FUSE for AppImage |
| BSDs | ⚠️ | not tested; should work with native Tauri 2 deps |
