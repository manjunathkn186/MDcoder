import { create } from "zustand";

export interface FileMeta {
  path: string;
  title: string;
  headings: string[];
  outgoing: string[]; // raw wikilink targets (lowercased)
  tags: string[];
  mtimeMs: number;
}

export interface IndexState {
  files: Map<string, FileMeta>;            // path → meta
  titleToPath: Map<string, string>;        // lowercased title → first matching path
  backlinks: Map<string, Set<string>>;     // target path (or title key) → set of paths linking to it
  status: "idle" | "indexing" | "ready";
  progress: { done: number; total: number };
  setStatus: (s: IndexState["status"]) => void;
  setProgress: (p: IndexState["progress"]) => void;
  upsert: (meta: FileMeta) => void;
  remove: (path: string) => void;
  reset: () => void;
  resolveWikilink: (target: string) => string | null;
}

export const useIndex = create<IndexState>((set, get) => ({
  files: new Map(),
  titleToPath: new Map(),
  backlinks: new Map(),
  status: "idle",
  progress: { done: 0, total: 0 },
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  upsert: (meta) => {
    const { files, titleToPath, backlinks } = get();
    const prev = files.get(meta.path);
    if (prev) {
      // Remove old backlinks attributable to prev.outgoing → this path.
      for (const t of prev.outgoing) {
        const key = t.toLowerCase();
        const set = backlinks.get(key);
        if (set) {
          set.delete(prev.path);
          if (set.size === 0) backlinks.delete(key);
        }
      }
      if (prev.title.toLowerCase() === meta.title.toLowerCase()) {
        // title unchanged — keep mapping
      } else {
        if (titleToPath.get(prev.title.toLowerCase()) === prev.path) {
          titleToPath.delete(prev.title.toLowerCase());
        }
      }
    }
    files.set(meta.path, meta);
    titleToPath.set(meta.title.toLowerCase(), meta.path);
    for (const t of meta.outgoing) {
      const key = t.toLowerCase();
      let set_ = backlinks.get(key);
      if (!set_) {
        set_ = new Set();
        backlinks.set(key, set_);
      }
      set_.add(meta.path);
    }
    set({});
  },
  remove: (path) => {
    const { files, titleToPath, backlinks } = get();
    const prev = files.get(path);
    if (!prev) return;
    files.delete(path);
    if (titleToPath.get(prev.title.toLowerCase()) === path) {
      titleToPath.delete(prev.title.toLowerCase());
    }
    for (const t of prev.outgoing) {
      const key = t.toLowerCase();
      const set_ = backlinks.get(key);
      if (set_) {
        set_.delete(path);
        if (set_.size === 0) backlinks.delete(key);
      }
    }
    set({});
  },
  reset: () =>
    set({
      files: new Map(),
      titleToPath: new Map(),
      backlinks: new Map(),
      status: "idle",
      progress: { done: 0, total: 0 },
    }),
  resolveWikilink: (target) => {
    return get().titleToPath.get(target.toLowerCase()) ?? null;
  },
}));
