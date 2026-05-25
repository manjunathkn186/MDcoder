import { useSyncExternalStore } from "react";
import { statusBarRegistry } from "@/plugins/runtime/extensionPoints";
import { cn } from "@lib/cn";

interface Props { align: "left" | "right" }

/** Renders plugin status-bar items for the given alignment. */
export function PluginStatusItems({ align }: Props): JSX.Element | null {
  const version = useSyncExternalStore(
    (cb) => statusBarRegistry.subscribe(cb),
    () => statusBarRegistry.version,
    () => 0,
  );
  const items = [...statusBarRegistry.values()]
    .filter((i) => (i.align ?? "right") === align)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  if (items.length === 0) return null;
  return (
    <div className="flex items-center gap-2" data-version={version}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => void it.onClick?.()}
          title={it.tooltip ?? it.text}
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px] uppercase tracking-wider text-muted",
            it.onClick && "hover:bg-surface-2 hover:text-fg",
          )}
        >
          {it.text}
        </button>
      ))}
    </div>
  );
}
