import { Clock } from "lucide-react";
import { useRecent } from "@state/recent.store";
import { useEditor } from "@state/editor.store";
import { workspaceManager } from "@/services/workspaceManager";
import { fileCache } from "@/services/cache";
import { basename } from "@/services/fs";

export function RecentView(): JSX.Element {
  const files = useRecent((s) => s.files);
  const workspaces = useRecent((s) => s.workspaces);
  const clearFiles = useRecent((s) => s.clearFiles);

  const openFile = async (p: string) => {
    try {
      const content = await fileCache.read(p);
      useEditor.getState().openDoc({ id: p, path: p, title: basename(p), content });
    } catch {
      /* ignored */
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Recent</span>
        {files.length > 0 && (
          <button onClick={clearFiles} className="text-[11px] text-muted hover:text-fg">
            Clear
          </button>
        )}
      </div>
      <div className="ink-scroll flex-1 overflow-y-auto">
        <Section title="Workspaces">
          {workspaces.length === 0 ? (
            <Empty>No recent workspaces.</Empty>
          ) : (
            workspaces.map((w) => (
              <Row key={w} onClick={() => workspaceManager.open(w)}>
                {basename(w)}
                <span className="ml-2 truncate text-[11px] text-muted">{w}</span>
              </Row>
            ))
          )}
        </Section>
        <Section title="Files">
          {files.length === 0 ? (
            <Empty>No recent files yet.</Empty>
          ) : (
            files.map((f) => (
              <Row key={f} onClick={() => openFile(f)}>
                <Clock size={12} className="mr-2 opacity-60" />
                <span className="truncate">{basename(f)}</span>
              </Row>
            ))
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="py-1">
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-surface-2"
    >
      {children}
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="px-3 py-2 text-xs text-muted">{children}</div>;
}
