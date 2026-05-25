/**
 * Regression coverage for the four UI/logic enhancements:
 *   - Content zoom (CSS var + clamping)
 *   - Global content search controller (preview-only path)
 *   - Per-doc session persistence (cursor + scrollTop)
 *
 * Full-width layout is a pure-CSS change in styles/prose.css and is
 * asserted by reading the stylesheet contents — no DOM mount required.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderHook } from "@testing-library/react";
import { useUi, ZOOM_MAX, ZOOM_MIN } from "../src/state/ui.store";
import { useViewState } from "../src/state/viewState.store";
import { FindController } from "../src/features/find/findController";
import { useTrackpadZoom } from "../src/app/trackpadZoom";

// Reset Zustand stores between cases.
beforeEach(() => {
  useUi.setState({ zoom: 1, findOpen: false });
  useViewState.setState({ byDoc: {} });
  document.documentElement.style.removeProperty("--ink-zoom");
});

describe("zoom store", () => {
  it("zoomIn / zoomOut step by ~10% and clamp to bounds", () => {
    const { zoomIn, zoomOut, setZoom } = useUi.getState();
    zoomIn();
    expect(useUi.getState().zoom).toBeCloseTo(1.1, 5);
    zoomOut();
    zoomOut();
    expect(useUi.getState().zoom).toBeCloseTo(0.9, 5);
    setZoom(99);
    expect(useUi.getState().zoom).toBe(ZOOM_MAX);
    setZoom(0.01);
    expect(useUi.getState().zoom).toBe(ZOOM_MIN);
  });

  it("setZoom writes the --ink-zoom CSS variable", () => {
    useUi.getState().setZoom(1.5);
    expect(document.documentElement.style.getPropertyValue("--ink-zoom")).toBe(
      "1.5",
    );
  });
});

describe("per-doc view state", () => {
  it("patches preserve untouched fields and survive across docs", () => {
    const vs = useViewState.getState();
    vs.patch("a", { cursor: 42, editorScrollTop: 100 });
    vs.patch("a", { previewScrollTop: 250 });
    vs.patch("b", { cursor: 7 });
    expect(useViewState.getState().get("a")).toEqual({
      cursor: 42,
      editorScrollTop: 100,
      previewScrollTop: 250,
    });
    expect(useViewState.getState().get("b").cursor).toBe(7);
    expect(useViewState.getState().get("b").editorScrollTop).toBe(0);
  });

  it("drop removes a doc's state", () => {
    useViewState.getState().patch("x", { cursor: 1 });
    useViewState.getState().drop("x");
    expect(useViewState.getState().get("x").cursor).toBe(0);
  });
});

describe("preview find controller", () => {
  it("finds, navigates, and removes wrappers cleanly", () => {
    const host = document.createElement("article");
    host.innerHTML =
      "<p>Hello world.</p><p>Say hello again, hello!</p><pre><code>hello in code</code></pre>";
    document.body.appendChild(host);
    try {
      const ctrl = new FindController(() => host);
      const r1 = ctrl.search("hello");
      // Three matches in prose, code block is skipped.
      expect(r1.total).toBe(3);
      expect(r1.index).toBe(1);
      const r2 = ctrl.next();
      expect(r2.index).toBe(2);
      const r3 = ctrl.prev();
      expect(r3.index).toBe(1);

      // Active hit gets the active class.
      expect(host.querySelectorAll(".ink-find-hit-active").length).toBe(1);
      // Code block content is untouched.
      expect(host.querySelector("pre code")?.textContent).toBe("hello in code");

      ctrl.clear();
      expect(host.querySelectorAll("mark.ink-find-hit").length).toBe(0);
      // Round-trip: text reads exactly as before the search.
      expect(host.textContent).toBe(
        "Hello world.Say hello again, hello!hello in code",
      );
    } finally {
      host.remove();
    }
  });
});

describe("trackpad pinch-to-zoom", () => {
  it("ctrl+wheel adjusts zoom and prevents default; plain wheel is ignored", () => {
    const { unmount } = renderHook(() => useTrackpadZoom());
    try {
      // Plain wheel must not touch zoom or be preventDefault'd.
      const plain = new WheelEvent("wheel", {
        deltaY: -50,
        ctrlKey: false,
        cancelable: true,
      });
      window.dispatchEvent(plain);
      expect(useUi.getState().zoom).toBe(1);
      expect(plain.defaultPrevented).toBe(false);

      // Pinch-out (ctrlKey + negative deltaY) zooms in.
      const pinchOut = new WheelEvent("wheel", {
        deltaY: -50,
        ctrlKey: true,
        cancelable: true,
      });
      window.dispatchEvent(pinchOut);
      expect(useUi.getState().zoom).toBeGreaterThan(1);
      expect(pinchOut.defaultPrevented).toBe(true);

      // Pinch-in (positive deltaY) zooms back down.
      const before = useUi.getState().zoom;
      window.dispatchEvent(
        new WheelEvent("wheel", {
          deltaY: 50,
          ctrlKey: true,
          cancelable: true,
        }),
      );
      expect(useUi.getState().zoom).toBeLessThan(before);
    } finally {
      unmount();
    }
  });
});

describe("mermaid diagram zoom", () => {
  it("Mermaid.tsx scales the rendered SVG by viewBox * useUi().zoom", () => {
    const src = readFileSync(
      resolve(__dirname, "../src/features/preview/components/Mermaid.tsx"),
      "utf8",
    );
    // The component must subscribe to the global zoom store…
    expect(src).toMatch(/useUi\(\(s\) => s\.zoom\)/);
    // …read the SVG's intrinsic viewBox…
    expect(src).toMatch(/getAttribute\(["']viewBox["']\)/);
    // …and write width/height in pixels onto the element, defeating any
    // injected max-width cap so the SVG can grow past viewport width.
    expect(src).toMatch(/svg\.style\.width\s*=\s*`\$\{w \* zoom\}px`/);
    expect(src).toMatch(/svg\.style\.height\s*=\s*`\$\{h \* zoom\}px`/);
    expect(src).toMatch(/svg\.style\.maxWidth\s*=\s*["']none["']/);
  });

  it("prose.css gives the mermaid SVG max-width:none (defence in depth)", () => {
    const css = readFileSync(
      resolve(__dirname, "../src/styles/prose.css"),
      "utf8",
    );
    expect(css).toMatch(/\.ink-mermaid svg[^}]*max-width:\s*none/);
  });

  it("Preview article uses overflow-auto (both axes) for horizontal scroll", () => {
    const tsx = readFileSync(
      resolve(__dirname, "../src/features/preview/Preview.tsx"),
      "utf8",
    );
    // The .ink-prose article uses overflow-auto (both axes), not overflow-y-auto.
    expect(tsx).toMatch(/className="ink-prose ink-scroll h-full overflow-auto/);
    expect(tsx).not.toMatch(/className="ink-prose[^"]*overflow-y-auto/);
  });

  it("Mermaid component no longer forces display:flex via Tailwind", () => {
    const tsx = readFileSync(
      resolve(__dirname, "../src/features/preview/components/Mermaid.tsx"),
      "utf8",
    );
    // The rendering div must not carry `flex justify-center` (would
    // override the CSS rule that owns layout + zoom + overflow).
    const mountLine =
      tsx.match(/<div ref=\{ref\} className="[^"]*"/)?.[0] ?? "";
    expect(mountLine).toContain("ink-mermaid");
    expect(mountLine).not.toContain("flex");
    expect(mountLine).not.toContain("justify-center");
  });
});

describe("full-width prose layout", () => {
  it("prose.css removes the max-width restriction", () => {
    const css = readFileSync(
      resolve(__dirname, "../src/styles/prose.css"),
      "utf8",
    );
    // The .ink-prose declaration must contain `max-width: none` and must
    // NOT pin the old 78ch limit.
    const block = css.split(".ink-prose {")[1]?.split("}")[0] ?? "";
    expect(block).toMatch(/max-width:\s*none/);
    expect(block).not.toMatch(/max-width:\s*78ch/);
  });

  it("font-size uses the --ink-zoom variable", () => {
    const css = readFileSync(
      resolve(__dirname, "../src/styles/prose.css"),
      "utf8",
    );
    expect(css).toMatch(/var\(--ink-zoom/);
  });
});
