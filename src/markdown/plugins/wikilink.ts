import type MarkdownIt from "markdown-it";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";

/**
 * `[[Page]]` or `[[Page|Alias]]` → `<a class="ink-wikilink" data-target="…">…</a>`.
 * Resolution to a real path happens client-side via the index, allowing
 * preview to color broken links and route clicks.
 */
export function wikilink(md: MarkdownIt): void {
  md.inline.ruler.after("emphasis", "wikilink", (state: StateInline, silent: boolean) => {
    if (state.src.charCodeAt(state.pos) !== 0x5b) return false; // [
    if (state.src.charCodeAt(state.pos + 1) !== 0x5b) return false;
    const end = state.src.indexOf("]]", state.pos + 2);
    if (end < 0) return false;
    const inner = state.src.slice(state.pos + 2, end);
    if (!inner || inner.includes("\n")) return false;

    const [rawTarget, ...aliasParts] = inner.split("|");
    const target = rawTarget.trim();
    const alias = (aliasParts.join("|") || target).trim();
    if (!target) return false;

    if (!silent) {
      const t = state.push("wikilink", "", 0);
      t.attrs = [
        ["class", "ink-wikilink"],
        ["data-target", target],
      ];
      t.content = alias;
    }
    state.pos = end + 2;
    return true;
  });

  md.renderer.rules.wikilink = (tokens, idx) => {
    const t = tokens[idx];
    const target = escapeAttr(t.attrGet("data-target") ?? "");
    const text = escapeHtml(t.content);
    return `<a class="ink-wikilink" data-target="${target}" href="#">${text}</a>`;
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
