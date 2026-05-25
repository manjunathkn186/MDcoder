import { useEffect, useRef, useState } from "react";
import { logger } from "@lib/logger";
import { useUi } from "@state/ui.store";

let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;
let renderSeq = 0;

async function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => {
      const mermaid = m.default;
      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        // `loose` (instead of `strict`) lets sequence diagrams, gantt
        // charts, and class diagrams render correctly. Click handlers
        // are still scoped to the rendered SVG only — Mermaid does not
        // evaluate arbitrary script from the source.
        securityLevel: "loose",
        // Don't override fontFamily with a CSS var: Mermaid does text
        // measurement against a detached node where CSS vars aren't
        // resolved, which produces zero-size sequence/gantt diagrams.
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

export interface MermaidProps {
  src: string;
  id: string;
}

export function Mermaid({ src, id }: MermaidProps): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const renderedSrcRef = useRef<string | null>(null);
  const naturalSizeRef = useRef<{ w: number; h: number } | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Mermaid SVGs ignore CSS font-size, the prose `--ink-zoom` cascade, and
  // (in WKWebView) the CSS `zoom` property — they paint at their intrinsic
  // viewBox size capped by an injected `style="max-width:…"`. The only
  // reliable way to scale them is to write the desired pixel dimensions
  // directly onto the `<svg>` element after Mermaid finishes rendering.
  const zoom = useUi((s) => s.zoom);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let cancelled = false;

    // If we already rendered this exact source for this slot, skip — but
    // still re-attach the IO so the next visibility change can re-render
    // if the src ever changes.
    const renderNow = async () => {
      if (renderedSrcRef.current === src) return;
      setState("loading");
      try {
        const mermaid = await getMermaid();
        // Globally-unique id avoids SVG id collisions when the same
        // diagram is mounted twice (e.g. minimap/preview).
        const renderId = `m-${id}-${++renderSeq}`;
        const { svg, bindFunctions } = await mermaid.render(renderId, src);
        if (cancelled || !node) return;
        node.innerHTML = svg;
        bindFunctions?.(node);
        renderedSrcRef.current = src;
        setState("done");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn("[mermaid] render failed", msg);
        setError(msg);
        setState("error");
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        void renderNow();
      },
      { rootMargin: "200px" },
    );
    io.observe(node);
    return () => {
      cancelled = true;
      io.disconnect();
    };
    // NOTE: do NOT depend on `state` here — that caused the effect to
    // tear down mid-render (setState → cleanup → cancelled=true →
    // render result discarded), which is why sequence diagrams
    // intermittently showed blank.
  }, [src, id]);

  // After a successful render (or whenever the user changes zoom), resize
  // the SVG by multiplying its intrinsic viewBox dimensions by `zoom`. The
  // intrinsic size is captured once on first paint and reused so subsequent
  // zoom changes don't have to re-parse the SVG.
  useEffect(() => {
    if (state !== "done") return;
    const host = ref.current;
    if (!host) return;
    const svg = host.querySelector("svg");
    if (!svg) return;

    if (!naturalSizeRef.current) {
      let w = 0;
      let h = 0;
      const vb = svg.getAttribute("viewBox");
      if (vb) {
        const p = vb.trim().split(/\s+/).map(Number);
        if (p.length === 4 && p.every((n) => Number.isFinite(n))) {
          w = p[2];
          h = p[3];
        }
      }
      if (!w || !h) {
        // Fallback for SVGs without viewBox.
        w = parseFloat(svg.getAttribute("width") ?? "") || svg.getBoundingClientRect().width;
        h = parseFloat(svg.getAttribute("height") ?? "") || svg.getBoundingClientRect().height;
      }
      if (!w || !h) return;
      naturalSizeRef.current = { w, h };
    }

    const { w, h } = naturalSizeRef.current;
    svg.style.width = `${w * zoom}px`;
    svg.style.height = `${h * zoom}px`;
    // Defeat Mermaid's injected `max-width:<natural>px` so we can scale up.
    svg.style.maxWidth = "none";
  }, [zoom, state]);

  if (state === "error") {
    return (
      <pre className="rounded border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
        Mermaid error: {error}
        {"\n\n"}
        {src}
      </pre>
    );
  }

  // Centering is owned by `.ink-prose .ink-mermaid` (display: block;
  // text-align: center). Sizing is owned by the effect above. The parent
  // article (.ink-prose) has overflow:auto, so zoomed-up diagrams gain a
  // horizontal scrollbar without disturbing the rest of the layout.
  return <div ref={ref} className="ink-mermaid my-4" aria-label="Diagram" />;
}
