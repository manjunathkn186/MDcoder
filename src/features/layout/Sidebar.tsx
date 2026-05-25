import { lazy, Suspense, useState } from "react";
import { Files, Search, Star, Clock, Network, Link2 } from "lucide-react";
import { FileTree } from "@features/explorer/FileTree";
import { GlobalSearch } from "@features/search/GlobalSearch";
import { FavoritesView } from "@features/favorites/FavoritesView";
import { RecentView } from "@features/recent/RecentView";
import { BacklinksPanel } from "@features/backlinks/BacklinksPanel";
import { cn } from "@lib/cn";

// Graph view is dense (force-directed sim). Keep it in its own chunk so
// users who never open the tab don't pay for it on startup.
const GraphView = lazy(() =>
  import("@features/graph/GraphView").then((m) => ({ default: m.GraphView })),
);
const LazyFallback = (): JSX.Element => (
  <div className="p-4 text-sm text-muted">Loading…</div>
);

type Tab = "explorer" | "search" | "favorites" | "recent" | "backlinks" | "graph";

const TABS: { id: Tab; icon: typeof Files; label: string }[] = [
  { id: "explorer", icon: Files, label: "Explorer" },
  { id: "search", icon: Search, label: "Search" },
  { id: "favorites", icon: Star, label: "Favorites" },
  { id: "recent", icon: Clock, label: "Recent" },
  { id: "backlinks", icon: Link2, label: "Backlinks" },
  { id: "graph", icon: Network, label: "Graph" },
];

export function Sidebar(): JSX.Element {
  const [tab, setTab] = useState<Tab>("explorer");

  return (
    <aside className="grid h-full grid-cols-[44px_1fr] border-r border-border bg-surface">
      <nav
        role="tablist"
        aria-orientation="vertical"
        className="flex flex-col items-center gap-1 border-r border-border bg-surface py-2"
      >
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            aria-label={label}
            title={label}
            onClick={() => setTab(id)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded text-muted transition-colors hover:bg-surface-2 hover:text-fg",
              tab === id && "bg-surface-2 text-fg",
            )}
          >
            <Icon size={18} />
          </button>
        ))}
      </nav>
      <div className="min-w-0 overflow-hidden">
        {tab === "explorer" && <FileTree />}
        {tab === "search" && <GlobalSearch />}
        {tab === "favorites" && <FavoritesView />}
        {tab === "recent" && <RecentView />}
        {tab === "backlinks" && <BacklinksPanel />}
        {tab === "graph" && (
          <Suspense fallback={<LazyFallback />}>
            <GraphView />
          </Suspense>
        )}
      </div>
    </aside>
  );
}
