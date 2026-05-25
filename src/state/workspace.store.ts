import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { FileEntry } from "@/types/index";
import { ipc } from "@ipc/client";

export interface WorkspaceState {
  rootPath: string | null;
  entries: FileEntry[];
  recent: string[];
  openWorkspace: (path: string) => Promise<void>;
  refresh: () => Promise<void>;
  closeWorkspace: () => void;
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      rootPath: null,
      entries: [],
      recent: [],
      openWorkspace: async (path) => {
        const root = await ipc.openWorkspace(path);
        const entries = await ipc.listWorkspace(root);
        set((s) => ({
          rootPath: root,
          entries,
          recent: [root, ...s.recent.filter((p) => p !== root)].slice(0, 10),
        }));
      },
      refresh: async () => {
        const root = get().rootPath;
        if (!root) return;
        const entries = await ipc.listWorkspace(root);
        set({ entries });
      },
      closeWorkspace: () => set({ rootPath: null, entries: [] }),
    }),
    {
      name: "inkstone.workspace",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ rootPath: s.rootPath, recent: s.recent }),
    },
  ),
);
