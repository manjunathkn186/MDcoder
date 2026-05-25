import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import type { Root, Content } from "mdast";
import type { ExportArtifact, ExportContext } from "../types";
import { slugify } from "./markdown";

const HEADING_BY_DEPTH: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

/**
 * DOCX export — pure-JS, no native dependencies.
 *
 * We parse the markdown source into an mdast tree (remark + GFM) and walk
 * it into the docx model. The mapping covers the most common nodes
 * (headings, paragraphs, lists, tables, blockquotes, code, inline marks);
 * unsupported nodes fall back to plain text so no information is lost.
 */
export async function exportDocx(ctx: ExportContext): Promise<ExportArtifact> {
  const tree = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml", "toml"])
    .use(remarkGfm)
    .parse(ctx.source) as Root;

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: ctx.options.title, bold: true })],
    }),
  ];
  if (ctx.options.author || ctx.options.date) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: [ctx.options.author, ctx.options.date].filter(Boolean).join(" · "),
            italics: true,
            color: "666666",
          }),
        ],
      }),
    );
  }
  for (const node of tree.children) {
    const rendered = renderBlock(node);
    if (rendered) children.push(...rendered);
  }

  const doc = new Document({
    creator: ctx.options.author ?? "Inkstone",
    title: ctx.options.title,
    description: "Exported from Inkstone",
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const data = new Uint8Array(await blob.arrayBuffer());

  return {
    filename: `${slugify(ctx.options.title)}.docx`,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    data,
  };
}

function renderBlock(node: Content): (Paragraph | Table)[] | null {
  switch (node.type) {
    case "heading":
      return [
        new Paragraph({
          heading: HEADING_BY_DEPTH[node.depth] ?? HeadingLevel.HEADING_3,
          children: renderInline(node.children as Content[]),
        }),
      ];
    case "paragraph":
      return [new Paragraph({ children: renderInline(node.children as Content[]) })];
    case "blockquote":
      return (node.children as Content[]).flatMap((c) => {
        const inner = renderBlock(c);
        return (inner ?? []).map((p) =>
          p instanceof Paragraph
            ? new Paragraph({
                indent: { left: 360 },
                border: { left: { color: "888888", space: 6, style: "single", size: 6 } },
                children: paragraphRuns(p),
              })
            : p,
        );
      });
    case "code":
      return [
        new Paragraph({
          shading: { type: "clear", fill: "F4F4F6", color: "auto" },
          children: [new TextRun({ text: node.value, font: "Consolas" })],
        }),
      ];
    case "thematicBreak":
      return [
        new Paragraph({
          border: { bottom: { color: "CCCCCC", space: 6, style: "single", size: 6 } },
          children: [new TextRun("")],
        }),
      ];
    case "list":
      return (node.children as Content[]).flatMap((item, i) => {
        if (item.type !== "listItem") return [];
        const itemChildren = item.children as Content[];
        return itemChildren.flatMap((c) => {
          const rendered = renderBlock(c);
          return (rendered ?? []).map((p) =>
            p instanceof Paragraph
              ? new Paragraph({
                  numbering: node.ordered
                    ? { reference: "ordered-list", level: 0 }
                    : undefined,
                  bullet: node.ordered ? undefined : { level: 0 },
                  children: [
                    ...(node.ordered ? [new TextRun(`${i + 1}. `)] : []),
                    ...paragraphRuns(p),
                  ],
                })
              : p,
          );
        });
      });
    case "table": {
      const rows = (node.children as Content[]).map((row, ri) => {
        const cells = (row.type === "tableRow" ? row.children : []) as Content[];
        return new TableRow({
          children: cells.map((cell) => {
            const inline = cell.type === "tableCell" ? (cell.children as Content[]) : [];
            return new TableCell({
              shading: ri === 0 ? { type: "clear", fill: "F0F0F0", color: "auto" } : undefined,
              children: [new Paragraph({ children: renderInline(inline) })],
            });
          }),
        });
      });
      return [new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } })];
    }
    case "html":
      return [new Paragraph({ children: [new TextRun({ text: stripTags(node.value) })] })];
    case "yaml":
      return null;
    default:
      return [
        new Paragraph({
          children: [new TextRun({ text: collectText(node as Content) })],
        }),
      ];
  }
}

function renderInline(nodes: Content[]): TextRun[] {
  const out: TextRun[] = [];
  for (const n of nodes) out.push(...inlineToRuns(n));
  return out.length ? out : [new TextRun("")];
}

function inlineToRuns(n: Content, ctx: { bold?: boolean; italics?: boolean; strike?: boolean; code?: boolean } = {}): TextRun[] {
  switch (n.type) {
    case "text":
      return [new TextRun({ text: n.value, ...ctx })];
    case "strong":
      return (n.children as Content[]).flatMap((c) => inlineToRuns(c, { ...ctx, bold: true }));
    case "emphasis":
      return (n.children as Content[]).flatMap((c) => inlineToRuns(c, { ...ctx, italics: true }));
    case "delete":
      return (n.children as Content[]).flatMap((c) => inlineToRuns(c, { ...ctx, strike: true }));
    case "inlineCode":
      return [new TextRun({ text: n.value, font: "Consolas", ...ctx })];
    case "link":
      return [
        ...(n.children as Content[]).flatMap((c) => inlineToRuns(c, { ...ctx, italics: true })),
        new TextRun({ text: ` (${n.url})`, color: "666666" }),
      ];
    case "image":
      return [new TextRun({ text: `[image: ${n.alt ?? n.url}]`, italics: true, color: "888888" })];
    case "break":
      return [new TextRun({ text: "", break: 1 })];
    default:
      return [new TextRun({ text: collectText(n), ...ctx })];
  }
}

function paragraphRuns(p: Paragraph): TextRun[] {
  // docx's Paragraph children are not directly readable; we keep our own
  // run tracking by re-constructing trivial paragraphs from inline runs.
  // For nested transforms we accept that the original `Paragraph` was
  // composed from runs we generated upstream, so this is best-effort.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((p as any).options?.children ?? []) as TextRun[];
}

function collectText(node: Content): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyNode = node as any;
  if (typeof anyNode.value === "string") return anyNode.value as string;
  if (Array.isArray(anyNode.children))
    return (anyNode.children as Content[]).map(collectText).join("");
  return "";
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}
