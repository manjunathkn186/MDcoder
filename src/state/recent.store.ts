import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const MAX_FILES = 50;
const MAX_WORKSPACES = 10;

export interface RecentState {
  files: string[];
  workspaces: string[];
  pushFile: (path: string) => void;
  pushWorkspace: (path: string) => void;
  clearFiles: () => void;
}

export const useRecent = create<RecentState>()(
  persist(
    (set) => ({
      files: [],
      workspaces: [],
      pushFile: (path) =>
        set((s) => ({
          files: [path, ...s.files.filter((p) => p !== path)].slice(0, MAX_FILES),
        })),
      pushWorkspace: (path) =>
        set((s) => ({
          workspaces: [path, ...s.workspaces.filter((p) => p !== path)].slice(0, MAX_WORKSPACES),
        })),
      clearFiles: () => set({ files: [] }),
    }),
    {
      name: "inkstone.recent",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
