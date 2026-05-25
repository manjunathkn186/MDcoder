import { onFsEvent, type FsEvent } from "@ipc/events";
import { fs } from "./fs";
import { fileCache } from "./cache";
import { logger } from "@lib/logger";

type Listener = (e: FsEvent) => void;

class FileWatcher {
  private listeners = new Set<Listener>();
  private unlisten: (() => void) | null = null;
  private watchedRoot: string | null = null;

  async start(root: string): Promise<void> {
    if (this.watchedRoot === root) return;
    if (this.watchedRoot) await this.stop();
    try {
      await fs.watch(root);
      this.watchedRoot = root;
      this.unlisten = await onFsEvent((ev) => {
        if (ev.kind === "modified" || ev.kind === "deleted") fileCache.invalidate(ev.path);
        if (ev.kind === "renamed") {
          fileCache.invalidate(ev.from);
          fileCache.invalidate(ev.to);
        }
        for (const l of this.listeners) l(ev);
      });
    } catch (err) {
      logger.warn("[watcher] start failed", err);
    }
  }

  async stop(): Promise<void> {
    this.unlisten?.();
    this.unlisten = null;
    if (this.watchedRoot) {
      try {
        await fs.unwatch(this.watchedRoot);
      } catch (err) {
        logger.debug("[watcher] unwatch error", err);
      }
      this.watchedRoot = null;
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const fileWatcher = new FileWatcher();
