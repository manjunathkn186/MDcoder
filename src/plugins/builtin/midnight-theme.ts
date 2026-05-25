/**
 * Built-in plugin: registers a "Midnight" theme variant.
 *
 * Demonstrates a Theme SDK contribution from a plugin.
 */
import type { PluginManifest } from "@/plugins/sdk/manifest";
import type { PluginModule } from "@/plugins/sdk/api";

export const manifest: PluginManifest = {
  id: "midnight-theme",
  name: "Midnight Theme",
  version: "1.0.0",
  description: "Deep purple-black dark theme for low-light writing.",
  author: "Inkstone",
  main: "midnight-theme.ts",
  permissions: ["themes"],
  category: "themes",
  trusted: true,
};

export const plugin: PluginModule = {
  activate(api) {
    return api.themes.register({
      id: "midnight",
      name: "Midnight",
      mode: "dark",
      description: "Deep purple-black dark theme.",
      codeTheme: "github-dark",
      tokens: {
        bg: "#0d0a1a",
        "bg-soft": "#100d22",
        surface: "#16122c",
        "surface-2": "#1d1838",
        "surface-elevated": "#231e45",
        fg: "#e8e7f0",
        "fg-strong": "#ffffff",
        muted: "#9694af",
        subtle: "#6e6c8a",
        border: "#241f3f",
        "border-strong": "#312b5a",
        accent: "#a78bfa",
        "accent-hover": "#c4b5fd",
        "accent-fg": "#0d0a1a",
        "accent-soft": "rgba(167, 139, 250, 0.22)",
        danger: "#f472b6",
        "danger-soft": "rgba(244, 114, 182, 0.20)",
        success: "#34d399",
        "success-soft": "rgba(52, 211, 153, 0.20)",
        warning: "#fbbf24",
        "warning-soft": "rgba(251, 191, 36, 0.20)",
        info: "#38bdf8",
        "info-soft": "rgba(56, 189, 248, 0.20)",
        "code-bg": "#15112a",
        "code-fg": "#e8e7f0",
        selection: "rgba(167, 139, 250, 0.32)",
        link: "#c4b5fd",
        "scroll-thumb": "rgba(232, 231, 240, 0.18)",
        "scroll-thumb-hover": "rgba(232, 231, 240, 0.34)",
        "shadow-color": "rgba(0, 0, 0, 0.6)",
      },
    });
  },
};
