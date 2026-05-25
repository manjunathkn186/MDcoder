import type MarkdownIt from "markdown-it";

/**
 * markdown-it plugin that annotates every block-level opening token with
 * `data-source-line="N"` (1-indexed), enabling editor⇄preview scroll sync.
 */
export function sourceLine(md: MarkdownIt): void {
  md.core.ruler.push("source-line", (state) => {
    for (const tok of state.tokens) {
      if (tok.type.endsWith("_open") && tok.map) {
        tok.attrSet("data-source-line", String(tok.map[0] + 1));
      } else if (tok.type === "fence" && tok.map) {
        tok.attrSet("data-source-line", String(tok.map[0] + 1));
      } else if (tok.type === "hr" && tok.map) {
        tok.attrSet("data-source-line", String(tok.map[0] + 1));
      }
    }
  });
}
