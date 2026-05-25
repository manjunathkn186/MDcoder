import { LRU } from "@lib/lru";
import { simpleHash } from "@lib/perf";

interface RenderedDoc {
  html: string;
  lineSet: number[];
}

/**
 * Markdown → HTML render cache.
 *
 * Keyed by `simpleHash(source)`. Hits skip the parser worker entirely
 * which is a noticeable win when:
 *   - the user toggles between two open tabs,
 *   - a watcher-driven reload yields identical content,
 *   - the preview is re-mounted (e.g. after view-mode change).
 *
 * Capacity is bounded so a runaway editor session cannot grow unbounded.
 */
class RenderCache {
  private store = new LRU<string, RenderedDoc>(32);

  key(source: string): string {
    return simpleHash(source);
  }

  get(source: string): RenderedDoc | undefined {
    return this.store.get(this.key(source));
  }

  set(source: string, value: RenderedDoc): void {
    this.store.set(this.key(source), value);
  }

  clear(): void {
    this.store.clear();
  }
}

export const renderCache = new RenderCache();
