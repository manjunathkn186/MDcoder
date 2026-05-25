import yaml from "js-yaml";

export interface Frontmatter {
  data: Record<string, unknown>;
  body: string;
  /** 0-indexed line on which body content starts (after the closing ---) */
  bodyLineOffset: number;
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(src: string): Frontmatter {
  const m = src.match(FM_RE);
  if (!m) return { data: {}, body: src, bodyLineOffset: 0 };
  try {
    const data = (yaml.load(m[1]) ?? {}) as Record<string, unknown>;
    const body = src.slice(m[0].length);
    const bodyLineOffset = m[0].split(/\r?\n/).length - 1;
    return { data, body, bodyLineOffset };
  } catch {
    // Malformed YAML — treat as plain content to avoid hard failure.
    return { data: {}, body: src, bodyLineOffset: 0 };
  }
}
