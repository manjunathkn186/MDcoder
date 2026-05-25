import type MarkdownIt from "markdown-it";

/**
 * Convert ```mermaid fenced blocks into a placeholder div that the main
 * thread hydrates via `mermaid.render()`.
 *
 *   ```mermaid                <div class="ink-mermaid"
 *   graph TD; A-->B   ─►        data-src="graph TD; A-->B" />
 *   ```
 */
export function mermaid(md: MarkdownIt): void {
  const defaultFence = md.renderer.rules.fence!;
  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const tok = tokens[idx];
    const info = tok.info.trim().toLowerCase();
    if (info === "mermaid") {
      const line = tok.attrGet("data-source-line");
      const lineAttr = line ? ` data-source-line="${line}"` : "";
      const src = tok.content;
      return `<div class="ink-mermaid"${lineAttr} data-src="${escapeAttr(src)}"></div>\n`;
    }
    return defaultFence(tokens, idx, opts, env, self);
  };
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
