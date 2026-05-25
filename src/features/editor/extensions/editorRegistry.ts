import type { EditorView } from "@codemirror/view";

/**
 * Tiny registry mapping docId → active EditorView. Surface components (outline,
 * command palette, breadcrumbs) use it to issue scroll/cursor commands without
 * re-mounting React subtrees.
 */
const registry = new Map<string, EditorView>();
let activeId: string | null = null;

export const editorRegistry = {
  register(id: string, view: EditorView): void {
    registry.set(id, view);
  },
  unregister(id: string): void {
    registry.delete(id);
    if (activeId === id) activeId = null;
  },
  setActive(id: string | null): void {
    activeId = id;
  },
  get(id: string): EditorView | undefined {
    return registry.get(id);
  },
  active(): EditorView | undefined {
    return activeId ? registry.get(activeId) : undefined;
  },
};
