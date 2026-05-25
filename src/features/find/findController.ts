/**
 * In-preview text search.
 *
 * Walks the preview's text nodes, finds case-insensitive matches for the
 * query, and wraps each hit in a `<span class="ink-find-hit">`. The active
 * hit also gets `.ink-find-hit-active` and is scrolled into view.
 *
 * Wrapping is reversible via `clear()` which normalises the host so the
 * preview is exactly as the renderer left it. Skips text inside
 * `<pre>`, `<code>`, and `<script>`/`<style>` to avoid breaking syntax
 * highlighting (Shiki) and Mermaid SVG output.
 */

const HIT_CLASS = "ink-find-hit";
const ACTIVE_CLASS = "ink-find-hit-active";
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "PRE", "CODE", "SVG", "MARK"]);

export interface FindResult {
  total: number;
  index: number; // 1-based index of active hit, 0 when no hits
}

export class FindController {
  private hits: HTMLElement[] = [];
  private active = -1;
  private currentQuery = "";

  constructor(private getRoot: () => HTMLElement | null) {}

  /** Apply a new query; returns hit count + active index. */
  search(query: string): FindResult {
    this.clear();
    this.currentQuery = query;
    const root = this.getRoot();
    if (!root || !query) return { total: 0, index: 0 };

    const needle = query.toLowerCase();
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (!node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          let p: Node | null = node.parentNode;
          while (p && p !== root) {
            if (p.nodeType === 1 && SKIP_TAGS.has((p as Element).tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            p = p.parentNode;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    // Collect matching ranges first; mutate after the walk to avoid
    // disturbing the TreeWalker mid-flight.
    const ranges: { node: Text; start: number; end: number }[] = [];
    let cur: Node | null = walker.nextNode();
    while (cur) {
      const text = cur.nodeValue ?? "";
      const lower = text.toLowerCase();
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const idx = lower.indexOf(needle, from);
        if (idx < 0) break;
        ranges.push({ node: cur as Text, start: idx, end: idx + needle.length });
        from = idx + needle.length;
      }
      cur = walker.nextNode();
    }

    // Wrap from end to start within each text node so offsets remain valid.
    const byNode = new Map<Text, { start: number; end: number }[]>();
    for (const r of ranges) {
      const arr = byNode.get(r.node) ?? [];
      arr.push({ start: r.start, end: r.end });
      byNode.set(r.node, arr);
    }
    this.hits = [];
    byNode.forEach((spans, textNode) => {
      spans.sort((a, b) => a.start - b.start);
      // Splitting consumes the text node — operate on a stable parent.
      const parent = textNode.parentNode;
      if (!parent) return;
      let working = textNode;
      let consumed = 0;
      const created: HTMLElement[] = [];
      for (const span of spans) {
        const relStart = span.start - consumed;
        const relEnd = span.end - consumed;
        const before = working.splitText(relStart);
        const after = before.splitText(relEnd - relStart);
        const mark = document.createElement("mark");
        mark.className = HIT_CLASS;
        mark.textContent = before.nodeValue;
        parent.replaceChild(mark, before);
        created.push(mark);
        working = after as Text;
        consumed = span.end;
      }
      this.hits.push(...created);
    });

    // Preserve document order — byNode iteration above is per-node so
    // multi-node hits already arrive in order, but a sort is cheap insurance.
    this.hits.sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );

    this.active = this.hits.length > 0 ? 0 : -1;
    this.markActive(true);
    return this.count();
  }

  next(): FindResult {
    if (this.hits.length === 0) return this.count();
    this.markActive(false);
    this.active = (this.active + 1) % this.hits.length;
    this.markActive(true);
    return this.count();
  }

  prev(): FindResult {
    if (this.hits.length === 0) return this.count();
    this.markActive(false);
    this.active = (this.active - 1 + this.hits.length) % this.hits.length;
    this.markActive(true);
    return this.count();
  }

  /** Remove all hit markup from the host. Safe to call multiple times. */
  clear(): void {
    const root = this.getRoot();
    if (root) {
      const marks = root.querySelectorAll<HTMLElement>(`mark.${HIT_CLASS}`);
      marks.forEach((m) => {
        const parent = m.parentNode;
        if (!parent) return;
        while (m.firstChild) parent.insertBefore(m.firstChild, m);
        parent.removeChild(m);
      });
      // Merge adjacent text nodes that were created during splitting.
      root.normalize();
    }
    this.hits = [];
    this.active = -1;
    this.currentQuery = "";
  }

  /** Re-run the most recent query — call after the preview HTML re-renders. */
  refresh(): FindResult {
    if (!this.currentQuery) return { total: 0, index: 0 };
    return this.search(this.currentQuery);
  }

  private markActive(on: boolean): void {
    const el = this.hits[this.active];
    if (!el) return;
    el.classList.toggle(ACTIVE_CLASS, on);
    if (on && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  private count(): FindResult {
    return {
      total: this.hits.length,
      index: this.active < 0 ? 0 : this.active + 1,
    };
  }
}
