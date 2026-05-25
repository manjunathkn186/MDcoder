import { useMemo } from "react";
import { useIndex } from "@state/index.store";
import { useEditor } from "@state/editor.store";
import { fileCache } from "@/services/cache";
import { basename } from "@/services/fs";

export function BacklinksPanel(): JSX.Element {
  const activeId = useEditor((s) => s.activeId);
  const doc = useEditor((s) => (s.activeId ? s.docs[s.activeId] : null));
  const filesMap = useIndex((s) => s.files);
  const backlinks = useIndex((s) => s.backlinks);
  const titleToPath = useIndex((s) => s.titleToPath);

  const incoming = useMemo(() => {
    if (!doc?.path) return [] as string[];
    const meta = filesMap.get(doc.path);
    const titleKey = meta?.title.toLowerCase();
    const stemKey = basename(doc.path).replace(/\.[^.]+$/, "").toLowerCase();
    const seen = new Set<string>();
    if (titleKey) {
      backlinks.get(titleKey)?.forEach((p) => p !== doc.path && seen.add(p));
    }
    backlinks.get(stemKey)?.forEach((p) => p !== doc.path && seen.add(p));
    return Array.from(seen);
  }, [activeId, doc, filesMap, backlinks, titleToPath]);

  const outgoing = useMemo(() => {
    if (!doc?.path) return [] as { target: string; resolved: string | null }[];
    const meta = filesMap.get(doc.path);
    if (!meta) return [];
    return meta.outgoing.map((target) => ({
      target,
      resolved: titleToPath.get(target.toLowerCase()) ?? null,
    }));
  }, [activeId, doc, filesMap, titleToPath]);

  const open = async (p: string) => {
    try {
      const content = await fileCache.read(p);
      useEditor.getState().openDoc({ id: p, path: p, title: basename(p), content });
    } catch {
      /* ignored */
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted">
        Links
      </div>
      <div className="ink-scroll flex-1 overflow-y-auto text-sm">
        <Group title={`Backlinks (${incoming.length})`}>
          {incoming.length === 0 ? (
            <Empty>No incoming links.</Empty>
          ) : (
            incoming.map((p) => (
              <button
                key={p}
                onClick={() => open(p)}
                className="block w-full truncate px-3 py-1.5 text-left hover:bg-surface-2"
              >
                {basename(p)}
              </button>
            ))
          )}
        </Group>
        <Group title={`Outgoing (${outgoing.length})`}>
          {outgoing.length === 0 ? (
            <Empty>No outgoing links.</Empty>
          ) : (
            outgoing.map((o, i) => (
              <button
                key={`${o.target}-${i}`}
                onClick={() => o.resolved && open(o.resolved)}
                disabled={!o.resolved}
                className="block w-full truncate px-3 py-1.5 text-left hover:bg-surface-2 disabled:opacity-50"
                title={o.resolved ?? "Unresolved"}
              >
                {o.target}
              </button>
            ))
          )}
        </Group>
      </div>
    </div>
  );
}

function Group({
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

function Empty({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="px-3 py-2 text-xs text-muted">{children}</div>;
}
