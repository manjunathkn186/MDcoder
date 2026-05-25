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
declare const _default: import("vite").UserConfig;
export default _default;
