import { Editor } from "@features/editor/Editor";
import { Preview } from "@features/preview/Preview";
import { Tabs } from "@features/editor/Tabs";
import { Breadcrumb } from "@features/editor/Breadcrumb";
import { Outline } from "@features/editor/Outline";
import { Minimap } from "@features/editor/Minimap";
import { useUi } from "@state/ui.store";
import { cn } from "@lib/cn";

export function WorkspaceView(): JSX.Element {
  const viewMode = useUi((s) => s.viewMode);
  const outlineOpen = useUi((s) => s.outlineOpen);
  const minimapOpen = useUi((s) => s.minimapOpen);
  const distractionFree = useUi((s) => s.distractionFree);

  const showOutline = outlineOpen && !distractionFree;
  const showMinimap = minimapOpen && viewMode !== "preview" && !distractionFree;

  return (
    <div className="flex h-full flex-col">
      {!distractionFree && <Tabs />}
      {!distractionFree && <Breadcrumb />}
      <div
        className="grid min-h-0 flex-1"
        style={{
          gridTemplateColumns: showOutline ? "1fr 220px" : "1fr",
        }}
      >
        <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[1fr_1fr]">
          {viewMode !== "preview" && (
            <section
              className={cn(
                "flex min-h-0 overflow-hidden border-r border-border",
                viewMode === "edit" && "lg:col-span-2",
              )}
            >
              <div className="min-w-0 flex-1">
                <Editor />
              </div>
              {showMinimap && <Minimap />}
            </section>
          )}
          {viewMode !== "edit" && (
            <section
              className={cn(
                "min-h-0 overflow-hidden",
                viewMode === "preview" && "lg:col-span-2",
              )}
            >
              <Preview />
            </section>
          )}
        </div>
        {showOutline && (
          <aside className="ink-scroll min-h-0 overflow-y-auto border-l border-border bg-surface">
            <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Outline
            </div>
            <Outline />
          </aside>
        )}
      </div>
    </div>
  );
}
