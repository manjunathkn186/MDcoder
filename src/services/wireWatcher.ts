import { fileWatcher } from "./fileWatcher";
import { workspaceManager } from "./workspaceManager";
import { indexer } from "./indexer";
import { fileCache } from "./cache";
import { basename, isMarkdown } from "./fs";
import { fs } from "./fs";
import { logger } from "@lib/logger";

let installed = false;
let refreshTimer: number | null = null;

/**
 * Connect watcher events to:
 *  - cache invalidation (already done inside fileWatcher)
 *  - debounced tree refresh
 *  - incremental re-index of markdown files
 *  - removal of deleted/renamed entries from the index
 *
 * Idempotent: safe to call from `AppShell` mount.
 */
export function wireWatcherToStores(): () => void {
  if (installed) return () => undefined;
  installed = true;

  const scheduleRefresh = () => {
    if (refreshTimer !== null) return;
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;
      void workspaceManager.refresh();
    }, 300);
  };

  const unsubscribe = fileWatcher.subscribe(async (ev) => {
    try {
      if (ev.kind === "deleted") {
        if (isMarkdown(ev.path)) indexer.removeFile(ev.path);
        scheduleRefresh();
        return;
      }
      if (ev.kind === "renamed") {
        if (isMarkdown(ev.from)) indexer.removeFile(ev.from);
        if (isMarkdown(ev.to)) {
          const content = await fs.readText(ev.to);
          fileCache.set(ev.to, content);
          await indexer.indexFile(ev.to, content);
        }
        scheduleRefresh();
        return;
      }
      // created / modified
      if (isMarkdown(ev.path)) {
        const content = await fs.readText(ev.path);
        fileCache.set(ev.path, content);
        await indexer.indexFile(ev.path, content);
      }
      if (ev.kind === "created") scheduleRefresh();
    } catch (err) {
      logger.debug("[wireWatcher]", basename(ev.kind === "renamed" ? ev.to : ev.path), err);
    }
  });

  return () => {
    installed = false;
    unsubscribe();
  };
}
