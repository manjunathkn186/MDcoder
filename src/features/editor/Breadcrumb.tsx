import { ChevronRight, FileText } from "lucide-react";
import { useEditor } from "@state/editor.store";
import { useWorkspaceTree } from "@state/workspaceTree.store";
import { Icon } from "@ui/Icon";

export function Breadcrumb(): JSX.Element | null {
  const doc = useEditor((s) => (s.activeId ? s.docs[s.activeId] : null));
  const root = useWorkspaceTree((s) => s.root?.path ?? null);
  if (!doc) return null;

  const segments = computeSegments(doc.path, root);

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex h-7 items-center gap-1 border-b border-border bg-surface px-3 text-xs text-muted"
    >
      <Icon icon={FileText} size={12} />
      {segments.map((s, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={10} />}
          <span className={i === segments.length - 1 ? "text-fg" : ""}>{s}</span>
        </span>
      ))}
    </nav>
  );
}

function computeSegments(path: string | null, root: string | null): string[] {
  if (!path) return ["Untitled"];
  if (root && path.startsWith(root)) {
    const rel = path.slice(root.length).replace(/^[/\\]/, "");
    return rel.split(/[/\\]/);
  }
  return path.split(/[/\\]/);
}
