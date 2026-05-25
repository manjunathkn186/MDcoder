import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";

/**
 * Markdown language pack with GFM extensions + nested language highlighting
 * (code fences are highlighted using `languages` descriptors when available).
 *
 * `@codemirror/language-data` is lazy: bundles only load when a fence with a
 * matching info string is encountered.
 */
export function markdownLang() {
  return markdown({
    base: markdownLanguage,
    codeLanguages: languages,
    addKeymap: true,
  });
}
