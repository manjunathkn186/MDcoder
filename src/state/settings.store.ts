import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  applyTheme,
  resolveActiveTheme,
  DEFAULT_LIGHT_ID,
  DEFAULT_DARK_ID,
} from "@themes/registry";

export type ThemeMode = "system" | "light" | "dark";
export type DensityMode = "compact" | "comfortable" | "cozy";

export interface SettingsState {
  /** OS sync, force light, or force dark. */
  themeMode: ThemeMode;
  /** Theme used when the active mode resolves to "light". */
  lightThemeId: string;
  /** Theme used when the active mode resolves to "dark". */
  darkThemeId: string;
  /** UI density — also controls --ink-fs-base. */
  density: DensityMode;
  /** Editor preferences (kept here for cross-feature access). */
  editorFontSize: number;
  editorFontFamily: string;
  showLineNumbers: boolean;
  showInvisibles: boolean;

  /** Apply current settings to the DOM (called on mount + on each change). */
  apply: () => void;
  setThemeMode: (m: ThemeMode) => void;
  setLightThemeId: (id: string) => void;
  setDarkThemeId: (id: string) => void;
  setDensity: (d: DensityMode) => void;
  setEditorFontSize: (n: number) => void;
  setEditorFontFamily: (s: string) => void;
  toggleLineNumbers: () => void;
  toggleInvisibles: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      themeMode: "system",
      lightThemeId: DEFAULT_LIGHT_ID,
      darkThemeId: DEFAULT_DARK_ID,
      density: "comfortable",
      editorFontSize: 15,
      editorFontFamily: "var(--ink-font-mono)",
      showLineNumbers: true,
      showInvisibles: false,

      apply: () => {
        const s = get();
        const theme = resolveActiveTheme(s.themeMode, s.lightThemeId, s.darkThemeId);
        applyTheme(theme);
        document.documentElement.setAttribute("data-density", s.density);
      },
      setThemeMode: (themeMode) => {
        set({ themeMode });
        get().apply();
      },
      setLightThemeId: (lightThemeId) => {
        set({ lightThemeId });
        get().apply();
      },
      setDarkThemeId: (darkThemeId) => {
        set({ darkThemeId });
        get().apply();
      },
      setDensity: (density) => {
        set({ density });
        get().apply();
      },
      setEditorFontSize: (editorFontSize) => set({ editorFontSize }),
      setEditorFontFamily: (editorFontFamily) => set({ editorFontFamily }),
      toggleLineNumbers: () => set((s) => ({ showLineNumbers: !s.showLineNumbers })),
      toggleInvisibles: () => set((s) => ({ showInvisibles: !s.showInvisibles })),
    }),
    {
      name: "inkstone.settings",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (raw, fromVersion) => {
        // Phase 6 migration: collapse old `theme: 'light'|'dark'|'system'` field.
        if (fromVersion === undefined || fromVersion < 2) {
          const old = raw as { theme?: string };
          const themeMode: ThemeMode =
            old.theme === "light" || old.theme === "dark" || old.theme === "system"
              ? old.theme
              : "system";
          return {
            themeMode,
            lightThemeId: DEFAULT_LIGHT_ID,
            darkThemeId: DEFAULT_DARK_ID,
            density: "comfortable",
            editorFontSize: 15,
            editorFontFamily: "var(--ink-font-mono)",
            showLineNumbers: true,
            showInvisibles: false,
          } as Partial<SettingsState>;
        }
        return raw;
      },
      onRehydrateStorage: () => (state) => {
        // Apply on hydration so first paint matches persisted preferences.
        state?.apply();
      },
    },
  ),
);
