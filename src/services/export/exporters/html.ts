import type { ExportArtifact, ExportContext } from "../types";
import { createMarkdownIt } from "@/markdown/markdownIt";
import { slugify } from "./markdown";

let cachedMd: ReturnType<typeof createMarkdownIt> | null = null;
function md() {
  if (!cachedMd) cachedMd = createMarkdownIt();
  return cachedMd;
}

/**
 * HTML export.
 * Produces a single self-contained .html file with inlined prose styles,
 * a generated TOC (optional), and a print-friendly layout. Mermaid/KaTeX
 * code uses precomputed inline math output already present in `ctx.html`
 * when provided; otherwise we re-render from `source` (without runtime
 * hydration — fenced mermaid is left as a code block).
 */
export function exportHtml(ctx: ExportContext): ExportArtifact {
  const body = ctx.html && ctx.html.trim().length > 0 ? ctx.html : md().render(ctx.source);
  const toc = ctx.options.includeToc ? buildToc(body) : "";
  const doc = template({
    title: ctx.options.title,
    author: ctx.options.author,
    date: ctx.options.date,
    embedAssets: ctx.options.embedAssets,
    toc,
    body,
  });
  return {
    filename: `${slugify(ctx.options.title)}.html`,
    mimeType: "text/html;charset=utf-8",
    data: doc,
  };
}

function buildToc(html: string): string {
  const items: { level: number; id: string; text: string }[] = [];
  const re = /<h([1-6])(?:[^>]*?\sid="([^"]+)")?[^>]*>(.*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    items.push({
      level: Number(m[1]),
      id: m[2] ?? "",
      text: stripTags(m[3]),
    });
  }
  if (items.length === 0) return "";
  const lis = items
    .map(
      (i) =>
        `<li class="toc-l${i.level}">${i.id ? `<a href="#${i.id}">${escapeHtml(i.text)}</a>` : escapeHtml(i.text)}</li>`,
    )
    .join("\n");
  return `<nav class="ink-toc"><div class="ink-toc-title">Contents</div><ul>${lis}</ul></nav>`;
}

function template(o: {
  title: string;
  author?: string;
  date?: string;
  embedAssets: boolean;
  toc: string;
  body: string;
}): string {
  const meta = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<meta name="generator" content="Inkstone">`,
    o.author ? `<meta name="author" content="${escapeAttr(o.author)}">` : "",
    `<title>${escapeHtml(o.title)}</title>`,
  ]
    .filter(Boolean)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
${meta}
<style>${o.embedAssets ? INLINE_CSS : ""}</style>
</head>
<body>
<article class="ink-prose">
  <header class="ink-doc-header">
    <h1>${escapeHtml(o.title)}</h1>
    ${o.author || o.date ? `<div class="ink-doc-meta">${[o.author, o.date].filter((x): x is string => Boolean(x)).map(escapeHtml).join(" · ")}</div>` : ""}
  </header>
  ${o.toc}
  ${o.body}
</article>
</body>
</html>`;
}

const INLINE_CSS = `
:root { color-scheme: light; }
html,body { margin:0; padding:0; background:#fff; color:#111; font-family: Georgia, 'Iowan Old Style', serif; }
.ink-prose { max-width: 78ch; margin: 0 auto; padding: 3rem 1.5rem 5rem; font-size: 17px; line-height: 1.7; }
.ink-doc-header h1 { margin-bottom: 0.2em; font-family: -apple-system, "Segoe UI", system-ui, sans-serif; }
.ink-doc-meta { color: #666; font-size: 0.9em; margin-bottom: 2em; }
.ink-prose h1,h2,h3,h4,h5,h6 { font-family: -apple-system, "Segoe UI", system-ui, sans-serif; line-height:1.25; }
.ink-prose h1 { font-size: 2rem; }
.ink-prose h2 { font-size: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: .2em; }
.ink-prose h3 { font-size: 1.25rem; }
.ink-prose code { background:#f4f4f6; padding:.1em .35em; border-radius:4px; font-family: ui-monospace, monospace; font-size: 0.92em; }
.ink-prose pre { background:#f7f7f9; border:1px solid #ececef; padding: 1em 1.1em; border-radius: 10px; overflow-x:auto; font-family: ui-monospace, monospace; font-size: 13px; line-height:1.55; }
.ink-prose pre code { background:transparent; padding:0; }
.ink-prose blockquote { border-left: 3px solid #888; margin: 1em 0; padding: .3em 1em; color: #444; background: #fafafa; border-radius: 0 6px 6px 0; }
.ink-prose table { border-collapse: collapse; width: 100%; margin: 1.2em 0; }
.ink-prose th,td { border:1px solid #ddd; padding:6px 9px; }
.ink-prose th { background:#f4f4f6; text-align:left; }
.ink-prose img { max-width:100%; border-radius: 6px; }
.ink-prose a { color:#2a5db0; }
.ink-prose hr { border:0; border-top:1px solid #e5e5e5; margin: 2em 0; }
.ink-toc { border: 1px solid #eee; background: #fafafa; padding: 1em 1.2em; border-radius: 8px; margin: 1.5em 0 2em; }
.ink-toc-title { font-weight:600; margin-bottom:.5em; }
.ink-toc ul { list-style:none; padding-left:0; margin:0; }
.ink-toc li { margin: .15em 0; }
.ink-toc .toc-l2 { padding-left: 1.2em; }
.ink-toc .toc-l3 { padding-left: 2.4em; }
.ink-toc .toc-l4 { padding-left: 3.6em; }
.ink-wikilink { color:#2a5db0; border-bottom:1px dashed currentColor; text-decoration:none; }
.ink-wikilink.is-broken { color:#b1331f; }
`;

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}
