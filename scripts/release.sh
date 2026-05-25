#!/usr/bin/env bash
# Cuts a release tag and pushes it. CI picks the tag up and builds binaries.
# Usage: scripts/release.sh 1.2.3
set -euo pipefail

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "Usage: scripts/release.sh <semver>" >&2
  exit 2
fi
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.+-]+)?$ ]]; then
  echo "Invalid semver: $VERSION" >&2
  exit 2
fi

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree dirty — commit or stash first." >&2
  exit 2
fi

node -e "const p=require('./package.json');p.version='$VERSION';require('fs').writeFileSync('./package.json',JSON.stringify(p,null,2)+'\n');"

# Update tauri.conf.json version with a portable sed.
tmp=$(mktemp)
node -e "const fs=require('fs');const f='src-tauri/tauri.conf.json';const o=JSON.parse(fs.readFileSync(f,'utf8'));o.version='$VERSION';fs.writeFileSync(f,JSON.stringify(o,null,2)+'\n');"

git add package.json src-tauri/tauri.conf.json
git commit -m "chore(release): v$VERSION"
git tag -a "v$VERSION" -m "Inkstone v$VERSION"

echo "✔ Tagged v$VERSION."
echo "→ Push with: git push --follow-tags"
