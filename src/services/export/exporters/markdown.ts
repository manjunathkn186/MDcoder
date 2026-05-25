import type { ExportArtifact, ExportContext } from "../types";
import { parseFrontmatter } from "@/markdown/frontmatter";

/**
 * Markdown export.
 * Round-trips the source untouched when `includeFrontmatter`. Otherwise
 * strips the frontmatter block and prepends a synthesized title.
 */
export function exportMarkdown(ctx: ExportContext): ExportArtifact {
  let body = ctx.source;
  if (!ctx.options.includeFrontmatter) {
    const { body: stripped } = parseFrontmatter(ctx.source);
    body = `# ${ctx.options.title}\n\n${stripped.trimStart()}`;
  }
  return {
    filename: `${slugify(ctx.options.title)}.md`,
    mimeType: "text/markdown;charset=utf-8",
    data: body,
  };
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "document"
  );
}
