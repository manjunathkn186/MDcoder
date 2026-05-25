import { useEffect, useMemo, useRef, useState } from "react";
import { search, type SearchHit } from "@/services/search";
import { useIndex } from "@state/index.store";
import { useEditor } from "@state/editor.store";
import { useRecent } from "@state/recent.store";
import { fileCache } from "@/services/cache";
import { basename } from "@/services/fs";

export function GlobalSearch(): JSX.Element {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const status = useIndex((s) => s.status);
  const progress = useIndex((s) => s.progress);
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    const t = window.setTimeout(async () => {
      const res = await search(q);
      if (id === seq.current) setHits(res);
    }, 80);
    return () => window.clearTimeout(t);
  }, [q]);

  const header = useMemo(() => {
    if (status === "indexing") return `Indexing ${progress.done}/${progress.total}…`;
    if (status === "ready") return `${useIndex.getState().files.size} files indexed`;
    return "No index yet";
  }, [status, progress]);

  const openHit = async (h: SearchHit) => {
    try {
      const content = await fileCache.read(h.path);
      useEditor.getState().openDoc({
        id: h.path,
        path: h.path,
        title: h.title || basename(h.path),
        content,
      });
      useRecent.getState().pushFile(h.path);
    } catch {
      /* ignored */
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search notes…"
          className="w-full rounded bg-surface-2 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-accent"
        />
        <div className="mt-1 text-[11px] text-muted">{header}</div>
      </div>
      <ul className="ink-scroll flex-1 overflow-y-auto p-1">
        {hits.length === 0 ? (
          <li className="px-3 py-4 text-sm text-muted">
            {q ? "No matches." : "Type to search."}
          </li>
        ) : (
          hits.map((h) => (
            <li key={h.path}>
              <button
                onClick={() => openHit(h)}
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-surface-2"
              >
                <div className="truncate font-medium">{h.title}</div>
                <div className="truncate text-[11px] text-muted">{h.path}</div>
                {h.snippet && (
                  <div className="mt-1 line-clamp-2 text-[11px] text-muted">{h.snippet}</div>
                )}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
