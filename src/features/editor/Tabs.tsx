import { useState, type DragEvent } from "react";
import { X, Circle } from "lucide-react";
import { useEditor } from "@state/editor.store";
import { cn } from "@lib/cn";

export function Tabs(): JSX.Element | null {
  const { docs, order, activeId, setActive, closeDoc } = useEditor();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  if (order.length === 0) return null;

  const onDragStart = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  const onDragOver = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (id !== dragId) setOverId(id);
  };
  const onDrop = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const from = e.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    setOverId(null);
    if (!from || from === id) return;
    reorder(from, id);
  };
  const reorder = (from: string, to: string) => {
    useEditor.setState((s) => {
      const next = [...s.order];
      const fromIdx = next.indexOf(from);
      const toIdx = next.indexOf(to);
      if (fromIdx < 0 || toIdx < 0) return s;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, from);
      return { ...s, order: next };
    });
  };

  return (
    <div
      role="tablist"
      aria-label="Open documents"
      className="ink-scroll flex h-7 min-w-0 items-stretch overflow-x-auto border-b border-border bg-surface text-xs"
    >
      {order.map((id) => {
        const doc = docs[id];
        if (!doc) return null;
        const active = id === activeId;
        return (
          <div
            key={id}
            role="tab"
            aria-selected={active}
            tabIndex={0}
            draggable
            onDragStart={onDragStart(id)}
            onDragOver={onDragOver(id)}
            onDrop={onDrop(id)}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            onClick={() => setActive(id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setActive(id);
              if ((e.metaKey || e.ctrlKey) && e.key === "w") {
                e.preventDefault();
                closeDoc(id);
              }
            }}
            className={cn(
              "group flex shrink-0 items-center gap-1.5 border-r border-border px-2",
              active ? "bg-bg text-fg" : "text-muted hover:bg-surface-2",
              overId === id && "ring-1 ring-accent ring-inset",
            )}
            title={doc.path ?? doc.title}
          >
            <span className="max-w-[14ch] truncate">{doc.title}</span>
            {doc.dirty ? (
              <Circle size={6} className="fill-current opacity-70" aria-label="Unsaved" />
            ) : null}
            <button
              aria-label={`Close ${doc.title}`}
              onClick={(e) => {
                e.stopPropagation();
                closeDoc(id);
              }}
              className="rounded p-0.5 opacity-0 hover:bg-surface-2 group-hover:opacity-100"
            >
              <X size={10} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
