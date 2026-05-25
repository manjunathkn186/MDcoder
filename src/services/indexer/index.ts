import IndexerWorker from "@/workers/indexer.worker?worker";
import type {
  SearchResult,
  UpsertResult,
  WorkerIn,
} from "@/workers/indexer.worker";
import type { WorkspaceNode } from "@ipc/client";
import { flattenFiles, isMarkdown, basename } from "@/services/fs";
import { fileCache } from "@/services/cache";
import { useIndex, type FileMeta } from "@state/index.store";
import { logger } from "@lib/logger";
import { idle } from "@lib/perf";

type WorkerOut = UpsertResult | SearchResult;

const CONCURRENCY = 4;

class IndexerService {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, (r: SearchResult["hits"]) => void>();

  constructor() {
    this.worker = new IndexerWorker();
    this.worker.addEventListener("message", this.onMessage);
  }

  async indexWorkspace(root: WorkspaceNode): Promise<void> {
    const files = flattenFiles(root).filter((f) => isMarkdown(f.path));
    useIndex.getState().reset();
    useIndex.getState().setStatus("indexing");
    useIndex.getState().setProgress({ done: 0, total: files.length });
    if (files.length === 0) {
      useIndex.getState().setStatus("ready");
      return;
    }

    let cursor = 0;
    let done = 0;
    const next = async (): Promise<void> => {
      while (cursor < files.length) {
        // Yield back to the main thread between chunks so the editor
        // remains responsive while we churn through the workspace.
        await idle();
        for (let i = 0; i < 8 && cursor < files.length; i++) {
          const f = files[cursor++];
          try {
            const content = await fileCache.read(f.path, f.mtimeMs);
            this.post({
              type: "upsert",
              path: f.path,
              source: content,
              fallbackTitle: basename(f.path).replace(/\.[^.]+$/, ""),
            });
          } catch (err) {
            logger.debug("[indexer] read failed", f.path, err);
          }
          done++;
        }
        useIndex.getState().setProgress({ done, total: files.length });
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, () => next()));
    useIndex.getState().setStatus("ready");
  }

  async indexFile(path: string, source: string): Promise<void> {
    this.post({
      type: "upsert",
      path,
      source,
      fallbackTitle: basename(path).replace(/\.[^.]+$/, ""),
    });
  }

  removeFile(path: string): void {
    this.post({ type: "remove", path });
    useIndex.getState().remove(path);
  }

  clear(): void {
    this.post({ type: "clear" });
    useIndex.getState().reset();
  }

  search(query: string, limit = 50): Promise<SearchResult["hits"]> {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.post({ type: "search", id, query, limit });
    });
  }

  private post(msg: WorkerIn): void {
    this.worker.postMessage(msg);
  }

  private onMessage = (ev: MessageEvent<WorkerOut>) => {
    const msg = ev.data;
    if (msg.type === "upserted") {
      const meta: FileMeta = {
        path: msg.path,
        title: msg.title,
        headings: msg.headings,
        outgoing: msg.outgoing,
        tags: msg.tags,
        mtimeMs: Date.now(),
      };
      useIndex.getState().upsert(meta);
    } else if (msg.type === "results") {
      const resolver = this.pending.get(msg.id);
      if (resolver) {
        this.pending.delete(msg.id);
        resolver(msg.hits);
      }
    }
  };
}

export const indexer = new IndexerService();
