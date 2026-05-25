import { Link, useLocation } from "react-router-dom";
import {
  PanelLeft,
  Settings,
  Sun,
  Moon,
  Monitor,
  Command,
  Search,
  Maximize2,
  Minimize2,
  ChevronRight,
  Columns,
  Eye,
  Pencil,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@ui/Button";
import { Icon } from "@ui/Icon";
import { useUi } from "@state/ui.store";
import { useSettings, type ThemeMode } from "@state/settings.store";
import { useWorkspaceTree } from "@state/workspaceTree.store";
import { useEditor } from "@state/editor.store";
import { basename, relativeTo } from "@/services/fs";
import { PluginToolbarItems } from "@features/plugins/PluginToolbarItems";
import { cn } from "@lib/cn";

const MODE_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

/**
 * Premium top toolbar. Provides drag region, sidebar toggle, workspace+doc
 * breadcrumb, quick-actions (palette / quick-open / fullscreen), and a
 * three-state theme switcher.
 */
export function TitleBar(): JSX.Element {
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const fullscreen = useUi((s) => s.fullscreen);
  const toggleFullscreen = useUi((s) => s.toggleFullscreen);
  const setPaletteOpen = useUi((s) => s.setPaletteOpen);
  const setQuickOpenOpen = useUi((s) => s.setQuickOpenOpen);
  const viewMode = useUi((s) => s.viewMode);
  const setViewMode = useUi((s) => s.setViewMode);
  const themeMode = useSettings((s) => s.themeMode);
  const setThemeMode = useSettings((s) => s.setThemeMode);
  const root = useWorkspaceTree((s) => s.root);
  const activeDoc = useEditor((s) => (s.activeId ? s.docs[s.activeId] : null));
  const location = useLocation();

  const nextMode: Record<ThemeMode, ThemeMode> = {
    system: "light",
    light: "dark",
    dark: "system",
  };
  const ModeIcon = MODE_ICON[themeMode];

  return (
    <header
      role="banner"
      className="relative flex h-11 items-center gap-1 border-b border-border bg-bg-soft/80 px-2 backdrop-blur"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="sm" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <Icon icon={PanelLeft} />
        </Button>
        <span className="ml-1 select-none text-sm font-semibold tracking-tight text-fg-strong">
          MDCoder
        </span>
      </div>

      {/* Center breadcrumb */}
      <div className="pointer-events-none mx-3 flex min-w-0 flex-1 items-center justify-center text-xs text-muted">
        {root && (
          <span className="truncate font-medium text-fg">{root.name}</span>
        )}
        {activeDoc?.path && root && (
          <>
            <Icon icon={ChevronRight} size={12} className="mx-1 opacity-60" />
            <span className="truncate">
              {relativeTo(root.path, activeDoc.path) || basename(activeDoc.path)}
            </span>
          </>
        )}
        {activeDoc?.dirty && <span className="ml-2 text-accent">●</span>}
      </div>

      <div className="flex items-center gap-0.5">
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
        <ZoomControl />
        <PluginToolbarItems />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setQuickOpenOpen(true)}
          aria-label="Quick open"
          title="Quick open (⌘P)"
        >
          <Icon icon={Search} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPaletteOpen(true)}
          aria-label="Command palette"
          title="Command palette (⌘⇧P)"
        >
          <Icon icon={Command} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setThemeMode(nextMode[themeMode])}
          aria-label={`Theme: ${themeMode}`}
          title={`Theme mode: ${themeMode}`}
        >
          <Icon icon={ModeIcon} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFullscreen}
          aria-label="Toggle fullscreen"
          title="Fullscreen (F11)"
        >
          <Icon icon={fullscreen ? Minimize2 : Maximize2} />
        </Button>
        <Link to="/settings" aria-label="Open settings">
          <Button
            variant={location.pathname === "/settings" ? "outline" : "ghost"}
            size="sm"
            className={cn(location.pathname === "/settings" && "text-accent")}
          >
            <Icon icon={Settings} />
          </Button>
        </Link>
      </div>
    </header>
  );
}

/**
 * Compact zoom control: -/+ buttons + a presets dropdown (50–200%).
 * Mirrors the same store actions exposed by Mod+= / Mod+- / Mod+0.
 */
function ZoomControl(): JSX.Element {
  const zoom = useUi((s) => s.zoom);
  const zoomIn = useUi((s) => s.zoomIn);
  const zoomOut = useUi((s) => s.zoomOut);
  const setZoom = useUi((s) => s.setZoom);
  const pct = Math.round(zoom * 100);
  return (
    <div className="ml-1 flex items-center gap-0.5 rounded border border-border bg-surface px-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={zoomOut}
        aria-label="Zoom out"
        title="Zoom out (⌘-)"
      >
        <Icon icon={ZoomOut} size={12} />
      </Button>
      <select
        value={pct}
        onChange={(e) => setZoom(Number(e.target.value) / 100)}
        aria-label="Zoom level"
        title="Zoom level"
        className="bg-transparent px-0.5 py-0.5 text-xs tabular-nums text-fg outline-none"
      >
        {[50, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300].map((v) => (
          <option key={v} value={v}>
            {v}%
          </option>
        ))}
        {/* Allow current odd values (e.g. set via ⌘+= steps of 10%) to show. */}
        {![50, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300].includes(pct) && (
          <option value={pct}>{pct}%</option>
        )}
      </select>
      <Button
        variant="ghost"
        size="sm"
        onClick={zoomIn}
        aria-label="Zoom in"
        title="Zoom in (⌘+)"
      >
        <Icon icon={ZoomIn} size={12} />
      </Button>
    </div>
  );
}

/**
 * Cycles Preview → Split → Edit → Preview. The viewer is the canonical
 * default; the editor pane is opt-in via this control or `Mod+\\`.
 */
function ViewModeToggle({
  viewMode,
  setViewMode,
}: {
  viewMode: "edit" | "split" | "preview";
  setViewMode: (m: "edit" | "split" | "preview") => void;
}): JSX.Element {
  const next = viewMode === "preview" ? "split" : viewMode === "split" ? "edit" : "preview";
  const icon = viewMode === "preview" ? Eye : viewMode === "split" ? Columns : Pencil;
  const label =
    viewMode === "preview"
      ? "Show editor (split view)"
      : viewMode === "split"
        ? "Editor only"
        : "Hide editor (preview only)";
  return (
    <Button
      variant={viewMode === "preview" ? "ghost" : "outline"}
      size="sm"
      onClick={() => setViewMode(next)}
      aria-label={label}
      title={`${label} (⌘\\)`}
    >
      <Icon icon={icon} />
    </Button>
  );
}
