/**
 * Compact in-memory inverted index with BM25-ish scoring.
 *
 *   term → Map<docId, frequency>
 *   docs → Map<docId, doc length in tokens>
 *
 * BM25 parameters (k1 = 1.5, b = 0.75) chosen for short markdown notes.
 */
export interface DocFields {
  title: string;
  body: string;     // tokenized body joined by spaces
  headings: string; // tokenized headings joined by spaces
}

export interface ScoredHit {
  docId: string;
  score: number;
}

const K1 = 1.5;
const B = 0.75;

export class InvertedIndex {
  private posting = new Map<string, Map<string, number>>();
  private docLen = new Map<string, number>();
  private avgDocLen = 0;
  // Field-boosted vocab: terms appearing in title carry extra weight.
  private titleTerms = new Map<string, Set<string>>(); // docId → set of title-terms

  upsert(docId: string, tokens: string[], titleTokens: string[]): void {
    this.remove(docId, /* keepStats */ false);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const [t, n] of tf) {
      let bucket = this.posting.get(t);
      if (!bucket) {
        bucket = new Map();
        this.posting.set(t, bucket);
      }
      bucket.set(docId, n);
    }
    this.docLen.set(docId, tokens.length);
    this.titleTerms.set(docId, new Set(titleTokens));
    this.recomputeAvg();
  }

  remove(docId: string, keepStats = true): void {
    if (!this.docLen.has(docId)) return;
    for (const [t, bucket] of this.posting) {
      if (bucket.delete(docId) && bucket.size === 0) this.posting.delete(t);
    }
    this.docLen.delete(docId);
    this.titleTerms.delete(docId);
    if (keepStats) this.recomputeAvg();
  }

  clear(): void {
    this.posting.clear();
    this.docLen.clear();
    this.titleTerms.clear();
    this.avgDocLen = 0;
  }

  size(): number {
    return this.docLen.size;
  }

  search(queryTokens: string[], limit = 50): ScoredHit[] {
    if (queryTokens.length === 0) return [];
    const N = this.docLen.size || 1;
    const scores = new Map<string, number>();
    for (const term of queryTokens) {
      const bucket = this.posting.get(term);
      if (!bucket) continue;
      const df = bucket.size;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      for (const [docId, tf] of bucket) {
        const len = this.docLen.get(docId) ?? 0;
        const norm = (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (len / (this.avgDocLen || 1))));
        let s = idf * norm;
        if (this.titleTerms.get(docId)?.has(term)) s *= 1.8;
        scores.set(docId, (scores.get(docId) ?? 0) + s);
      }
    }
    return Array.from(scores, ([docId, score]) => ({ docId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private recomputeAvg(): void {
    if (this.docLen.size === 0) {
      this.avgDocLen = 0;
      return;
    }
    let sum = 0;
    for (const n of this.docLen.values()) sum += n;
    this.avgDocLen = sum / this.docLen.size;
  }
}
