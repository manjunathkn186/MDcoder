import { useEffect, useRef, useState } from "react";
import { useEditor } from "@state/editor.store";
import { editorRegistry } from "./extensions/editorRegistry";
import { useOutline } from "./hooks/useOutline";

/**
 * Lightweight minimap: a vertical gauge proportional to the document length
 * with markers at every heading and a draggable viewport indicator. Designed
 * to be O(N_headings) — no full-text mirror — so large docs stay performant.
 */
export function Minimap(): JSX.Element | null {
  const doc = useEditor((s) => (s.activeId ? s.docs[s.activeId] : null));
  const headings = useOutline(doc?.content ?? "");
  const railRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    if (!doc) return;
    const view = editorRegistry.get(doc.id);
    if (!view) return;
    const scrollDom = view.scrollDOM;
    const update = () => {
      const total = scrollDom.scrollHeight - scrollDom.clientHeight;
      if (total <= 0) return setViewport({ top: 0, height: 100 });
      const pct = scrollDom.scrollTop / total;
      const visibleFraction = scrollDom.clientHeight / scrollDom.scrollHeight;
      setViewport({ top: pct * (100 - visibleFraction * 100), height: visibleFraction * 100 });
    };
    update();
    scrollDom.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(scrollDom);
    return () => {
      scrollDom.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [doc?.id, doc]);

  const totalLines = doc?.content.split(/\r?\n/).length ?? 0;

  if (!doc) return null;

  const jumpToFraction = (frac: number) => {
    const view = editorRegistry.get(doc.id);
    if (!view) return;
    const sd = view.scrollDOM;
    const total = sd.scrollHeight - sd.clientHeight;
    sd.scrollTo({ top: total * frac });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    const move = (clientY: number) => {
      const frac = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      jumpToFraction(frac);
    };
    move(e.clientY);
    const onMove = (m: PointerEvent) => move(m.clientY);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      ref={railRef}
      onPointerDown={onPointerDown}
      role="slider"
      aria-label="Document minimap"
      aria-valuemin={0}
      aria-valuemax={totalLines}
      className="relative h-full w-12 cursor-pointer select-none border-l border-border bg-surface"
    >
      {headings.map((h, i) => (
        <div
          key={i}
          className="absolute left-1 right-1 rounded-sm bg-fg/70"
          style={{
            top: `${(h.line / Math.max(1, totalLines)) * 100}%`,
            height: Math.max(2, 8 - h.level) + "px",
            opacity: 1 - (h.level - 1) * 0.15,
          }}
          title={`H${h.level} · ${h.text}`}
        />
      ))}
      {viewport && (
        <div
          className="absolute left-0 right-0 border border-accent/60 bg-accent/15"
          style={{ top: `${viewport.top}%`, height: `${viewport.height}%` }}
        />
      )}
    </div>
  );
}
