import {
  type CompletionContext,
  type CompletionResult,
  snippetCompletion,
} from "@codemirror/autocomplete";

/**
 * Markdown snippet completions. Triggered at the start of a line or after
 * whitespace by typing common markdown shortcuts (e.g. `h1`, `tbl`, `code`).
 */
const SNIPPETS = [
  snippetCompletion("# ${title}\n\n", { label: "h1", detail: "heading 1", type: "keyword" }),
  snippetCompletion("## ${title}\n\n", { label: "h2", detail: "heading 2", type: "keyword" }),
  snippetCompletion("### ${title}\n\n", { label: "h3", detail: "heading 3", type: "keyword" }),
  snippetCompletion("- ${item}\n- ", { label: "ul", detail: "bullet list", type: "keyword" }),
  snippetCompletion("1. ${item}\n2. ", { label: "ol", detail: "ordered list", type: "keyword" }),
  snippetCompletion("- [ ] ${task}\n- [ ] ", {
    label: "todo",
    detail: "task list",
    type: "keyword",
  }),
  snippetCompletion("**${bold}**", { label: "b", detail: "bold", type: "keyword" }),
  snippetCompletion("*${italic}*", { label: "i", detail: "italic", type: "keyword" }),
  snippetCompletion("[${text}](${url})", { label: "link", detail: "link", type: "keyword" }),
  snippetCompletion("![${alt}](${url})", { label: "img", detail: "image", type: "keyword" }),
  snippetCompletion("```${lang}\n${code}\n```\n", {
    label: "code",
    detail: "fenced code",
    type: "keyword",
  }),
  snippetCompletion(
    "| ${col1} | ${col2} |\n|---|---|\n| ${a} | ${b} |\n",
    { label: "tbl", detail: "GFM table", type: "keyword" },
  ),
  snippetCompletion("> ${quote}\n", { label: "quote", detail: "blockquote", type: "keyword" }),
  snippetCompletion("$${expr}$", { label: "math", detail: "inline math", type: "keyword" }),
  snippetCompletion("$$\n${expr}\n$$\n", { label: "math$$", detail: "block math", type: "keyword" }),
  snippetCompletion(
    "```mermaid\ngraph TD\n  ${A} --> ${B}\n```\n",
    { label: "mermaid", detail: "mermaid diagram", type: "keyword" },
  ),
];

export function markdownSnippets(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\w$]+/);
  if (!word) return null;
  if (word.from === word.to && !context.explicit) return null;
  return {
    from: word.from,
    options: SNIPPETS,
    validFor: /^[\w$]*$/,
  };
}
