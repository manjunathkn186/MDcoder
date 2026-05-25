import { create } from "zustand";

export interface PreviewState {
  /** Rendered HTML string for the active document. */
  html: string;
  /** Map from data-source-line (1-indexed) to count, used for nearest-line lookup. */
  lineSet: number[];
  /** Monotonic revision matched against editor.docRevision. */
  rev: number;
  /** Last parse error message, if any. */
  error: string | null;
  setRender: (payload: { html: string; lineSet: number[]; rev: number }) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

export const usePreview = create<PreviewState>((set) => ({
  html: "",
  lineSet: [],
  rev: 0,
  error: null,
  setRender: ({ html, lineSet, rev }) => set({ html, lineSet, rev, error: null }),
  setError: (error) => set({ error }),
  reset: () => set({ html: "", lineSet: [], rev: 0, error: null }),
}));
