import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const darkTheme = EditorView.theme(
  {
    "&": {
      color: "var(--ink-fg)",
      backgroundColor: "var(--ink-bg)",
      height: "100%",
    },
    ".cm-content": {
      caretColor: "var(--ink-fg)",
      fontFamily: "var(--ink-font-mono)",
    },
    ".cm-cursor": { borderLeftColor: "var(--ink-fg)" },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "var(--ink-selection)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--ink-surface)",
      color: "var(--ink-muted)",
      border: "none",
    },
    ".cm-activeLine": { backgroundColor: "transparent" },
    ".cm-activeLineGutter": { backgroundColor: "var(--ink-surface-2)" },
    ".cm-scroller": { fontFamily: "var(--ink-font-mono)", lineHeight: "1.6" },
  },
  { dark: true },
);

const darkHighlight = HighlightStyle.define([
  { tag: t.heading1, fontWeight: "700", color: "var(--ink-fg)" },
  { tag: t.heading2, fontWeight: "700", color: "var(--ink-fg)" },
  { tag: t.heading3, fontWeight: "700", color: "var(--ink-fg)" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.link, color: "var(--ink-link)", textDecoration: "underline" },
  { tag: t.url, color: "var(--ink-link)" },
  { tag: t.monospace, color: "#c084fc" },
  { tag: t.quote, color: "var(--ink-muted)", fontStyle: "italic" },
  { tag: t.keyword, color: "#5eead4" },
  { tag: t.processingInstruction, color: "var(--ink-muted)" },
  { tag: t.meta, color: "var(--ink-muted)" },
]);

export const cmDark = [darkTheme, syntaxHighlighting(darkHighlight)];
