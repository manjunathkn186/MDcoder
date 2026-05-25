/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Tauri expects a fixed dev server port.
const TAURI_DEV_PORT = 1420;

/**
 * Production tuning (Phase 9):
 *
 * - `manualChunks` splits the long-tail dependencies into bounded vendor
 *   bundles so the initial page only loads the shell + editor. Heavy
 *   features (Mermaid, Shiki, KaTeX, docx exporter, CodeMirror Vim/Emacs)
 *   stay lazy.
 * - `treeshake.moduleSideEffects: false` lets Rollup drop unused exports
 *   from our own modules.
 * - `cssMinify: lightningcss` is faster and smaller than the esbuild
 *   default for our token-heavy stylesheet.
 * - Pre-bundled deps are pinned so first dev start is instant.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@app": path.resolve(__dirname, "src/app"),
      "@ipc": path.resolve(__dirname, "src/ipc"),
      "@state": path.resolve(__dirname, "src/state"),
      "@features": path.resolve(__dirname, "src/features"),
      "@ui": path.resolve(__dirname, "src/ui"),
      "@themes": path.resolve(__dirname, "src/themes"),
      "@lib": path.resolve(__dirname, "src/lib"),
      "@styles": path.resolve(__dirname, "src/styles"),
      "@types": path.resolve(__dirname, "src/types"),
    },
  },
  clearScreen: false,
  server: {
    port: TAURI_DEV_PORT,
    strictPort: true,
    host: "127.0.0.1",
    hmr: { protocol: "ws", host: "127.0.0.1", port: TAURI_DEV_PORT + 1 },
    watch: { ignored: ["**/src-tauri/**"] },
    fs: { strict: true },
  },
  envPrefix: ["VITE_", "TAURI_"],
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "zustand",
      "zustand/middleware",
      "markdown-it",
    ],
    // Exclude heavyweight optional deps so we don't pre-bundle them.
    exclude: ["mermaid", "shiki", "katex", "docx"],
  },
  build: {
    target: "es2022",
    minify: "esbuild",
    cssMinify: "esbuild",
    sourcemap: !!process.env.TAURI_DEBUG,
    outDir: "dist",
    chunkSizeWarningLimit: 1024,
    reportCompressedSize: false, // saves ~1s on builds
    rollupOptions: {
      // Default Rollup treeshaking respects side-effected modules
      // (React mount, theme tokens, etc.). Per-package treeshaking
      // already happens inside each dep's own bundle.
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          // Heavy, lazily-loaded vendors live in their own files so they
          // never enter the initial download.
          if (id.includes("mermaid")) return "vendor-mermaid";
          if (id.includes("shiki")) return "vendor-shiki";
          if (id.includes("katex")) return "vendor-katex";
          if (/[\\/]node_modules[\\/]docx[\\/]/.test(id)) return "vendor-docx";
          if (id.includes("@replit/codemirror-vim")) return "vendor-cm-vim";
          if (id.includes("@replit/codemirror-emacs")) return "vendor-cm-emacs";
          if (id.includes("@codemirror") || id.includes("@lezer")) return "vendor-codemirror";
          if (id.includes("markdown-it") || id.includes("remark") || id.includes("rehype") || id.includes("unified")) {
            return "vendor-markdown";
          }
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("react-dom") || id.includes("react-router") || id.includes("/react/")) {
            return "vendor-react";
          }
          if (id.includes("zustand")) return "vendor-state";
          return "vendor-misc";
        },
      },
    },
  },
  worker: {
    format: "es",
    rollupOptions: {
      output: { entryFileNames: "assets/worker-[name]-[hash].js" },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
