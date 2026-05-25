import { parseFrontmatter } from "@/markdown/frontmatter";

export interface ExtractedDoc {
  title: string;
  headings: string[];
  outgoing: string[]; // raw wikilink target text
  tags: string[];
  body: string;       // plain-text body (no frontmatter, no fences)
}

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
const TAG_RE = /(?:^|\s)#([a-zA-Z][\w/-]*)/g;

export function extract(source: string, fallbackTitle: string): ExtractedDoc {
  const { data, body } = parseFrontmatter(source);
  const lines = body.split(/\r?\n/);

  const headings: string[] = [];
  const outgoing: string[] = [];
  const tags: string[] = [];
  let inFence = false;
  let fenceCh = "";
  let plain = "";

  for (const line of lines) {
    const fence = line.match(/^(`{3,}|~{3,})/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceCh = fence[1][0];
      } else if (line.startsWith(fenceCh.repeat(3))) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;

    const h = line.match(HEADING_RE);
    if (h) {
      headings.push(h[2].trim());
      plain += h[2] + " ";
      continue;
    }
    plain += line + " ";

    let m: RegExpExecArray | null;
    WIKILINK_RE.lastIndex = 0;
    while ((m = WIKILINK_RE.exec(line)) !== null) {
      outgoing.push(m[1].trim());
    }
    TAG_RE.lastIndex = 0;
    while ((m = TAG_RE.exec(line)) !== null) {
      tags.push(m[1]);
    }
  }

  const fmTitle = typeof data.title === "string" ? data.title : null;
  const title = (fmTitle ?? headings[0] ?? fallbackTitle).trim();
  const fmTags = Array.isArray(data.tags) ? (data.tags as unknown[]).filter((t) => typeof t === "string") as string[] : [];

  return {
    title,
    headings,
    outgoing,
    tags: Array.from(new Set([...tags, ...fmTags])),
    body: plain,
  };
}
