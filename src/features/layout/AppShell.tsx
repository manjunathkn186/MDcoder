import { Outlet } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { Sidebar } from "@features/layout/Sidebar";
import { TitleBar } from "@features/layout/TitleBar";
import { StatusBar } from "@features/layout/StatusBar";
import { CommandPalette } from "@features/command-palette/Palette";
import { QuickOpen } from "@features/quick-open/QuickOpen";
import { useUi } from "@state/ui.store";
import { useSettings } from "@state/settings.store";
import { useGlobalShortcuts } from "@app/shortcuts";
import { useTrackpadZoom } from "@app/trackpadZoom";
import { Toaster } from "@ui/Toaster";
import { ConfirmHost } from "@ui/ConfirmHost";
// ExportDialog pulls in `docx`/`unified` — heavy. Loaded only when opened.
const ExportDialog = lazy(() =>
  import("@features/export/ExportDialog").then((m) => ({ default: m.ExportDialog })),
);
import { sessionService } from "@features/editor/services/session";
import { autosave } from "@features/editor/services/autosave";
import { wireWatcherToStores } from "@/services/wireWatcher";
import { installBuiltinPlugins } from "@/plugins/builtin";
import { cn } from "@lib/cn";

export function AppShell(): JSX.Element {
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const sidebarWidth = useUi((s) => s.sidebarWidth);
  const distractionFree = useUi((s) => s.distractionFree);
  const themeMode = useSettings((s) => s.themeMode);
  const apply = useSettings((s) => s.apply);

  useGlobalShortcuts();
  useTrackpadZoom();

  // Apply current theme on mount and whenever the mode changes; keep the
  // app in sync with OS appearance when themeMode === "system".
  useEffect(() => {
    apply();
    if (themeMode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => apply();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themeMode, apply]);

  // Session attach + restore on mount; flush on unload.
  useEffect(() => {
    sessionService.attach();
    sessionService.restore();
    const disposeWatcherWiring = wireWatcherToStores();
    void installBuiltinPlugins();
    const beforeUnload = () => {
      sessionService.snapshot();
      void autosave.flushAll();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      sessionService.dispose();
      disposeWatcherWiring();
    };
  }, []);

  return (
    <div className="grid h-screen grid-rows-[auto_1fr_auto] bg-bg text-fg">
      {!distractionFree && <TitleBar />}
      <div
        className={cn("grid h-full overflow-hidden")}
        style={{
          gridTemplateColumns:
            !distractionFree && sidebarOpen ? `${sidebarWidth}px 1fr` : "0 1fr",
        }}
      >
        {!distractionFree && <Sidebar />}
        <main className="overflow-hidden">
          <Outlet />
        </main>
      </div>
      {!distractionFree && <StatusBar />}
      <CommandPalette />
      <QuickOpen />
      <Suspense fallback={null}><ExportDialog /></Suspense>
      <Toaster />
      <ConfirmHost />
    </div>
  );
}
