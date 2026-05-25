/**
 * Heuristics for deciding which features to disable on very large docs.
 *
 *   > LARGE_FILE_CHARS      → switch the editor to plain mode (no decorations,
 *                             no live preview, line wrapping off).
 *   > MASSIVE_FILE_CHARS    → also disable autocomplete and the parser worker.
 *
 * Tuned to keep typing latency under ~16ms (one frame) on a mid-range
 * laptop. Documents below the threshold render with the full pipeline.
 */
export const LARGE_FILE_CHARS = 256 * 1024;     // ~256 KB
export const MASSIVE_FILE_CHARS = 2 * 1024 * 1024; // 2 MB

export type DocSizeClass = "small" | "large" | "massive";

export function classifySize(text: string | null | undefined): DocSizeClass {
  const n = text?.length ?? 0;
  if (n >= MASSIVE_FILE_CHARS) return "massive";
  if (n >= LARGE_FILE_CHARS) return "large";
  return "small";
}
