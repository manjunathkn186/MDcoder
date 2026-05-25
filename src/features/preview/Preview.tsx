import { useEffect, useRef } from "react";
import { usePreview } from "@state/preview.store";
import { useEditor } from "@state/editor.store";
import { useViewState } from "@state/viewState.store";
import { Renderer } from "./renderer";
import { FindPanel } from "@features/find/FindPanel";
import { classifySize, MASSIVE_FILE_CHARS } from "@lib/fileSize";
import { parserService } from "@/markdown/parserService";
import "@styles/prose.css";

export function Preview(): JSX.Element {
  const html = usePreview((s) => s.html);
  const error = usePreview((s) => s.error);
  const activeId = useEditor((s) => s.activeId);
  const docContent = useEditor((s) =>
    s.activeId ? s.docs[s.activeId]?.content ?? "" : "",
  );
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Persist preview scroll position per active doc. On switch back, the
  // restore effect below jumps to the last-seen offset once the HTML for
  // the new doc has been laid out.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !activeId) return;
    const onScroll = (): void => {
      useViewState.getState().patch(activeId, {
        previewScrollTop: el.scrollTop,
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [activeId, html]);

  // Restore preview scroll when the active doc changes or its first
  // render commits. Done in a microtask + rAF chain to ensure layout
  // is settled (markdown-it output + Mermaid portals).
  useEffect(() => {
    if (!activeId || !html) return;
    const el = rootRef.current;
    if (!el) return;
    const target = useViewState.getState().get(activeId).previewScrollTop ?? 0;
    const apply = (): void => {
      if (rootRef.current !== el) return;
      el.scrollTop = target;
    };
    const id = requestAnimationFrame(() => requestAnimationFrame(apply));
    return () => cancelAnimationFrame(id);
  }, [activeId, html]);

  // Drive parsing from the preview itself so it works even when the editor
  // pane is hidden (default `viewMode === "preview"`). When the editor is
  // also mounted, the renderCache deduplicates so there's no double work.
  useEffect(() => {
    if (!docContent) {
      usePreview.getState().reset();
      return;
    }
    if (docContent.length >= MASSIVE_FILE_CHARS) return;
    parserService.parse(docContent);
  }, [docContent]);

  // Massive files disable preview entirely to keep the main thread free.
  if (docContent.length >= MASSIVE_FILE_CHARS) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
        Preview disabled for files over {Math.round(MASSIVE_FILE_CHARS / 1024 / 1024)} MB.
      </div>
    );
  }

  if (error) {
    return (
      <div className="ink-scroll h-full overflow-y-auto p-6">
        <pre className="rounded border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          Parse error: {error}
        </pre>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        {classifySize(docContent) === "large"
          ? "Rendering…"
          : "Nothing to preview"}
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <article
        ref={rootRef}
        className="ink-prose ink-scroll h-full overflow-auto gpu-layer"
        data-inkstone-preview
      >
        <Renderer html={html} rootRef={rootRef} />
      </article>
      <FindPanel rootRef={rootRef} />
    </div>
  );
}
