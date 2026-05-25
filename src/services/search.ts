import { indexer } from "./indexer";
import { fuzzyFilter } from "@lib/fuzzy";
import { useIndex } from "@state/index.store";
import { basename } from "./fs";

export interface SearchHit {
  path: string;
  title: string;
  score: number;
  snippet: string;
}

/**
 * Unified search facade.
 *
 * - When the query is short (< 3 chars) we run a fuzzy match against
 *   indexed titles + paths — fast and forgiving.
 * - When the query is longer we use the BM25 worker index for content matches.
 */
export async function search(query: string, limit = 50): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  if (q.length < 3) {
    const items = Array.from(useIndex.getState().files.values()).map((m) => ({
      path: m.path,
      title: m.title,
      score: 0,
      snippet: "",
    }));
    return fuzzyFilter(q, items, (i) => `${i.title} ${basename(i.path)}`)
      .slice(0, limit)
      .map(({ item, score }) => ({ ...item, score }));
  }
  return indexer.search(q, limit);
}
