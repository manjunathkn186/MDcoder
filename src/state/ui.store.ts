import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ViewMode = "edit" | "split" | "preview";
export type KeyMode = "default" | "vim" | "emacs";

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3.0;
export const ZOOM_STEP = 0.1;
const clampZoom = (z: number): number =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
function applyZoomToDom(z: number): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--ink-zoom", String(z));
}

export interface UiState {
  sidebarOpen: boolean;
  sidebarWidth: number;
  outlineOpen: boolean;
  minimapOpen: boolean;
  viewMode: ViewMode;
  keyMode: KeyMode;
  fullscreen: boolean;
  distractionFree: boolean;
  paletteOpen: boolean;
  quickOpenOpen: boolean;
  /** Content zoom multiplier (1.0 = 100%). Applied via --ink-zoom CSS var. */
  zoom: number;
  /** When set, the preview's Find panel is open and active. */
  findOpen: boolean;

  setZoom: (z: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setFindOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (n: number) => void;
  toggleOutline: () => void;
  toggleMinimap: () => void;
  setViewMode: (m: ViewMode) => void;
  setKeyMode: (m: KeyMode) => void;
  toggleFullscreen: () => void;
  toggleDistractionFree: () => void;
  setPaletteOpen: (open: boolean) => void;
  setQuickOpenOpen: (open: boolean) => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarWidth: 260,
      outlineOpen: true,
      minimapOpen: true,
      viewMode: "preview",
      keyMode: "default",
      fullscreen: false,
      distractionFree: false,
      paletteOpen: false,
      quickOpenOpen: false,
      zoom: 1,
      findOpen: false,

      setZoom: (z) => {
        const zoom = clampZoom(z);
        applyZoomToDom(zoom);
        set({ zoom });
      },
      zoomIn: () => {
        const zoom = clampZoom((useUi.getState().zoom ?? 1) + ZOOM_STEP);
        applyZoomToDom(zoom);
        set({ zoom });
      },
      zoomOut: () => {
        const zoom = clampZoom((useUi.getState().zoom ?? 1) - ZOOM_STEP);
        applyZoomToDom(zoom);
        set({ zoom });
      },
      resetZoom: () => {
        applyZoomToDom(1);
        set({ zoom: 1 });
      },
      setFindOpen: (findOpen) => set({ findOpen }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      toggleOutline: () => set((s) => ({ outlineOpen: !s.outlineOpen })),
      toggleMinimap: () => set((s) => ({ minimapOpen: !s.minimapOpen })),
      setViewMode: (viewMode) => set({ viewMode }),
      setKeyMode: (keyMode) => set({ keyMode }),
      toggleFullscreen: () => set((s) => ({ fullscreen: !s.fullscreen })),
      toggleDistractionFree: () =>
        set((s) => ({ distractionFree: !s.distractionFree })),
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      setQuickOpenOpen: (quickOpenOpen) => set({ quickOpenOpen }),
    }),
    {
      name: "inkstone.ui",
      storage: createJSONStorage(() => localStorage),
      // Bumped to v2 when we switched the default to preview-only.
      // Existing users with persisted "split"/"edit" are flipped back
      // to "preview" once; any subsequent change they make is honoured.
      version: 2,
      migrate: (raw: unknown, version) => {
        const s = (raw ?? {}) as Partial<UiState>;
        if (version < 2) {
          return { ...s, viewMode: "preview" } as UiState;
        }
        return s as UiState;
      },
      partialize: (s) => ({
        sidebarOpen: s.sidebarOpen,
        sidebarWidth: s.sidebarWidth,
        outlineOpen: s.outlineOpen,
        minimapOpen: s.minimapOpen,
        viewMode: s.viewMode,
        keyMode: s.keyMode,
        zoom: s.zoom,
      }),
      onRehydrateStorage: () => (state) => {
        // Mirror persisted zoom back into the CSS variable on first paint.
        if (state) applyZoomToDom(clampZoom(state.zoom ?? 1));
      },
    },
  ),
);
