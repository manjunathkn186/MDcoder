import { create } from "zustand";

/**
 * Per-document UI state — editor cursor + scroll positions and preview
 * scroll position. Lives in-memory and is mirrored into the persisted
 * session snapshot by `features/editor/services/session.ts`, so a fresh
 * launch can restore "where I left off" on every previously open file.
 */
export interface DocViewState {
  /** CodeMirror absolute selection offset (head). */
  cursor: number;
  /** Editor pane scrollTop (px). */
  editorScrollTop: number;
  /** Preview pane scrollTop (px). */
  previewScrollTop: number;
}

export const emptyViewState: DocViewState = {
  cursor: 0,
  editorScrollTop: 0,
  previewScrollTop: 0,
};

export interface ViewStateStore {
  byDoc: Record<string, DocViewState>;
  patch: (docId: string, patch: Partial<DocViewState>) => void;
  get: (docId: string) => DocViewState;
  /** Bulk-load from persisted snapshot on session restore. */
  hydrate: (m: Record<string, DocViewState>) => void;
  /** Drop state for a closed doc to keep memory bounded. */
  drop: (docId: string) => void;
}

export const useViewState = create<ViewStateStore>((set, getStore) => ({
  byDoc: {},
  patch: (docId, patch) =>
    set((s) => ({
      byDoc: {
        ...s.byDoc,
        [docId]: { ...emptyViewState, ...s.byDoc[docId], ...patch },
      },
    })),
  get: (docId) => getStore().byDoc[docId] ?? emptyViewState,
  hydrate: (m) => set({ byDoc: { ...m } }),
  drop: (docId) =>
    set((s) => {
      if (!(docId in s.byDoc)) return s;
      const { [docId]: _drop, ...rest } = s.byDoc;
      return { byDoc: rest };
    }),
}));
