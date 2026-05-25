import { EditorView } from "@codemirror/view";

/**
 * Paste & drop handlers:
 *  - HTTPS image URLs paste as `![](url)`.
 *  - Image clipboard items (e.g. screenshots) and dropped files emit an
 *    `inkstone:image` CustomEvent on the view DOM; the surrounding workspace
 *    is responsible for persisting the bytes to disk (Phase 4) and rewriting
 *    the placeholder to a relative path.
 */
export const pasteHandlers = EditorView.domEventHandlers({
  paste(event, view) {
    const items = event.clipboardData?.items;
    if (!items) return false;

    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;
        event.preventDefault();
        emitImage(view, file);
        return true;
      }
    }

    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (/^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)(\?\S*)?$/i.test(text.trim())) {
      event.preventDefault();
      const insert = `![](${text.trim()})`;
      view.dispatch(view.state.replaceSelection(insert));
      return true;
    }
    return false;
  },

  drop(event, view) {
    const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length === 0) return false;
    event.preventDefault();
    for (const file of files) emitImage(view, file);
    return true;
  },
});

function emitImage(view: EditorView, file: File): void {
  const placeholder = `![${file.name}](attachment:pending)`;
  view.dispatch(view.state.replaceSelection(placeholder));
  view.dom.dispatchEvent(
    new CustomEvent("inkstone:image", { detail: { file, placeholder }, bubbles: true }),
  );
}
