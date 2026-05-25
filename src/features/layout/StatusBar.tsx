import { useUi } from "@state/ui.store";
import { useWorkspaceTree } from "@state/workspaceTree.store";
import { useEditor } from "@state/editor.store";
import { useDocMetrics } from "@features/editor/hooks/useDocMetrics";
import { PluginStatusItems } from "@features/plugins/PluginStatusItems";

export function StatusBar(): JSX.Element {
  const viewMode = useUi((s) => s.viewMode);
  const keyMode = useUi((s) => s.keyMode);
  const rootPath = useWorkspaceTree((s) => s.root?.path ?? null);
  const doc = useEditor((s) => (s.activeId ? s.docs[s.activeId] : null));
  const { words, characters, readingMinutes } = useDocMetrics(doc?.content ?? "");

  return (
    <footer className="flex h-6 items-center justify-between gap-3 border-t border-border bg-surface px-3 text-[11px] text-muted">
      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate">{rootPath ?? "No workspace"}</span>
        <PluginStatusItems align="left" />
      </div>
      <div className="flex items-center gap-3">
        <PluginStatusItems align="right" />
        {doc && (
          <>
            <span>{words.toLocaleString()} words</span>
            <span>{characters.toLocaleString()} chars</span>
            <span>{readingMinutes} min read</span>
            {doc.dirty && <span className="text-accent">●</span>}
          </>
        )}
        <span className="uppercase tracking-wider">{keyMode}</span>
        <span className="uppercase tracking-wider">{viewMode}</span>
      </div>
    </footer>
  );
}
