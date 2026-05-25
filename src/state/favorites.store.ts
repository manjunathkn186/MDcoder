import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface FavoritesState {
  paths: string[];
  add: (path: string) => void;
  remove: (path: string) => void;
  toggle: (path: string) => void;
  has: (path: string) => boolean;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      paths: [],
      add: (p) => set((s) => (s.paths.includes(p) ? s : { paths: [p, ...s.paths] })),
      remove: (p) => set((s) => ({ paths: s.paths.filter((x) => x !== p) })),
      toggle: (p) => {
        const has = get().paths.includes(p);
        if (has) get().remove(p);
        else get().add(p);
      },
      has: (p) => get().paths.includes(p),
    }),
    {
      name: "inkstone.favorites",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ paths: s.paths }),
    },
  ),
);
