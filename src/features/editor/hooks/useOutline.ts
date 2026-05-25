import { useMemo } from "react";

export interface OutlineHeading {
  level: number;
  text: string;
  line: number; // 1-indexed source line
  slug: string;
}

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

/**
 * Linear scan of the document for ATX headings, skipping fenced code blocks.
 * Returns 1-indexed source lines for editor jumps and `data-source-line`
 * lookups against the preview.
 */
export function useOutline(text: string): OutlineHeading[] {
  return useMemo(() => extractOutline(text), [text]);
}

export function extractOutline(text: string): OutlineHeading[] {
  const lines = text.split(/\r?\n/);
  const out: OutlineHeading[] = [];
  let inFence = false;
  let fenceMarker = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^(`{3,}|~{3,})/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1][0];
      } else if (line.startsWith(fenceMarker.repeat(3))) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;
    const m = line.match(HEADING_RE);
    if (m) {
      const level = m[1].length;
      const heading = m[2].trim();
      out.push({
        level,
        text: heading,
        line: i + 1,
        slug: slugify(heading),
      });
    }
  }
  return out;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
