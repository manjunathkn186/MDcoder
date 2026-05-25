/// <reference lib="webworker" />
import { tokenize } from "@/services/indexer/tokenizer";
import { extract } from "@/services/indexer/extract";
import { InvertedIndex } from "@/services/indexer/invertedIndex";

export type WorkerIn =
  | { type: "upsert"; path: string; source: string; fallbackTitle: string }
  | { type: "remove"; path: string }
  | { type: "clear" }
  | { type: "search"; id: number; query: string; limit?: number };

export interface UpsertResult {
  type: "upserted";
  path: string;
  title: string;
  headings: string[];
  outgoing: string[];
  tags: string[];
}
export interface SearchResult {
  type: "results";
  id: number;
  hits: { path: string; score: number; title: string; snippet: string }[];
}

const index = new InvertedIndex();
const docs = new Map<
  string,
  { title: string; headings: string[]; outgoing: string[]; tags: string[]; body: string }
>();

self.addEventListener("message", (ev: MessageEvent<WorkerIn>) => {
  const msg = ev.data;
  if (msg.type === "upsert") {
    const ex = extract(msg.source, msg.fallbackTitle);
    docs.set(msg.path, ex);
    const bodyTokens = tokenize(`${ex.headings.join(" ")} ${ex.body}`);
    const titleTokens = tokenize(ex.title);
    index.upsert(msg.path, [...titleTokens, ...bodyTokens], titleTokens);
    const reply: UpsertResult = {
      type: "upserted",
      path: msg.path,
      title: ex.title,
      headings: ex.headings,
      outgoing: ex.outgoing,
      tags: ex.tags,
    };
    (self as unknown as Worker).postMessage(reply);
  } else if (msg.type === "remove") {
    docs.delete(msg.path);
    index.remove(msg.path);
  } else if (msg.type === "clear") {
    docs.clear();
    index.clear();
  } else if (msg.type === "search") {
    const qTokens = tokenize(msg.query);
    const hits = index.search(qTokens, msg.limit ?? 50).map(({ docId, score }) => {
      const d = docs.get(docId);
      return {
        path: docId,
        score,
        title: d?.title ?? docId,
        snippet: buildSnippet(d?.body ?? "", qTokens),
      };
    });
    const reply: SearchResult = { type: "results", id: msg.id, hits };
    (self as unknown as Worker).postMessage(reply);
  }
});

function buildSnippet(body: string, qTokens: string[]): string {
  if (!body || qTokens.length === 0) return body.slice(0, 160);
  const lc = body.toLowerCase();
  let idx = -1;
  for (const t of qTokens) {
    const i = lc.indexOf(t);
    if (i >= 0) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return body.slice(0, 160);
  const start = Math.max(0, idx - 50);
  const end = Math.min(body.length, idx + 150);
  return (start > 0 ? "…" : "") + body.slice(start, end).replace(/\s+/g, " ") + (end < body.length ? "…" : "");
}
