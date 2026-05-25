import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { sanitizeSchema } from "./sanitize";

/**
 * Unified processor used by the export pipeline (HTML / PDF / DOCX, Phase 4).
 * The live preview uses `markdownIt.ts` for speed; this path is the canonical
 * AST-faithful pipeline that downstream exporters and AST-aware plugins consume.
 */
// The unified `Processor` generic is invariant; the exact AST type
// changes as we add transformers, which makes a stable return type hard
// to express. The factory returns the concrete pipeline; consumers
// should use `renderToHtml` for the end-to-end string output.
export function createUnifiedProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeKatex)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify);
}

export async function renderToHtml(markdown: string): Promise<string> {
  const file = await createUnifiedProcessor().process(markdown);
  return String(file);
}
