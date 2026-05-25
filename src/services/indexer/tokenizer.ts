/**
 * Unicode-aware lowercasing tokenizer. Splits on non-word characters,
 * drops 1-character tokens, applies a tiny English stopword list.
 */
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "to", "of", "in", "on",
  "at", "by", "is", "it", "its", "be", "as", "for", "with", "this", "that",
  "i", "you", "we", "they", "he", "she", "from", "are", "was", "were",
]);

export function tokenize(text: string): string[] {
  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    const isWord =
      (c >= 48 && c <= 57) ||
      (c >= 65 && c <= 90) ||
      (c >= 97 && c <= 122) ||
      c > 127;
    if (isWord) {
      buf += text[i];
    } else if (buf) {
      pushIfValid(out, buf.toLowerCase());
      buf = "";
    }
  }
  if (buf) pushIfValid(out, buf.toLowerCase());
  return out;
}

function pushIfValid(out: string[], tok: string): void {
  if (tok.length < 2) return;
  if (STOPWORDS.has(tok)) return;
  out.push(tok);
}
