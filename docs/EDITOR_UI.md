# Editor UI (Phase 4)

## Module map

```
src/state/
├── ui.store.ts          ← view/keymap/distraction/palette flags
├── editor.store.ts      ← docs, order, activeId
└── session.store.ts     ← persisted PersistedTab[] + activeId

src/features/editor/
├── Editor.tsx           ← CM6 host w/ compartments (theme/font/lines/keymap)
├── Tabs.tsx             ← drag/drop tab bar
├── Breadcrumb.tsx       ← vault → folder → file
├── Outline.tsx          ← heading list, jump-to-line
├── Minimap.tsx          ← gauge + headings + draggable viewport
├── extensions/
│   ├── markdownLang.ts
│   ├── decorations.ts        (Typora-like inline hide/dim — Phase 3)
│   ├── pasteHandlers.ts
│   ├── snippets.ts           (autocomplete source: h1, ul, tbl, mermaid…)
│   ├── extraKeymap.ts        (Mod-B / Mod-I / Mod-` / Mod-S / Mod-P / Mod-Shift-P)
│   ├── keybindingsMode.ts    (dynamic vim / emacs loader)
│   └── editorRegistry.ts     (docId → EditorView)
├── theme/
│   ├── cm-light.ts
│   └── cm-dark.ts
├── services/
│   ├── autosave.ts           (per-doc debounced, atomic via Tauri)
│   └── session.ts            (subscribe → persist tabs / restore on boot)
└── hooks/
    ├── useDocMetrics.ts      (words, chars, reading time)
    └── useOutline.ts         (ATX scan, code-fence aware)

src/features/command-palette/Palette.tsx
src/features/quick-open/QuickOpen.tsx
src/lib/fuzzy.ts              (subsequence scorer)
src/ui/Dialog.tsx             (portal, focus-trap, Escape-to-close)
```

## Keyboard map

| Action | Shortcut |
|---|---|
| Command palette | `Cmd/Ctrl + Shift + P` |
| Quick-open file | `Cmd/Ctrl + P` |
| Save active doc | `Cmd/Ctrl + S` |
| Save all | `Cmd/Ctrl + Alt + S` |
| New document | `Cmd/Ctrl + N` |
| Close tab | `Cmd/Ctrl + W` |
| Toggle sidebar | `Cmd/Ctrl + B` |
| Toggle outline | `Cmd/Ctrl + Shift + O` |
| Cycle view (edit/split/preview) | `Cmd/Ctrl + \` |
| Toggle theme | `Cmd/Ctrl + Shift + L` |
| Toggle distraction-free | `Cmd/Ctrl + Shift + D` |
| Fullscreen | `F11` |
| Bold / Italic / Code (editor scope) | `Cmd/Ctrl + B` / `I` / `` ` `` |
| Find / Replace | `Cmd/Ctrl + F` / `Cmd/Ctrl + Alt + F` (CM6 search panel) |
| Multi-cursor | `Alt + Click` / `Cmd/Ctrl + D` (next match) |
| Undo / Redo | `Cmd/Ctrl + Z` / `Cmd/Ctrl + Shift + Z` |

> Global shortcuts come from `src/app/commands.ts` via `src/app/shortcuts.ts`.
> Editor-scoped shortcuts live in `extensions/extraKeymap.ts`.

## Vim / Emacs

Toggle from the command palette (`Keymap: Vim`, `Keymap: Emacs`, `Keymap: Default`).
The keymap is mounted into a CM6 `Compartment` and reconfigured live — no editor
remount. Both bundles are dynamically imported only when selected.

## Autosave

`services/autosave.ts` schedules a per-doc debounced flush (800 ms). Docs without
a backing path are skipped — their content lives in the session store instead.
Writes go through the Tauri `write_text_file` command which performs an atomic
temp-file + rename.

## Crash recovery & session restore

`services/session.ts` subscribes to the editor store and debounces (1.5 s)
persisting the tab set + active id into `useSession`. On `AppShell` mount we
`restore()` once. `beforeunload` flushes autosave and snapshots the session.

## Multi-tab editing

- `editor.store.ts` already maintained `docs / order / activeId`.
- `Tabs.tsx` renders the order, supports drag-to-reorder (HTML5 DnD), dirty
  indicator, middle/× close, and `Mod+W` on the focused tab.
- Closing the active tab promotes the previous tab.

## Outline navigation

`useOutline` performs a single linear pass over the source, skipping fenced
code blocks. The outline panel calls `editorRegistry.get(docId)` and dispatches
a selection update so jumps cooperate with CM6 history (one undo step backs out).

## Minimap

Lightweight: a vertical rail rendering O(N_headings) markers and a viewport
indicator driven by the editor's scrollDOM. Pointer drag scrolls proportionally.
Avoids the cost of mirroring full text — large docs stay smooth.

## Fuzzy palettes

`lib/fuzzy.ts` implements a subsequence scorer with bonuses for consecutive
matches, word-boundary jumps, prefix matches, and case-match. Used by both
the command palette and quick-open.

## Distraction-free / fullscreen

- **Distraction-free**: hides title bar, sidebar, tabs, breadcrumb, outline,
  minimap, status bar (toggled in `AppShell` and `WorkspaceView`).
- **Fullscreen**: requests OS-level fullscreen via the standard Fullscreen API.

## Split panes (status)

The current layout supports `edit | split | preview` for the active document.
A "two documents side-by-side" split is a planned Phase 5 enhancement; the
`editorRegistry` already supports multiple concurrent views per docId.

## Image paste / drop (Phase 3 carryover)

`extensions/pasteHandlers.ts` emits `inkstone:image` CustomEvent with the
binary, plus inserts an `attachment:pending` placeholder. The attachment
writer (Phase 5) listens, persists bytes under `_assets/`, and rewrites the
placeholder via a CM6 transaction.

## Performance budget

- Editor mount: re-creates `EditorState` only when active docId changes.
  Theme / font / line-numbers / keymap changes hit compartments, not state.
- Outline & metrics: memoized on document content; both are O(N) line scans.
- Minimap: O(headings) renders + a single scroll/resize listener pair.
- Palettes: render up to 50 results; fuzzy scoring is O(query × target).
- Autosave: debounced per-doc; no work for non-dirty buffers.
