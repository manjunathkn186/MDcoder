import type { EditorView } from "@codemirror/view";

/**
 * Bidirectional scroll sync based on `data-source-line` attributes
 * emitted by the markdown-it sourceLine plugin.
 *
 * Phase 11 (review) fixes:
 *   - Separate RAF tokens per direction so the editor and preview
 *     handlers no longer cancel each other's frames.
 *   - DOM is queried once and re-queried only when the preview's
 *     childList mutates (MutationObserver). On long documents this
 *     cuts per-scroll cost from O(n) to O(log n) via binary search.
 */
export interface ScrollSyncHandle {
  dispose(): void;
}

export function attachScrollSync(
  view: EditorView,
  preview: HTMLElement,
): ScrollSyncHandle {
  let suspendEditor = 0;
  let suspendPreview = 0;
  let rafEditor = 0;
  let rafPreview = 0;

  // Cached node list — refreshed lazily on MutationObserver events.
  let cachedNodes: HTMLElement[] | null = null;
  let cachedLines: number[] | null = null;

  const refresh = () => {
    cachedNodes = Array.from(preview.querySelectorAll<HTMLElement>("[data-source-line]"));
    cachedLines = cachedNodes.map((n) => Number(n.getAttribute("data-source-line")) || 0);
  };
  const nodes = (): HTMLElement[] => {
    if (cachedNodes === null) refresh();
    return cachedNodes!;
  };
  const lines = (): number[] => {
    if (cachedLines === null) refresh();
    return cachedLines!;
  };

  // Binary search for largest indexed line <= target.
  const indexForLine = (target: number): number => {
    const xs = lines();
    if (xs.length === 0) return -1;
    let lo = 0;
    let hi = xs.length - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= target) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  };

  const findPreviewElementForLine = (line: number): HTMLElement | null => {
    const i = indexForLine(line);
    return i >= 0 ? nodes()[i] : null;
  };

  const findLineForPreviewScroll = (): number => {
    const previewTop = preview.getBoundingClientRect().top;
    const ns = nodes();
    // Scan upwards from the bottom — most docs spend most scroll time
    // near the top, but the linear scan is cheap with the cached list.
    let bestLine = 1;
    for (let i = 0; i < ns.length; i++) {
      const top = ns[i].getBoundingClientRect().top;
      if (top - previewTop <= 0) {
        bestLine = lines()[i];
      } else break;
    }
    return bestLine;
  };

  const onEditorScroll = () => {
    if (suspendEditor > 0) {
      suspendEditor--;
      return;
    }
    if (rafEditor) cancelAnimationFrame(rafEditor);
    rafEditor = requestAnimationFrame(() => {
      rafEditor = 0;
      const top = view.scrollDOM.scrollTop;
      const pos = view.posAtCoords({ x: 0, y: top + 1 }, false);
      if (pos == null) return;
      const line = view.state.doc.lineAt(pos).number;
      const el = findPreviewElementForLine(line);
      if (!el) return;
      suspendPreview++;
      el.scrollIntoView({ block: "start", behavior: "auto" });
    });
  };

  const onPreviewScroll = () => {
    if (suspendPreview > 0) {
      suspendPreview--;
      return;
    }
    if (rafPreview) cancelAnimationFrame(rafPreview);
    rafPreview = requestAnimationFrame(() => {
      rafPreview = 0;
      const line = findLineForPreviewScroll();
      if (line < 1) return;
      const target = Math.min(line, view.state.doc.lines);
      const pos = view.state.doc.line(target).from;
      const coords = view.coordsAtPos(pos);
      if (!coords) return;
      suspendEditor++;
      view.scrollDOM.scrollTo({
        top: coords.top - view.scrollDOM.getBoundingClientRect().top + view.scrollDOM.scrollTop,
      });
    });
  };

  const mo = new MutationObserver(() => {
    cachedNodes = null;
    cachedLines = null;
  });
  mo.observe(preview, { childList: true, subtree: true });

  view.scrollDOM.addEventListener("scroll", onEditorScroll, { passive: true });
  preview.addEventListener("scroll", onPreviewScroll, { passive: true });

  return {
    dispose: () => {
      view.scrollDOM.removeEventListener("scroll", onEditorScroll);
      preview.removeEventListener("scroll", onPreviewScroll);
      mo.disconnect();
      if (rafEditor) cancelAnimationFrame(rafEditor);
      if (rafPreview) cancelAnimationFrame(rafPreview);
    },
  };
}
