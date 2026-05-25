import { ViewPlugin, Decoration, type DecorationSet, type ViewUpdate, EditorView } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";

/**
 * Typora-like inline decoration: hides bold/italic markers and inline code
 * backticks on lines where the caret is **not** present. Heading hashes are
 * dimmed but not hidden to preserve discoverability.
 *
 * This is a viewport-only plugin — work is bounded by `view.visibleRanges`.
 */
const hide = Decoration.replace({});
const dimMark = Decoration.mark({ class: "cm-md-dim" });

function buildDecorations(view: EditorView): DecorationSet {
  const b = new RangeSetBuilder<Decoration>();
  const cursor = view.state.selection.main.head;

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const line = view.state.doc.lineAt(node.from);
        const caretOnLine = cursor >= line.from && cursor <= line.to;

        switch (node.name) {
          case "EmphasisMark":
          case "CodeMark":
            if (!caretOnLine) b.add(node.from, node.to, hide);
            return;
          case "HeaderMark":
            b.add(node.from, node.to, dimMark);
            return;
          case "LinkMark":
            if (!caretOnLine) b.add(node.from, node.to, hide);
            return;
        }
      },
    });
  }

  return b.finish();
}

export const inlineDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
    provide: () =>
      EditorView.baseTheme({
        ".cm-md-dim": { color: "var(--ink-muted)", opacity: "0.55" },
      }),
  },
);
