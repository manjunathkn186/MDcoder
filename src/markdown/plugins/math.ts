import type MarkdownIt from "markdown-it";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";

/**
 * Math plugin for markdown-it. Emits placeholder markup that is hydrated
 * client-side by `katex.render()` to keep the worker bundle slim and to
 * avoid blocking parsing on math layout.
 *
 *   Inline:  $expr$        → <span class="ink-math-inline" data-tex="expr">expr</span>
 *   Block:   $$ expr $$    → <div  class="ink-math-block"  data-tex="expr">expr</div>
 */
export function math(md: MarkdownIt): void {
  md.inline.ruler.after("escape", "math_inline", (state: StateInline, silent: boolean) => {
    if (state.src.charCodeAt(state.pos) !== 0x24 /* $ */) return false;
    // Skip $$ (handled by block rule).
    if (state.src.charCodeAt(state.pos + 1) === 0x24) return false;

    const start = state.pos + 1;
    let end = start;
    while (end < state.posMax) {
      const c = state.src.charCodeAt(end);
      if (c === 0x24 && state.src.charCodeAt(end - 1) !== 0x5c /* \ */) break;
      end++;
    }
    if (end >= state.posMax || end === start) return false;
    const content = state.src.slice(start, end).trim();
    if (!content) return false;

    if (!silent) {
      const t = state.push("math_inline", "", 0);
      t.markup = "$";
      t.content = content;
    }
    state.pos = end + 1;
    return true;
  });

  md.block.ruler.after(
    "blockquote",
    "math_block",
    (state: StateBlock, startLine: number, endLine: number, silent: boolean) => {
      const start = state.bMarks[startLine] + state.tShift[startLine];
      const max = state.eMarks[startLine];
      if (start + 2 > max) return false;
      if (state.src.slice(start, start + 2) !== "$$") return false;

      let nextLine = startLine;
      let found = false;
      let content = "";
      const firstLineRest = state.src.slice(start + 2, max);
      if (firstLineRest.trim().endsWith("$$") && firstLineRest.trim() !== "$$") {
        content = firstLineRest.trim().slice(0, -2).trim();
        found = true;
      } else {
        content = firstLineRest + "\n";
        for (nextLine = startLine + 1; nextLine < endLine; nextLine++) {
          const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
          const lineMax = state.eMarks[nextLine];
          const line = state.src.slice(lineStart, lineMax);
          if (line.trim().endsWith("$$")) {
            content += line.replace(/\$\$\s*$/, "");
            found = true;
            break;
          }
          content += line + "\n";
        }
      }
      if (!found) return false;
      if (silent) return true;

      const t = state.push("math_block", "div", 0);
      t.block = true;
      t.markup = "$$";
      t.content = content.trim();
      t.map = [startLine, nextLine + 1];

      state.line = nextLine + 1;
      return true;
    },
    { alt: [] },
  );

  md.renderer.rules.math_inline = (tokens, idx) => {
    const tex = tokens[idx].content;
    return `<span class="ink-math-inline" data-tex="${escapeAttr(tex)}">${escapeHtml(tex)}</span>`;
  };
  md.renderer.rules.math_block = (tokens, idx) => {
    const tex = tokens[idx].content;
    const line = tokens[idx].attrGet("data-source-line");
    const lineAttr = line ? ` data-source-line="${line}"` : "";
    return `<div class="ink-math-block" data-tex="${escapeAttr(tex)}"${lineAttr}>${escapeHtml(tex)}</div>`;
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
