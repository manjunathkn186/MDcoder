import { useEffect, useMemo, useRef, useState } from "react";

export interface VirtualWindow {
  /** First visible item index (inclusive). */
  startIndex: number;
  /** Last visible item index (exclusive). */
  endIndex: number;
  /** Pixel offset to apply to the rendered slice. */
  offsetTop: number;
  /** Total scroll-area height. */
  totalHeight: number;
}

export interface UseVirtualWindowOptions {
  /** Number of items in the dataset. */
  count: number;
  /** Fixed item height in CSS pixels. */
  itemHeight: number;
  /** Extra rows rendered above + below the viewport. */
  overscan?: number;
  /** Container element (e.g. the scrolling div). */
  containerRef: React.RefObject<HTMLElement>;
}

/**
 * Lightweight virtual-scroll calculator. Returns the index window plus
 * the pixel offset for the rendered slice.
 *
 * Designed for fixed-height rows (file tree, palette lists). For varying
 * heights, use an external library — but most of our long lists are
 * uniform single-line rows.
 */
export function useVirtualWindow({
  count,
  itemHeight,
  overscan = 6,
  containerRef,
}: UseVirtualWindowOptions): VirtualWindow {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setScrollTop(el.scrollTop);
        setViewport(el.clientHeight);
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef]);

  return useMemo(() => {
    const totalHeight = count * itemHeight;
    if (viewport === 0 || count === 0) {
      return { startIndex: 0, endIndex: Math.min(count, 30), offsetTop: 0, totalHeight };
    }
    const first = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(viewport / itemHeight) + overscan * 2;
    const end = Math.min(count, first + visibleCount);
    return {
      startIndex: first,
      endIndex: end,
      offsetTop: first * itemHeight,
      totalHeight,
    };
  }, [scrollTop, viewport, count, itemHeight, overscan]);
}
