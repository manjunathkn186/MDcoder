import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PluginManifest } from "@/plugins/sdk/manifest";
import type { PluginModule } from "@/plugins/sdk/api";

export type PluginStatus = "idle" | "activating" | "active" | "error";

export interface InstalledPlugin {
  manifest: PluginManifest;
  source: "builtin" | "user" | "marketplace";
  enabled: boolean;
  status: PluginStatus;
  error?: string;
  /** Trusted (built-in) plugins carry their resolved module. Not persisted. */
  module?: PluginModule;
  /** Untrusted plugins carry their JS source for sandbox execution. */
  code?: string;
}

export interface PluginsState {
  plugins: Record<string, InstalledPlugin>;
  upsert: (p: InstalledPlugin) => void;
  remove: (id: string) => void;
  setEnabled: (id: string, enabled: boolean) => void;
  setStatus: (id: string, status: PluginStatus, error?: string) => void;
  byId: (id: string) => InstalledPlugin | undefined;
}

export const usePlugins = create<PluginsState>()(
  persist(
    (set, get) => ({
      plugins: {},
      upsert: (p) =>
        set((s) => ({ plugins: { ...s.plugins, [p.manifest.id]: { ...s.plugins[p.manifest.id], ...p } } })),
      remove: (id) =>
        set((s) => {
          const next = { ...s.plugins };
          delete next[id];
          return { plugins: next };
        }),
      setEnabled: (id, enabled) =>
        set((s) => {
          const cur = s.plugins[id];
          if (!cur) return s;
          return { plugins: { ...s.plugins, [id]: { ...cur, enabled } } };
        }),
      setStatus: (id, status, error) =>
        set((s) => {
          const cur = s.plugins[id];
          if (!cur) return s;
          return { plugins: { ...s.plugins, [id]: { ...cur, status, error } } };
        }),
      byId: (id) => get().plugins[id],
    }),
    {
      name: "inkstone.plugins",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Strip non-persistable fields (resolved module, in-memory error).
      partialize: (s) => ({
        plugins: Object.fromEntries(
          Object.entries(s.plugins).map(([id, p]) => [
            id,
            {
              manifest: p.manifest,
              source: p.source,
              enabled: p.enabled,
              status: "idle" as PluginStatus,
              code: p.source === "user" || p.source === "marketplace" ? p.code : undefined,
            },
          ]),
        ),
      }),
    },
  ),
);
