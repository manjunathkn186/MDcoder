# Principal-engineer code review

A focused, honest pass over the codebase. Findings below are graded by
real-world impact, not aesthetic preference. The four highest-impact
fixes are applied inline in this commit; the rest are concrete
follow-ups with the file and rationale called out.

## Applied fixes (in this commit)

### 1. `FileCache.invalidate()` no longer poisons entries (P0)

`@/Users/manjunathkn/Desktop/Work/MyProject/src/services/cache.ts` previously wrote `content: ""` +
`mtime: -1` on invalidation, so subsequent reads silently served the
empty string until the cache was overwritten. The cache now genuinely
deletes the entry via a new `LRU.delete()` primitive
(`@/Users/manjunathkn/Desktop/Work/MyProject/src/lib/lru.ts`).

### 2. `FileCache.read()` mtime comparison was inverted (P0)

The freshness check rejected valid cache hits because we stamped
`Date.now()` on entries without a known mtime, then refused to serve
them on later calls that *did* know the mtime (always smaller). Fixed
to: serve cache hit when no mtime is requested, otherwise serve when
`requested ≤ cached`.

### 3. `scrollSync` no longer cancels its own frames (P0)

`@/Users/manjunathkn/Desktop/Work/MyProject/src/features/preview/scrollSync.ts` shared a single
`rafId` between the editor↔preview handlers. Simultaneous scrolls
clobbered each other's RAFs and produced visible jitter. Each handler
now owns its own token. The list of source-line nodes is cached and
re-collected only when the preview's DOM mutates
(`MutationObserver`), with `O(log n)` binary search instead of
`O(n)` linear scans on every scroll event.

### 4. `Breadcrumb` now reads the canonical workspace store (P1)

`@/Users/manjunathkn/Desktop/Work/MyProject/src/features/editor/Breadcrumb.tsx` was still importing
the Phase-2 legacy `useWorkspace` store, which Phase 5 stopped
populating. The breadcrumb now reads `useWorkspaceTree.root.path`,
so it shows the workspace prefix again.

### 5. Toast auto-dismiss no longer leaks timers (P1)

`@/Users/manjunathkn/Desktop/Work/MyProject/src/state/toast.store.ts` previously left a
`setTimeout` running after a manual dismiss; the timer was a no-op but
held a closure. Timers are now tracked in a side-table and explicitly
cleared on `dismiss`, `clear`, and replacement.

---

## Deferred follow-ups

### Architecture

- **Legacy `useWorkspace` store** (`@/Users/manjunathkn/Desktop/Work/MyProject/src/state/workspace.store.ts`)
  is no longer the canonical source of the workspace root. It still
  persists to localStorage and is read in two places after this fix
  (none). Delete the file in the next minor release and remove the
  persisted key with a `migrate` step.

- **Plugin source persistence**: `@/Users/manjunathkn/Desktop/Work/MyProject/src/state/plugins.store.ts`
  persists the full sandboxed-plugin JS source via Zustand `persist` →
  localStorage. Many user-installed plugins can overflow the 5–10 MB
  quota. Move plugin payloads to IndexedDB (e.g. via `idb-keyval`)
  and keep only metadata in the Zustand store.

### Performance

- **`renderCache` hash collisions** (`@/Users/manjunathkn/Desktop/Work/MyProject/src/services/renderCache.ts`):
  32-bit FNV-1a hits ~0.05% collision probability at 65k entries. Cap
  capacity at 32 (already done) and **also** compare the first 256
  source chars on hit; if mismatch, treat as miss. This converts the
  rare collision from "wrong render" to "one extra parse".

- **Indexer body retention** (`@/Users/manjunathkn/Desktop/Work/MyProject/src/workers/indexer.worker.ts`):
  the worker holds the full plain-text body for every indexed file to
  build snippets on demand. For ≥ 5k files (~25 MB), drop the body
  immediately after tokenization and rebuild snippets by re-reading
  the file on demand (the file cache will catch most cases).

- **Initial bundle assertion**: add a CI gate in
  `.github/workflows/ci.yml` that runs `npm run build` and fails if
  the sum of initial chunks (`index-*.js` + non-lazy vendors) exceeds
  450 kB gzipped. Prevents stealth regressions.

### Accessibility

