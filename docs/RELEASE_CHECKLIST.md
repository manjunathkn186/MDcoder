# Release Checklist

A copy-pasteable sequence we run for every tagged release.

## 1. Validate the working tree

```bash
git status                          # must be clean
git pull --rebase origin main
```

## 2. Run the full validation suite

```bash
npm ci
npm run typecheck                   # tsc --noEmit
npm run lint                        # eslint, zero warnings
npm run test                        # vitest
```

Rust side:

```bash
( cd src-tauri && cargo fmt --all -- --check )
( cd src-tauri && cargo clippy --all-targets --no-deps -- -D warnings )
( cd src-tauri && cargo build --release )
```

## 3. Local production build

```bash
make build                          # frontend bundle
make bundle                         # current-OS installers
make artifacts                      # copies to ./artifacts/
```

Smoke-test the bundle:

| OS | Steps |
|---|---|
| macOS | Open the `.dmg`, drag, launch, open a workspace, type, export PDF. |
| Windows | Run the `.msi`, launch, open a workspace, type, save. |
| Linux | `./Inkstone-*.AppImage`, open a workspace, type, save. |

## 4. Update CHANGELOG and bump version

```bash
scripts/release.sh 1.0.0            # bumps package.json + tauri.conf.json
                                    # commits + tags v1.0.0
```

Edit `CHANGELOG.md` to make the new entry final (the script bumps numbers
but does not write release notes).

## 5. Push tag

```bash
git push --follow-tags
```

GitHub Actions takes over:

- **`ci.yml`** runs again on the tag.
- **`release.yml`** spins up the matrix (macOS Apple Silicon, macOS Intel,
  Windows, Linux), builds installers, signs (if secrets present),
  aggregates artifacts, computes `SHA256SUMS.txt`, and publishes a draft
  GitHub Release.
- **`docker.yml`** pushes `inkstone:web` to GHCR.

## 6. Promote the release

1. Open the draft release in GitHub.
2. Confirm every installer is present:
   - `Inkstone-<version>-aarch64.dmg`
   - `Inkstone-<version>-x64.dmg`
   - `Inkstone-<version>-x64.msi`
   - `Inkstone-<version>-setup.exe`
   - `Inkstone-<version>_amd64.deb`
   - `Inkstone-<version>.x86_64.rpm`
   - `Inkstone-<version>.AppImage`
   - `SHA256SUMS.txt`
3. Verify SHA-256 of one installer matches the line in `SHA256SUMS.txt`.
4. Click **Publish release**.

## 7. Post-release

- Bump the version on `main` if pre-releasing (`scripts/release.sh 1.1.0-pre`).
- Announce via the channels listed in `docs/PRODUCTION_NOTES.md`.
- Open a tracking issue for any deferred follow-ups discovered during
  validation.

## Quick rollback

If a release ships with a regression:

```bash
gh release delete v1.0.0 --yes --cleanup-tag
# then revert the version bump commit and retag:
git revert <release-commit>
git push origin main
scripts/release.sh 1.0.1
git push --follow-tags
```

Users who already installed should be guided to download the patch
release; in-app update prompts are a Phase 11 roadmap item.

## Sign-off

A release is "done" only when:

- [ ] All artifacts published.
- [ ] SHA-256 verified.
- [ ] Smoke test passed on every target OS.
- [ ] `CHANGELOG.md` reflects the actual change set.
- [ ] No P0/P1 open issues with the `regression` label.
