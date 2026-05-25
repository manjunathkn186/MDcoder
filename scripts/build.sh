#!/usr/bin/env bash
# Production build — runs typecheck, lint, tests, then bundles desktop installers.
# Usage:
#   scripts/build.sh                      # current OS, all default targets
#   scripts/build.sh dmg                  # only DMG (macOS)
#   scripts/build.sh msi nsis             # multiple Windows installers
#   scripts/build.sh deb appimage rpm     # Linux installers
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

echo "▶ Typecheck"
npm run typecheck

echo "▶ Lint"
npm run lint

echo "▶ Unit tests"
npm run test

echo "▶ Frontend build"
npm run build

if [[ $# -gt 0 ]]; then
  BUNDLES="$(IFS=,; echo "$*")"
  echo "▶ Tauri bundle: $BUNDLES"
  npx tauri build --bundles "$BUNDLES"
else
  echo "▶ Tauri bundle (defaults)"
  npm run tauri:build
fi

mkdir -p artifacts
if [[ -d src-tauri/target/release/bundle ]]; then
  cp -R src-tauri/target/release/bundle/* artifacts/
  echo "✔ Installers copied to artifacts/"
else
  echo "✘ No bundle directory produced." >&2
  exit 1
fi