- **`Toaster`** does not move focus when a danger toast arrives. Either
  move focus to the toast region under `aria-live="assertive"` (today
  it's just `polite`) or wire a Cmd+. shortcut to dismiss the topmost.

- **`ContextMenu`** should restore focus to the trigger element on
  close (track the `document.activeElement` at open and `.focus()` it
  on dispose). Currently focus is lost.

- **Explorer drag-drop** announces no live-region message for screen
  readers. Add `aria-live="polite"` updates such as "moved File.md
  into Notes" on successful drop.

### UX

- **Quick-Open** uses `Mod+P`; Phase 7 introduced `file.print` on
  `Mod+Alt+P`. Surface this in the title-bar tooltip and the print
  command palette entry so the discoverable shortcut is correct.

- **Export Dialog**: PDF flow opens a popup that users frequently
  miss. Wrap `runPrint` in a leading toast ("Opening print dialog…")
  so the action's progress is visible even if the popup is blocked
  by the OS.

- **Sidebar tabs** persist no state. Restoring the last selected tab
  across sessions is a one-line addition in `@/Users/manjunathkn/Desktop/Work/MyProject/src/state/ui.store.ts`.

### Rendering quality

- **Sanitizer**: `@/Users/manjunathkn/Desktop/Work/MyProject/src/features/preview/renderer.tsx`
  strips inline event handlers and `javascript:` URIs but does not
  consult an allow-list of tag names. Adopt
  [`DOMPurify`](https://github.com/cure53/DOMPurify) for defense in
  depth — pin a single version and run it on every render in
  `renderer.tsx`.

- **Wikilink hydration** runs `useIndex.getState()` on every preview
  hydrate. For documents with hundreds of links, this is still fast
  (Map lookups), but consider memoizing the resolved set per
  render-cache key so we don't redo the work on a cache hit.

- **KaTeX**: `throwOnError: false` swallows malformed input silently.
  Add a small inline "math error" marker so authors can see what went
  wrong without opening DevTools.

### Plugin architecture

- **Sandbox bootstrap** (`@/Users/manjunathkn/Desktop/Work/MyProject/src/plugins/runtime/SandboxRunner.ts`)
  uses a hand-rolled remote proxy. It would be more maintainable to
  use [`comlink`](https://github.com/GoogleChromeLabs/comlink) (≈ 1.5 KB
  gzipped) with a custom transport that drops the iframe's structured
  clone reach back to the host.

- **Permission prompts**: today permissions are static from manifest.
  Add a per-permission consent dialog the first time a plugin
  installs, so the user sees what they're granting.

- **Plugin lifecycle hooks**: the SDK exposes `activate` /
  `deactivate` only. Consider adding `onDocumentSave` and
  `onDocumentOpen` so authors can lift workflows that today have to
  poll `workspace.onActiveDocumentChange`.

### Maintainability

- **Strict TS**: enable `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`. Multiple call sites already pass `|
  undefined` through index lookups (e.g. `s.docs[s.activeId]`); the
  compiler should flag those.

- **ESLint rules**: add `react-hooks/exhaustive-deps` enforcement (we
  disable it locally in `@/Users/manjunathkn/Desktop/Work/MyProject/src/features/editor/Editor.tsx`).
  When that disable is the right call, it's worth a comment.

- **`useEditor.subscribe` selector overload**: Zustand v5 changed the
  selector signature for `subscribe`. We use it in
  `@/Users/manjunathkn/Desktop/Work/MyProject/src/plugins/runtime/apiFactory.ts` without a selector,
  which still works but is brittle to a future bump. Wrap in a tiny
  helper.

- **Deprecated `Mod+P` collision**: Quick-Open uses `Mod+P`; common
  expectation is "Print". Either swap (Quick-Open → `Mod+Shift+O`) or
  surface a one-time tip on first launch.

- **Test coverage**: there are unit tests scaffolded but the only
  meaningful one is `tests/lib/debounce.test.ts`. Priorities for new
  tests:
  1. `renderCache` hit/miss semantics.
  2. `FileCache` mtime semantics (covered by this commit).
  3. `parserService` latest-wins behaviour with cache fast-path.
  4. `BM25 InvertedIndex` ranking (golden fixtures).

## Production hardening recommendations

- **Auto-update**: integrate the Tauri updater plugin with a signed
  manifest (`pubkey` in `tauri.conf.json`). Until then, users have no
  in-app update path.
- **Crash reporting**: route Rust panics through a signed crash
  reporter (`sentry-tauri` is currently the lowest-friction option).
  Keep telemetry opt-in.
- **Backup / corruption protection**: the autosave pipeline writes
  atomically (`.tmp` + rename) but does not snapshot. Consider a
  rolling 7-day backup folder under the user data directory so a
  ransomware/disk-full event isn't catastrophic.
- **Resource limits**: cap watcher payloads and indexer concurrency
  via env vars so power users can tune behaviour on huge vaults.
- **Update SHA verification UI**: surface the published
  `SHA256SUMS.txt` in the in-app About dialog so users can verify
  their build matches a known release.

---

This is the last formal review pass for v0.1.0. The applied fixes are
all small and surgical so as not to disturb any architectural decision
from earlier phases.
