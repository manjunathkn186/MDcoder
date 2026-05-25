import ParserWorker from "@/workers/parser.worker?worker";
import type {
  ParseError,
  ParseRequest,
  ParseResponse,
} from "@/workers/parser.worker";
import { usePreview } from "@state/preview.store";
import { logger } from "@lib/logger";
import { renderCache } from "@/services/renderCache";

type WorkerOut = ParseResponse | ParseError;

/**
 * Singleton wrapper around the parser worker. Latest-wins semantics:
 * stale responses (older `rev`) are dropped before reaching the store.
 */
class ParserService {
  private worker: Worker;
  private nextId = 1;
  private nextRev = 1;
  private latestRev = 0;
  private pendingSources = new Map<number, string>();

  constructor() {
    this.worker = new ParserWorker();
    this.worker.addEventListener("message", this.onMessage);
  }

  /**
   * Schedule a parse of `source`. The `_externalRev` parameter is accepted
   * for backward compatibility but ignored — the service owns a single
   * monotonic revision counter so multiple call sites (the editor on every
   * keystroke and the preview on every doc switch) never fight over
   * staleness.
   */
  parse(source: string, _externalRev?: number): void {
    const rev = ++this.nextRev;
    this.latestRev = rev;
    // Fast path: identical source already rendered — apply directly.
    const cached = renderCache.get(source);
    if (cached) {
      usePreview.getState().setRender({ html: cached.html, lineSet: cached.lineSet, rev });
      return;
    }
    const id = this.nextId++;
    const req: ParseRequest = { type: "parse", id, rev, source };
    this.pendingSources.set(id, source);
    // Prune stale entries to keep the map bounded.
    if (this.pendingSources.size > 16) {
      const oldest = this.pendingSources.keys().next().value;
      if (oldest !== undefined) this.pendingSources.delete(oldest);
    }
    this.worker.postMessage(req);
  }

  reset(): void {
    usePreview.getState().reset();
  }

  private onMessage = (ev: MessageEvent<WorkerOut>) => {
    const msg = ev.data;
    if (msg.rev < this.latestRev) return; // stale
    if (msg.type === "parsed") {
      usePreview.getState().setRender({
        html: msg.html,
        lineSet: msg.lineSet,
        rev: msg.rev,
      });
      const src = this.pendingSources.get(msg.id);
      if (typeof src === "string") {
        renderCache.set(src, { html: msg.html, lineSet: msg.lineSet });
        this.pendingSources.delete(msg.id);
      }
      logger.debug("[parser] rendered rev=%d in %dms", msg.rev, Math.round(msg.durationMs));
    } else {
      usePreview.getState().setError(msg.message);
      logger.warn("[parser] error", msg.message);
    }
  };
}

export const parserService = new ParserService();
