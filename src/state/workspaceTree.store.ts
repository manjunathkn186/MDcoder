import { create } from "zustand";
import type { WorkspaceNode } from "@ipc/client";

export interface WorkspaceTreeState {
  root: WorkspaceNode | null;
  expanded: Set<string>;
  selected: string | null;
  setTree: (root: WorkspaceNode) => void;
  toggle: (path: string) => void;
  expand: (path: string) => void;
  collapse: (path: string) => void;
  select: (path: string | null) => void;
  clear: () => void;
}

export const useWorkspaceTree = create<WorkspaceTreeState>((set) => ({
  root: null,
  expanded: new Set<string>(),
  selected: null,
  setTree: (root) =>
    set((s) => {
      const expanded = new Set(s.expanded);
      expanded.add(root.path);
      return { ...s, root, expanded };
    }),
  toggle: (path) =>
    set((s) => {
      const next = new Set(s.expanded);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return { ...s, expanded: next };
    }),
  expand: (path) =>
    set((s) => {
      const next = new Set(s.expanded);
      next.add(path);
      return { ...s, expanded: next };
    }),
  collapse: (path) =>
    set((s) => {
      const next = new Set(s.expanded);
      next.delete(path);
      return { ...s, expanded: next };
    }),
  select: (path) => set({ selected: path }),
  clear: () => set({ root: null, expanded: new Set(), selected: null }),
}));
