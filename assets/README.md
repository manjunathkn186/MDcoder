# Assets

Static, version-controlled assets (illustrations, sample documents, fonts) that
are bundled into the application. Tauri reads these via the `asset:` protocol
when whitelisted in `tauri.conf.json`.

Runtime user data lives in the OS-specific app-data directory and never here.
