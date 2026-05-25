import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Mermaid } from "./components/Mermaid";
import { getHighlighter, ensureLanguage, pickTheme } from "./highlighter";
import { useIndex } from "@state/index.store";
import { useEditor } from "@state/editor.store";
import { fileCache } from "@/services/cache";
import { basename } from "@/services/fs";
import { logger } from "@lib/logger";

export interface RendererProps {
  html: string;
  rootRef: React.RefObject<HTMLDivElement>;
}

interface MermaidSlot {
  id: string;
  src: string;
  node: HTMLElement;
}

export function Renderer({ html, rootRef }: RendererProps): JSX.Element {
  // Mermaid slots must live in state, not a ref. Storing them in a ref
  // means the JSX `slots.map(...)` runs with the previous value and we
  // don't get a re-render after the effect populates them — that left
  // diagrams blank in preview-only mode where only a single parse fires.
  const [slots, setSlots] = useState<MermaidSlot[]>([]);
  const versionRef = useRef(0);

  const safeHtml = useMemo(() => stripDangerousAttributes(html), [html]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    versionRef.current += 1;
    const myVersion = versionRef.current;

    root.innerHTML = safeHtml;
    const nextSlots = collectMermaidSlots(root);
    setSlots(nextSlots);
    hydrateKatex(root);
    hydrateWikilinks(root);
    void hydrateShiki(root, myVersion, versionRef);
  }, [safeHtml, rootRef]);

  return (
    <>
      {slots.map((slot) =>
        createPortal(<Mermaid key={slot.id} id={slot.id} src={slot.src} />, slot.node),
      )}
    </>
  );
}

function collectMermaidSlots(root: HTMLElement): MermaidSlot[] {
  const out: MermaidSlot[] = [];
  let i = 0;
  root.querySelectorAll<HTMLElement>(".ink-mermaid").forEach((node) => {
    const src = node.getAttribute("data-src") ?? "";
    node.innerHTML = "";
    out.push({ id: `${i++}`, src: decode(src), node });
  });
  return out;
}

function hydrateKatex(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(".ink-math-inline").forEach((el) => {
    const tex = el.getAttribute("data-tex") ?? "";
    try {
      katex.render(decode(tex), el, { throwOnError: false, displayMode: false });
    } catch (err) {
      logger.warn("[katex] inline render failed", err);
    }
  });
  root.querySelectorAll<HTMLElement>(".ink-math-block").forEach((el) => {
    const tex = el.getAttribute("data-tex") ?? "";
    try {
      katex.render(decode(tex), el, { throwOnError: false, displayMode: true });
    } catch (err) {
      logger.warn("[katex] block render failed", err);
    }
  });
}

function hydrateWikilinks(root: HTMLElement): void {
  const { resolveWikilink, files } = useIndex.getState();
  root.querySelectorAll<HTMLAnchorElement>("a.ink-wikilink").forEach((a) => {
    const target = a.getAttribute("data-target") ?? "";
    const path = resolveWikilink(target);
    if (path && files.has(path)) {
      a.classList.remove("is-broken");
      a.setAttribute("data-resolved", path);
      a.setAttribute("title", path);
    } else {
      a.classList.add("is-broken");
      a.setAttribute("title", `Unresolved: ${target}`);
    }
    a.onclick = async (e) => {
      e.preventDefault();
      const resolved = a.getAttribute("data-resolved");
      if (!resolved) return;
      try {
        const content = await fileCache.read(resolved);
        useEditor.getState().openDoc({
          id: resolved,
          path: resolved,
          title: basename(resolved),
          content,
        });
      } catch (err) {
        logger.warn("[wikilink] open failed", err);
      }
    };
  });
}

async function hydrateShiki(
  root: HTMLElement,
  version: number,
  versionRef: React.MutableRefObject<number>,
): Promise<void> {
  const codeNodes = Array.from(
    root.querySelectorAll<HTMLElement>("pre > code[class*='language-']"),
  );
  if (codeNodes.length === 0) return;

  const theme = pickTheme();
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach(async (entry) => {
        if (!entry.isIntersecting) return;
        const code = entry.target as HTMLElement;
        io.unobserve(code);
        const langClass = Array.from(code.classList).find((c) => c.startsWith("language-"));
        const lang = langClass?.slice("language-".length) ?? "";
        if (!lang || lang === "mermaid") return;
        await ensureLanguage(lang);
        try {
          const hl = await getHighlighter();
          if (versionRef.current !== version) return;
          const html = hl.codeToHtml(code.textContent ?? "", { lang, theme });
          const pre = code.parentElement;
          if (pre && pre.tagName === "PRE") {
            pre.outerHTML = html;
          }
        } catch (err) {
          logger.debug("[shiki] highlight failed", lang, err);
        }
      });
    },
    { rootMargin: "200px" },
  );

  codeNodes.forEach((c) => io.observe(c));
}

const DANGEROUS_ATTRS = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^>\s]+)/gi;
const JS_HREF = /\s(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi;

function stripDangerousAttributes(html: string): string {
  return html.replace(DANGEROUS_ATTRS, "").replace(JS_HREF, "");
}

function decode(s: string): string {
  const t = document.createElement("textarea");
  t.innerHTML = s;
  return t.value;
}
