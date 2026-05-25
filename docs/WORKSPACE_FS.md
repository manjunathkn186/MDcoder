# Workspace & Filesystem (Phase 5)

## Module map

```
src-tauri/src/
├── services/watcher.rs           ← notify-rs RecommendedWatcher → Tauri events
└── commands/
    ├── fs.rs                     ← read/write/create_dir/move/delete (atomic)
    └── workspace.rs              ← open / list / tree / watch / unwatch

src/ipc/
├── client.ts                     ← typed wrappers + camelCase mappers
└── events.ts                     ← `inkstone://fs-event` listener

src/services/
├── fs.ts                         ← path helpers + thin FS facade
├── cache.ts                      ← LRU file-content cache (mtime aware)
├── fileWatcher.ts                ← subscription bus, invalidates cache
├── workspaceManager.ts           ← open / refresh / close orchestrator
├── wireWatcher.ts                ← FS events → tree refresh + reindex
├── search.ts                     ← unified search (fuzzy < 3, BM25 ≥ 3)
└── indexer/
    ├── tokenizer.ts              ← Unicode tokenizer + stopwords
    ├── extract.ts                ← title / headings / wikilinks / tags / body
    ├── invertedIndex.ts          ← BM25 with title-term boost
    └── index.ts                  ← worker-backed service, concurrency = 4

src/workers/indexer.worker.ts     ← off-thread upsert / remove / search

src/state/
├── workspaceTree.store.ts        ← tree + expanded set + selected
├── favorites.store.ts            ← persisted Set of paths
├── recent.store.ts               ← MRU files + workspaces
└── index.store.ts                ← FileMeta map, titleToPath, backlinks

src/features/
├── explorer/                     ← FileTree, TreeNode, ContextMenu
├── search/GlobalSearch.tsx       ← incremental indexed search
├── favorites/FavoritesView.tsx
├── recent/RecentView.tsx
├── backlinks/BacklinksPanel.tsx
├── graph/GraphView.tsx           ← force-directed 2-hop subgraph
└── quick-open/QuickOpen.tsx      ← index-backed Cmd+P palette

src/markdown/plugins/wikilink.ts  ← `[[Page]]` → <a class="ink-wikilink">
src/features/preview/renderer.tsx ← hydrates wikilinks via index
```

## End-to-end flow

### Open a folder

1. User picks a directory through the explorer or the **Open Workspace** command.
2. `workspaceManager.open(path)` calls Rust `workspace_tree` → returns the full
   nested tree (depth-limited, hides hidden dirs and `node_modules/target/build/dist`).
3. The tree lands in `useWorkspaceTree`.
4. `fileWatcher.start(root)` registers a recursive `notify-rs` watcher; events
   emit `inkstone://fs-event`.
5. `indexer.indexWorkspace(root)` walks markdown files with 4-way concurrency,
   sends each file's text into the indexer worker.
6. Each worker reply (`upserted`) populates `useIndex` (title, headings,
   wikilinks, tags). The index store maintains `titleToPath` and `backlinks`.

### File events

`wireWatcher.ts` subscribes to the watcher bus and:

- **created** — debounced tree refresh; if markdown, indexes the new file.
- **modified** — re-reads + re-indexes the file (cache is invalidated upstream
  by `fileWatcher`).
- **deleted** — removes the file from the index, schedules tree refresh.
- **renamed** — removes old entry, indexes the new path.

### Search

`services/search.ts` is the public API used by both `GlobalSearch` and
`QuickOpen`:

| Query length | Strategy |
|---|---|
| Empty | Surfaces recents (Quick Open only) |
| 1–2 chars | Fuzzy filter against `title + basename` |
| ≥ 3 chars | BM25 worker index over title + body (title-term boost ×1.8) |

The worker returns snippets with the first match position highlighted by
truncation; titles are kept verbatim.

### Wikilinks & backlinks

- Parser: `markdown-it` plugin emits
  `<a class="ink-wikilink" data-target="…">…</a>`.
- Hydration: `preview/renderer.tsx` resolves each `data-target` against
  `useIndex.titleToPath`; broken links get `.is-broken` + tooltip.
- Backlinks: every upsert rebuilds the entry's outgoing → incoming mapping
  in `useIndex.backlinks` (keyed by lowercased title). `BacklinksPanel`
  reads both the title-key and the file-stem to catch implicit links.

### Graph

`GraphView` computes the active document's 2-hop neighborhood (capped at 80
nodes) and runs a brief Verlet-style simulation (180 iterations, O(n²)
repulsion + spring attraction). Output is plain SVG — no extra deps.

## Performance

- **Indexing** is off-thread; the worker uses a single inverted index instance.
- **Search** is O(unique-terms × matching-docs); BM25 normalization is
  precomputed per query.
- **Cache** is a 64-entry LRU keyed by path; `mtime` is consulted before
  serving stale entries. Watcher events invalidate eagerly.
- **Tree** is materialized once on open and patched on watcher events
  (debounced 300 ms).
- **Graph** is bounded; full-vault graphs are never rendered.

## Security

- All FS commands accept absolute paths; the Rust `util/path::ensure_in_root`
  helper is available for future per-command confinement.
- File writes go through a temp-file + rename to avoid torn writes.
- The wikilink plugin emits sanitized attributes only; preview HTML is
  scrubbed of inline event handlers and `javascript:` URIs in `renderer.tsx`.

## Keyboard

| Action | Shortcut |
|---|---|
| Quick Open file | `Cmd/Ctrl + P` |
| Command palette | `Cmd/Ctrl + Shift + P` |
| Toggle sidebar | `Cmd/Ctrl + B` |
| Refresh workspace | Explorer toolbar → ↻, or `Command Palette → Workspace: Refresh` |

## Extending

- **Re-index command:** add a `commands.ts` entry that calls
  `indexer.indexWorkspace(useWorkspaceTree.getState().root!)`.
- **Workspaces switcher:** `useRecent.workspaces` already persists the MRU
  list; expose it from the title bar.
- **External drop:** wire `TauriDragDropPayload` → `workspaceManager.open`.
