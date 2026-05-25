import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@ui/Dialog";
import { useUi } from "@state/ui.store";
import { useEditor } from "@state/editor.store";
import { useIndex } from "@state/index.store";
import { useRecent } from "@state/recent.store";
import { fileCache } from "@/services/cache";
import { basename } from "@/services/fs";
import { fuzzyFilter } from "@lib/fuzzy";
import { logger } from "@lib/logger";

interface FileItem {
  path: string;
  title: string;
}

export function QuickOpen(): JSX.Element {
  const open = useUi((s) => s.quickOpenOpen);
  const setOpen = useUi((s) => s.setQuickOpenOpen);
  const filesMap = useIndex((s) => s.files);
  const indexStatus = useIndex((s) => s.status);
  const recent = useRecent((s) => s.files);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
    }
  }, [open]);

  const items: FileItem[] = useMemo(() => {
    const map = new Map<string, FileItem>();
    for (const [path, meta] of filesMap) map.set(path, { path, title: meta.title });
    // Surface recent first when no query — they get a constant boost via ordering.
    return [
      ...recent.filter((p) => map.has(p)).map((p) => map.get(p)!),
      ...Array.from(map.values()).filter((i) => !recent.includes(i.path)),
    ];
  }, [filesMap, recent]);

  const filtered = useMemo(() => {
    if (!q) return items.slice(0, 50).map((item, i) => ({ item, score: -i }));
    return fuzzyFilter(q, items, (i) => `${i.title} ${basename(i.path)} ${i.path}`).slice(0, 50);
  }, [q, items]);

  const openFile = async (file: FileItem) => {
    try {
      const content = await fileCache.read(file.path);
      useEditor.getState().openDoc({
        id: file.path,
        path: file.path,
        title: file.title || basename(file.path),
        content,
      });
      useRecent.getState().pushFile(file.path);
      setOpen(false);
    } catch (err) {
      logger.warn("[quick-open] read failed", err);
    }
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} ariaLabel="Quick open file">
      <div className="border-b border-border p-3">
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(filtered.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const target = filtered[active]?.item;
              if (target) void openFile(target);
            }
          }}
          placeholder={
            items.length === 0
              ? indexStatus === "indexing"
                ? "Indexing workspace…"
                : "Open a workspace first"
              : "Type to find a file…"
          }
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          disabled={items.length === 0}
        />
      </div>
      <ul className="ink-scroll max-h-[50vh] overflow-y-auto p-1" role="listbox">
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-sm text-muted">
            {items.length === 0 ? "No files indexed yet." : "No files match."}
          </li>
        ) : (
          filtered.map(({ item }, i) => (
            <li
              key={item.path}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                void openFile(item);
              }}
              className={
                "flex cursor-pointer flex-col rounded px-3 py-1.5 text-sm " +
                (i === active ? "bg-accent text-accent-fg" : "hover:bg-surface-2")
              }
            >
              <span className="truncate">{item.title || basename(item.path)}</span>
              <span
                className={
                  "truncate text-[11px] " +
                  (i === active ? "text-accent-fg/80" : "text-muted")
                }
              >
                {item.path}
              </span>
            </li>
          ))
        )}
      </ul>
    </Dialog>
  );
}
