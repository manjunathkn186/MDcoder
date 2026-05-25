import { useSyncExternalStore } from "react";
import * as icons from "lucide-react";
import { Button } from "@ui/Button";
import { toolbarRegistry } from "@/plugins/runtime/extensionPoints";

/** Renders plugin-contributed toolbar items in the title bar. */
export function PluginToolbarItems(): JSX.Element | null {
  const version = useSyncExternalStore(
    (cb) => toolbarRegistry.subscribe(cb),
    () => toolbarRegistry.version,
    () => 0,
  );
  const items = [...toolbarRegistry.values()].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );
  if (items.length === 0) return null;
  return (
    <div className="flex items-center gap-0.5" data-version={version}>
      {items.map((item) => {
        const Icon = (icons as unknown as Record<string, typeof icons.Plug>)[item.icon] ?? icons.Plug;
        return (
          <Button
            key={item.id}
            variant="ghost"
            size="sm"
            onClick={() => void item.onClick()}
            aria-label={item.title}
            title={item.title}
          >
            <Icon size={16} />
          </Button>
        );
      })}
    </div>
  );
}
