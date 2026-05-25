import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface PersistedTab {
  id: string;
  path: string | null;
  title: string;
  content: string;
  dirty: boolean;
  /** Editor cursor offset (absolute). */
  cursor: number;
  /** Editor pane scrollTop in px. */
  scrollTop: number;
  /** Preview pane scrollTop in px (added in v2). */
  previewScrollTop?: number;
}

export interface SessionSnapshot {
  tabs: PersistedTab[];
  activeId: string | null;
  savedAt: number;
}

export interface SessionState {
  snapshot: SessionSnapshot | null;
  save: (snap: SessionSnapshot) => void;
  consume: () => SessionSnapshot | null;
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      snapshot: null,
      save: (snapshot) => set({ snapshot }),
      consume: () => {
        const s = get().snapshot;
        set({ snapshot: null });
        return s;
      },
    }),
    {
      name: "inkstone.session",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
