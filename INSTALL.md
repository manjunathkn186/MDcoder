# Installing Inkstone

Inkstone ships as a native desktop app on macOS, Windows, and Linux.
Choose the route that matches your platform.

## Verifying a download

Every GitHub Release attaches a `SHA256SUMS.txt` next to the installers.
Verify before installing:

```bash
# macOS / Linux
shasum -a 256 -c SHA256SUMS.txt

# Windows (PowerShell)
Get-FileHash .\Inkstone-1.0.0-x64.msi -Algorithm SHA256
```

The hash should match the line in `SHA256SUMS.txt`.

## macOS (Apple Silicon and Intel)

1. Download the matching DMG from [Releases](../../releases):
   - `Inkstone-<version>-aarch64.dmg` for Apple Silicon (M1/M2/M3/M4).
   - `Inkstone-<version>-x64.dmg` for Intel Macs.
2. Open the DMG, drag **Inkstone** into **Applications**.
3. First launch: right-click → **Open** until signed builds ship.

Optional Gatekeeper workaround if the build is unsigned:

```bash
xattr -d com.apple.quarantine /Applications/Inkstone.app
```

### Homebrew (planned)

```bash
brew tap your-org/inkstone   # planned
brew install --cask inkstone # planned
```

## Windows 10/11 (x64)

Two installers ship per release:

| File | Installer | Notes |
|---|---|---|
| `Inkstone-<version>-x64.msi` | MSI | Recommended; integrates with `winget`/group policy. |
| `Inkstone-<version>-setup.exe` | NSIS | Per-machine install with WebView2 auto-bootstrap. |

The installer registers `.md`, `.markdown`, `.mdx` file associations.

If WebView2 is missing, the NSIS installer fetches it; you can also pre-install:
<https://developer.microsoft.com/en-us/microsoft-edge/webview2/>

```powershell
# winget (planned)
winget install Inkstone.Inkstone
```

## Linux

Pick the format that matches your distro.

### Ubuntu / Debian

```bash
sudo apt install ./Inkstone-<version>_amd64.deb
```

Runtime deps (auto-installed by `apt`):

```
libwebkit2gtk-4.1-0
libgtk-3-0
```

### Fedora / RHEL / OpenSUSE

```bash
sudo dnf install ./Inkstone-<version>.x86_64.rpm
# or for OpenSUSE Tumbleweed:
sudo zypper install ./Inkstone-<version>.x86_64.rpm
```

### Any distro (AppImage)

```bash
chmod +x Inkstone-<version>.AppImage
./Inkstone-<version>.AppImage
```

You can integrate the AppImage into your desktop environment with
[appimaged](https://github.com/probonopd/go-appimage) or `appimagelauncher`.

## Uninstalling

| OS | Steps |
|---|---|
| macOS | Move `Inkstone.app` from `/Applications` to the Trash. |
| Windows | Settings → Apps → **Inkstone** → Uninstall. |
| Ubuntu/Debian | `sudo apt remove inkstone` |
| Fedora/RHEL | `sudo dnf remove inkstone` |
| AppImage | Delete the `.AppImage` file. |

User data lives in:

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/app.inkstone.desktop` |
| Linux | `~/.local/share/app.inkstone.desktop` |
| Windows | `%APPDATA%\app.inkstone.desktop` |

## Building from source

See [BUILD.md](./BUILD.md) for the full developer build flow.
