import type { Config } from "tailwindcss";

/**
 * Tailwind is bound to the runtime CSS-variable contract in
 * `src/themes/tokens.css`. Theme switching never touches Tailwind — it
 * just rewrites the variables, so every utility adapts immediately.
 *
 * Dark mode is toggled via `[data-theme="dark"]` on <html>, but most
 * components rely on semantic tokens rather than the `dark:` variant.
 */
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--ink-bg)",
        "bg-soft": "var(--ink-bg-soft)",
        surface: "var(--ink-surface)",
        "surface-2": "var(--ink-surface-2)",
        "surface-elevated": "var(--ink-surface-elevated)",
        fg: "var(--ink-fg)",
        "fg-strong": "var(--ink-fg-strong)",
        muted: "var(--ink-muted)",
        subtle: "var(--ink-subtle)",
        border: "var(--ink-border)",
        "border-strong": "var(--ink-border-strong)",
        accent: "var(--ink-accent)",
        "accent-hover": "var(--ink-accent-hover)",
        "accent-fg": "var(--ink-accent-fg)",
        "accent-soft": "var(--ink-accent-soft)",
        danger: "var(--ink-danger)",
        "danger-soft": "var(--ink-danger-soft)",
        success: "var(--ink-success)",
        "success-soft": "var(--ink-success-soft)",
        warning: "var(--ink-warning)",
        "warning-soft": "var(--ink-warning-soft)",
        info: "var(--ink-info)",
        "info-soft": "var(--ink-info-soft)",
      },
      fontFamily: {
        sans: ["var(--ink-font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--ink-font-mono)", "ui-monospace", "monospace"],
        serif: ["var(--ink-font-serif)", "Georgia", "serif"],
      },
      fontSize: {
        xs: "var(--ink-fs-xs)",
        sm: "var(--ink-fs-sm)",
        md: "var(--ink-fs-md)",
        base: "var(--ink-fs-base)",
        lg: "var(--ink-fs-lg)",
        xl: "var(--ink-fs-xl)",
        "2xl": "var(--ink-fs-2xl)",
        "3xl": "var(--ink-fs-3xl)",
        "4xl": "var(--ink-fs-4xl)",
      },
      lineHeight: {
        tight: "var(--ink-lh-tight)",
        normal: "var(--ink-lh-normal)",
        relaxed: "var(--ink-lh-relaxed)",
      },
      spacing: {
        0: "var(--ink-space-0)",
        1: "var(--ink-space-1)",
        2: "var(--ink-space-2)",
        3: "var(--ink-space-3)",
        4: "var(--ink-space-4)",
        5: "var(--ink-space-5)",
        6: "var(--ink-space-6)",
        7: "var(--ink-space-7)",
        8: "var(--ink-space-8)",
        9: "var(--ink-space-9)",
      },
      borderRadius: {
        sm: "var(--ink-radius-sm)",
        DEFAULT: "var(--ink-radius)",
        lg: "var(--ink-radius-lg)",
        xl: "var(--ink-radius-xl)",
        full: "var(--ink-radius-full)",
      },
      boxShadow: {
        soft: "var(--ink-shadow-1)",
        elev: "var(--ink-shadow-2)",
        pop: "var(--ink-shadow-pop)",
        floating: "var(--ink-shadow-3)",
      },
      zIndex: {
        base: "var(--ink-z-base)",
        overlay: "var(--ink-z-overlay)",
        modal: "var(--ink-z-modal)",
        popover: "var(--ink-z-popover)",
        toast: "var(--ink-z-toast)",
        tooltip: "var(--ink-z-tooltip)",
      },
      transitionTimingFunction: {
        out: "var(--ink-ease-out)",
        "in-out": "var(--ink-ease-in-out)",
        emphasized: "var(--ink-ease-emphasized)",
      },
      transitionDuration: {
        fast: "var(--ink-d-fast)",
        base: "var(--ink-d-base)",
        slow: "var(--ink-d-slow)",
      },
      animation: {
        "fade-in": "ink-fade-in var(--ink-d-base) var(--ink-ease-out) both",
        "fade-out": "ink-fade-out var(--ink-d-base) var(--ink-ease-out) both",
        "slide-up": "ink-slide-up var(--ink-d-base) var(--ink-ease-out) both",
        "slide-down": "ink-slide-down var(--ink-d-base) var(--ink-ease-out) both",
        pop: "ink-pop var(--ink-d-base) var(--ink-ease-emphasized) both",
        pulse: "ink-pulse 2s infinite ease-in-out",
        spin: "ink-spin 0.9s linear infinite",
        shimmer: "ink-shimmer 1.6s ease-in-out infinite",
        "toast-in": "ink-toast-in var(--ink-d-base) var(--ink-ease-out) both",
        "toast-out": "ink-toast-out var(--ink-d-base) var(--ink-ease-in-out) both",
      },
    },
  },
  plugins: [],
};

export default config;
