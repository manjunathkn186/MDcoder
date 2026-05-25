import { useEditor } from "@state/editor.store";
import { useOutline } from "./hooks/useOutline";
import { editorRegistry } from "./extensions/editorRegistry";
import { cn } from "@lib/cn";

export function Outline(): JSX.Element {
  const doc = useEditor((s) => (s.activeId ? s.docs[s.activeId] : null));
  const headings = useOutline(doc?.content ?? "");

  const jump = (line: number, slug: string) => {
    if (!doc) return;

    // 1) If the editor is mounted, scroll/focus there.
    const view = editorRegistry.get(doc.id);
    if (view) {
      const pos = view.state.doc.line(Math.min(line, view.state.doc.lines)).from;
      view.dispatch({
        selection: { anchor: pos, head: pos },
        effects: [],
        scrollIntoView: true,
      });
      view.focus();
    }

    // 2) Always scroll the preview to the matching heading anchor.
    //    Preview headings get ids from `markdown-it-anchor` using a
    //    GitHub-style slug — the same slug `useOutline` produces.
    const preview = document.querySelector<HTMLElement>("[data-inkstone-preview]");
    if (!preview || !slug) return;
    const target =
      preview.querySelector<HTMLElement>(`#${CSS.escape(slug)}`) ??
      // Fallback for environments where the slugger differs slightly:
      // match by data-source-line if the markdown-it plugin set it.
      preview.querySelector<HTMLElement>(`[data-source-line="${line}"]`);
    if (target) {
      target.scrollIntoView({ block: "start", behavior: "smooth" });
      // Brief highlight so the user sees where they landed.
      target.classList.add("ink-heading-flash");
      window.setTimeout(() => target.classList.remove("ink-heading-flash"), 1200);
    }
  };

  if (!doc) {
    return (
      <div className="p-3 text-xs text-muted">Open a document to see its outline.</div>
    );
  }
  if (headings.length === 0) {
    return <div className="p-3 text-xs text-muted">No headings yet.</div>;
  }

  return (
    <ul aria-label="Outline" className="ink-scroll overflow-y-auto py-1 text-sm">
      {headings.map((h, i) => (
        <li key={`${h.slug}-${i}`}>
          <button
            onClick={() => jump(h.line, h.slug)}
            className={cn(
              "block w-full truncate px-3 py-1 text-left hover:bg-surface-2",
              h.level === 1 && "font-semibold",
              h.level === 2 && "pl-5",
              h.level === 3 && "pl-7 text-muted",
              h.level >= 4 && "pl-9 text-muted",
            )}
            title={h.text}
          >
            {h.text}
          </button>
        </li>
      ))}
    </ul>
  );
}
