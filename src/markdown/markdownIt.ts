import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import footnote from "markdown-it-footnote";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- no published types
import attrs from "markdown-it-attrs";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- no published types
import taskLists from "markdown-it-task-lists";
import { sourceLine } from "./plugins/sourceLine";
import { math } from "./plugins/math";
import { mermaid } from "./plugins/mermaid";
import { wikilink } from "./plugins/wikilink";
import { markdownPluginRegistry } from "@/plugins/runtime/extensionPoints";
import type MarkdownItType from "markdown-it";

export function createMarkdownIt(): MarkdownIt {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: false,
    typographer: false,
    langPrefix: "language-",
  });

  md.use(sourceLine)
    .use(anchor, { permalink: false, slugify: defaultSlugify })
    .use(footnote)
    .use(attrs, { allowedAttributes: ["id", "class", /^data-/] })
    .use(taskLists, { enabled: true, label: true, labelAfter: true })
    .use(math)
    .use(mermaid)
    .use(wikilink);

  // Plugin-contributed markdown-it extensions (Phase 8). Errors in
  // third-party extensions are isolated so the core pipeline still works.
  for (const ext of markdownPluginRegistry.values()) {
    try {
      (ext as (md: MarkdownItType) => void)(md);
    } catch (err) {
      console.warn("[markdown] plugin extension failed", err);
    }
  }

  return md;
}

function defaultSlugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
