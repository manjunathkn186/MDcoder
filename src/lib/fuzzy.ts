/**
 * Subsequence fuzzy matcher with positional scoring.
 *
 *  - Returns `null` if `query` is not a (case-insensitive) subsequence of `target`.
 *  - Higher score is better. Bonuses for:
 *      * consecutive matches
 *      * matches after word boundary (-, _, /, space, .)
 *      * matches at start of string
 *      * exact case match
 */
export interface FuzzyMatch {
  score: number;
  indices: number[];
}

export function fuzzyMatch(query: string, target: string): FuzzyMatch | null {
  if (!query) return { score: 0, indices: [] };
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  const indices: number[] = [];
  let qi = 0;
  let score = 0;
  let lastMatched = -2;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue;
    indices.push(ti);
    score += 1;
    if (ti === lastMatched + 1) score += 4; // consecutive
    if (ti === 0) score += 5; // start
    else if (/[\s\-_/.]/.test(t[ti - 1])) score += 3; // word boundary
    if (target[ti] === query[qi]) score += 1; // case match
    lastMatched = ti;
    qi++;
  }

  if (qi < q.length) return null;
  // Penalize long targets slightly so shorter matches win ties.
  score -= Math.max(0, target.length - q.length) * 0.05;
  return { score, indices };
}

export interface FuzzyItem<T> {
  item: T;
  score: number;
  indices: number[];
}

export function fuzzyFilter<T>(
  query: string,
  items: readonly T[],
  toString: (item: T) => string,
): FuzzyItem<T>[] {
  if (!query) return items.map((item) => ({ item, score: 0, indices: [] }));
  const out: FuzzyItem<T>[] = [];
  for (const item of items) {
    const m = fuzzyMatch(query, toString(item));
    if (m) out.push({ item, score: m.score, indices: m.indices });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}
