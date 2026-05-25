# Building Inkstone on macOS

A focused, copy-pasteable guide that takes a fresh macOS machine from
zero to a runnable `Inkstone.app` and a distributable `Inkstone.dmg`.

> Companion to [BUILD.md](../BUILD.md). This file is macOS-only and
> includes the exact `brew` commands and the DMG-packaging recipe.

---

## 1. Prerequisites

Inkstone's macOS build needs:

| Tool | Why | Provider |
|---|---|---|
| Xcode Command Line Tools | C/C++ toolchain Tauri links against | Apple |
| Homebrew | Package manager for the dev tools below | brew.sh |
| Node.js 20 LTS + npm | Frontend bundler (Vite) | `brew install node@20` |
| Rust stable (rustup) | Tauri shell + `cargo` | `brew install rustup` |
| `pkg-config` | Detects native libs during `cargo build` | `brew install pkg-config` |
| `create-dmg` *(optional)* | Custom DMG layouts beyond Tauri's defaults | `brew install create-dmg` |

## 2. One-shot install

If you don't already have Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then install everything Inkstone needs:

```bash
xcode-select --install 2>/dev/null || true
brew update
brew install node@20 pkg-config rustup create-dmg
brew link --overwrite node@20

# Initialize the Rust toolchain (Homebrew's `rustup` is keg-only).
/opt/homebrew/opt/rustup/bin/rustup-init -y --default-toolchain stable --profile minimal
source "$HOME/.cargo/env"
rustup component add rustfmt clippy

# Optional: add both Apple Silicon and Intel targets for universal builds.
rustup target add aarch64-apple-darwin x86_64-apple-darwin
```

> On **Intel** Macs, replace `/opt/homebrew` with `/usr/local`.

Verify everything resolves:

```bash
node -v          # v20.x
npm  -v          # 10.x
rustc --version  # 1.8x+
cargo --version
pkg-config --version
create-dmg --version
```

## 3. Clone + install project deps

```bash
git clone https://github.com/your-org/inkstone
cd inkstone
npm ci          # reproducible install from package-lock.json
```

The first `npm ci` will also resolve Tauri's CLI (`@tauri-apps/cli`).

## 4. Run in development

```bash
npm run tauri:dev
```

This launches the full desktop shell with hot module replacement.
Front-end-only preview (no Tauri, no native APIs):

```bash
npm run dev    # http://127.0.0.1:1420
```

## 5. Production build → `.app` + `.dmg`

### Fast path (recommended)

```bash
make bundle-macos     # builds .app + .dmg for the current architecture
make artifacts        # copies the bundle into ./artifacts/
ls artifacts/
```

What you get:

```
artifacts/
├── macos/
│   └── Inkstone.app
└── dmg/
    └── Inkstone_0.1.0_<arch>.dmg
```

`<arch>` is `aarch64` on Apple Silicon, `x64` on Intel.

### Targeted commands (equivalent)

```bash
# Just the .app:
npx tauri build --bundles app

# Just the .dmg:
npx tauri build --bundles dmg

# Both:
npx tauri build --bundles app,dmg
```

