import { create } from "zustand";
import { useViewState } from "./viewState.store";

export interface OpenDoc {
  id: string;
  path: string | null;
  title: string;
  content: string;
  dirty: boolean;
}

export interface EditorState {
  docs: Record<string, OpenDoc>;
  order: string[];
  activeId: string | null;
  openDoc: (doc: Omit<OpenDoc, "dirty"> & { dirty?: boolean }) => void;
  closeDoc: (id: string) => void;
  setActive: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  markSaved: (id: string, path?: string) => void;
}

export const useEditor = create<EditorState>((set) => ({
  docs: {},
  order: [],
  activeId: null,
  openDoc: (doc) =>
    set((s) => {
      if (s.docs[doc.id]) return { ...s, activeId: doc.id };
      return {
        docs: { ...s.docs, [doc.id]: { ...doc, dirty: doc.dirty ?? false } },
        order: [...s.order, doc.id],
        activeId: doc.id,
      };
    }),
  closeDoc: (id) =>
    set((s) => {
      const { [id]: _removed, ...rest } = s.docs;
      const order = s.order.filter((x) => x !== id);
      const activeId =
        s.activeId === id ? order[order.length - 1] ?? null : s.activeId;
      // Release per-doc view state so the byDoc map stays bounded.
      useViewState.getState().drop(id);
      return { docs: rest, order, activeId };
    }),
  setActive: (id) => set({ activeId: id }),
  updateContent: (id, content) =>
    set((s) => {
      const doc = s.docs[id];
      if (!doc) return s;
      return {
        docs: { ...s.docs, [id]: { ...doc, content, dirty: true } },
      };
    }),
  markSaved: (id, path) =>
    set((s) => {
      const doc = s.docs[id];
      if (!doc) return s;
      return { docs: { ...s.docs, [id]: { ...doc, dirty: false, path: path ?? doc.path } } };
    }),
}));
