/// <reference lib="webworker" />
import { createMarkdownIt } from "@/markdown/markdownIt";
import { parseFrontmatter } from "@/markdown/frontmatter";
import { LRU } from "@/lib/lru";

export interface ParseRequest {
  type: "parse";
  id: number;
  rev: number;
  source: string;
}

export interface ParseResponse {
  type: "parsed";
  id: number;
  rev: number;
  html: string;
  lineSet: number[];
  frontmatter: Record<string, unknown>;
  durationMs: number;
}

export interface ParseError {
  type: "error";
  id: number;
  rev: number;
  message: string;
}

const md = createMarkdownIt();
const cache = new LRU<string, ParseResponse>(8);

self.addEventListener("message", (ev: MessageEvent<ParseRequest>) => {
  const req = ev.data;
  if (req.type !== "parse") return;

  const t0 = performance.now();
  try {
    const cached = cache.get(req.source);
    if (cached) {
      const reply: ParseResponse = { ...cached, id: req.id, rev: req.rev };
      (self as unknown as Worker).postMessage(reply);
      return;
    }

    const { data: frontmatter, body, bodyLineOffset } = parseFrontmatter(req.source);
    const env: Record<string, unknown> = {};
    let html = md.render(body, env);

    if (bodyLineOffset > 0) {
      html = shiftSourceLines(html, bodyLineOffset);
    }

    const lineSet = extractLineSet(html);
    const reply: ParseResponse = {
      type: "parsed",
      id: req.id,
      rev: req.rev,
      html,
      lineSet,
      frontmatter,
      durationMs: performance.now() - t0,
    };
    cache.set(req.source, reply);
    (self as unknown as Worker).postMessage(reply);
  } catch (err) {
    const reply: ParseError = {
      type: "error",
      id: req.id,
      rev: req.rev,
      message: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as Worker).postMessage(reply);
  }
});

function shiftSourceLines(html: string, offset: number): string {
  return html.replace(/data-source-line="(\d+)"/g, (_m, n: string) => {
    return `data-source-line="${Number(n) + offset}"`;
  });
}

function extractLineSet(html: string): number[] {
  const out: number[] = [];
  const re = /data-source-line="(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push(Number(m[1]));
  }
  return out;
}