### Universal (Apple Silicon + Intel in one app)

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npx tauri build --target universal-apple-darwin --bundles app,dmg
```

The universal `.app` is fatter (~2× the binary) but runs natively on
both architectures.

## 6. Required libraries inside the DMG

Inkstone is **self-contained** on macOS:

- The Tauri shell uses **WKWebView**, which is part of macOS — no
  WebView2-style download is needed.
- All native deps (markdown engine, KaTeX, Mermaid, Shiki, CodeMirror)
  are JavaScript and ship inside the app bundle's `Resources/`.
- Rust dynamic libs are statically linked into the binary at
  `Inkstone.app/Contents/MacOS/Inkstone`.

There is **no manual library install** required for end users — the
DMG is double-click-and-go.

If you need to confirm what's bundled, inspect a built `.app`:

```bash
otool -L artifacts/macos/Inkstone.app/Contents/MacOS/Inkstone
```

All linked libraries should resolve to `/usr/lib/`, `/System/Library/`,
or the bundle itself.

## 7. Customising the DMG layout (optional)

Tauri's built-in DMG packer ships with a sensible default layout — the
app icon on the left, an alias to `/Applications` on the right. To
override, edit `src-tauri/tauri.conf.json` → `bundle.macOS.dmg`:

```json
"dmg": {
  "background": "icons/dmg-background.png",
  "windowSize": { "width": 660, "height": 420 },
  "appPosition": { "x": 180, "y": 200 },
  "applicationFolderPosition": { "x": 480, "y": 200 }
}
```

For more bespoke layouts (custom volume name, code-signed background)
use `create-dmg` directly on the `.app` produced above:

```bash
create-dmg \
  --volname "Inkstone" \
  --window-pos 200 120 \
  --window-size 660 420 \
  --icon-size 100 \
  --icon "Inkstone.app" 180 200 \
  --hide-extension "Inkstone.app" \
  --app-drop-link 480 200 \
  --background "src-tauri/icons/dmg-background.png" \
  "artifacts/Inkstone-0.1.0.dmg" \
  "artifacts/macos/Inkstone.app"
```

## 8. Signing and notarization

A signed + notarized DMG is required for distribution outside the App
Store; otherwise Gatekeeper warns on first open.

### Local one-time setup

1. Enroll in the Apple Developer Program.
2. In Xcode → Settings → Accounts, generate a **Developer ID
   Application** certificate. Confirm it lives in your Keychain:

   ```bash
   security find-identity -p codesigning -v
   ```

3. Create an app-specific password at <https://appleid.apple.com> for
   the notarization step.

### Environment variables

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
export APPLE_ID="you@example.com"
export APPLE_TEAM_ID="ABCDE12345"
export APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"   # app-specific password
```

Then rebuild:

```bash
npx tauri build --bundles app,dmg
```

The Tauri bundler will codesign the `.app`, embed it in the `.dmg`,
submit to Apple Notary, and staple the ticket — all in one command.

Verify after the fact:

```bash
spctl -a -t open --context context:primary-signature \
  artifacts/dmg/Inkstone_0.1.0_aarch64.dmg
```

Expected output ends with `accepted`.

## 9. Releasing

```bash
scripts/release.sh 1.0.0
git push --follow-tags
```

GitHub Actions (`.github/workflows/release.yml`) reproduces this exact
flow on hosted runners for both Apple Silicon and Intel, and publishes
the signed DMGs plus a `SHA256SUMS.txt` to a GitHub Release.

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| `"Inkstone is damaged and can't be opened"` | Unsigned build. `xattr -d com.apple.quarantine /Applications/Inkstone.app`, or sign + notarize (§8). |
| `error: linker 'cc' failed` | Run `xcode-select --install`. |
| `rustup: command not found` | Add `/opt/homebrew/opt/rustup/bin` to your `PATH` or `source "$HOME/.cargo/env"`. |
| `cargo` is slow on first build | Warm the cargo cache: `cargo fetch` inside `src-tauri/`. |
| `npm ci` fails with EACCES | You're on system Node. Use the brew Node: `which node` should point to `/opt/homebrew/...`. |
| DMG opens but app is blank | Wipe stale state: `rm -rf ~/Library/Application\ Support/app.inkstone.desktop`. |
| `create-dmg` complains about a mounted volume | A previous run left the DMG mounted. `hdiutil detach /Volumes/Inkstone`. |

## 11. Clean up

```bash
make clean              # dist/, artifacts/, src-tauri/target
cargo clean             # extra-thorough Rust clean (in src-tauri/)
rm -rf node_modules     # nuclear option for npm
```

---

### TL;DR

```bash
# 1. install once
brew install node@20 pkg-config rustup create-dmg
/opt/homebrew/opt/rustup/bin/rustup-init -y --default-toolchain stable --profile minimal
source "$HOME/.cargo/env"

# 2. build
npm ci
make bundle-macos
make artifacts

# 3. install
open artifacts/dmg/Inkstone_*.dmg
```
