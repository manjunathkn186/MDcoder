#!/usr/bin/env bash
# Build a universal (arm64 + x86_64) macOS DMG for MDCoder.
#
# Steps:
#   1. Ensure both Rust targets are installed.
#   2. Build the frontend + Tauri universal binary.
#   3. Deep ad-hoc codesign the .app so Gatekeeper recognises a valid
#      signature (avoids the "MDCoder is damaged" false positive that
#      happens when the linker-only signature leaves resources unsealed).
#   4. Repackage a fresh DMG around the signed bundle, verify it, copy
#      the artefacts into ./artifacts/, and emit a SHA256SUMS file.
#
# Usage:  npm run dist:mac
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUT_DIR="artifacts"
APP_NAME="MDCoder.app"
TARGET="universal-apple-darwin"
RELEASE_DIR="src-tauri/target/${TARGET}/release/bundle"
APP_PATH="${RELEASE_DIR}/macos/${APP_NAME}"

echo "==> Ensuring Rust targets for universal build"
rustup target add aarch64-apple-darwin x86_64-apple-darwin

echo "==> Detach any stale mounted MDCoder volumes (hdiutil cleanup)"
hdiutil info | awk '/\/Volumes\/MDCoder/ {print $1; exit}' | xargs -I{} hdiutil detach {} -force 2>/dev/null || true

echo "==> Building (npm + tauri universal .app only)"
rm -rf "${RELEASE_DIR}"
# We only ask Tauri for the .app; we ship our own DMG with a deep ad-hoc
# signature so Gatekeeper accepts the bundle without "is damaged" errors.
npx tauri build --target "${TARGET}" --bundles app

echo "==> Deep ad-hoc codesign"
codesign --remove-signature "${APP_PATH}" 2>/dev/null || true
codesign --force --deep --sign - --timestamp=none "${APP_PATH}"
codesign --verify --deep --strict --verbose=1 "${APP_PATH}"

echo "==> Verify architectures"
file "${APP_PATH}/Contents/MacOS/"* | head -n 1

echo "==> Rebuild DMG around signed .app"
mkdir -p "${OUT_DIR}"
DMG="${OUT_DIR}/MDCoder_universal.dmg"
STAGE="$(mktemp -d)"
trap 'rm -rf "${STAGE}"' EXIT
cp -R "${APP_PATH}" "${STAGE}/"
ln -s /Applications "${STAGE}/Applications"
rm -f "${DMG}"
hdiutil create -volname "MDCoder" -srcfolder "${STAGE}" -ov -format UDZO "${DMG}" >/dev/null
hdiutil verify "${DMG}" | tail -n 1

echo "==> Copy artefacts"
rm -rf "${OUT_DIR}/${APP_NAME}"
cp -R "${APP_PATH}" "${OUT_DIR}/"
xattr -cr "${OUT_DIR}/${APP_NAME}" "${DMG}"
shasum -a 256 "${DMG}" | tee "${OUT_DIR}/SHA256SUMS.txt"

echo
echo "Build complete:"
echo "  ${OUT_DIR}/${APP_NAME}"
echo "  ${DMG}"
echo
echo "Install on any Mac (Apple Silicon or Intel) by dragging MDCoder onto"
echo "/Applications. First launch: right-click the app -> Open."
