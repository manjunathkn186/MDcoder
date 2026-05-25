import type { Highlighter, BundledLanguage, BundledTheme } from "shiki";
import { logger } from "@lib/logger";

let highlighterPromise: Promise<Highlighter> | null = null;
const loaded = new Set<string>();

const DEFAULT_LANGS: BundledLanguage[] = [
  "javascript",
  "typescript",
  "tsx",
  "jsx",
  "json",
  "bash",
  "shell",
  "rust",
  "python",
  "css",
  "html",
  "markdown",
  "yaml",
];

const THEMES: BundledTheme[] = ["github-light", "github-dark"];

export async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const { createHighlighter } = await import("shiki");
      const hl = await createHighlighter({
        themes: THEMES,
        langs: DEFAULT_LANGS,
      });
      DEFAULT_LANGS.forEach((l) => loaded.add(l));
      return hl;
    })();
  }
  return highlighterPromise;
}

export async function ensureLanguage(lang: string): Promise<void> {
  if (!lang || loaded.has(lang)) return;
  try {
    const hl = await getHighlighter();
    await hl.loadLanguage(lang as BundledLanguage);
    loaded.add(lang);
  } catch (err) {
    logger.debug("[shiki] language unavailable", lang, err);
  }
}

export function pickTheme(): BundledTheme {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "github-dark"
    : "github-light";
}
