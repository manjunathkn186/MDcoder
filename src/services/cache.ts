import { LRU } from "@lib/lru";
import { fs } from "./fs";

interface Entry {
  content: string;
  /** When the bytes on disk were last modified (epoch ms). */
  mtimeMs: number;
}

/**
 * File-content cache keyed by absolute path.
 *
 * Phase 11 (review) fixes:
 *   - `invalidate()` now actually drops the entry instead of poisoning
 *     it with an empty string.
 *   - `read()` only refetches when the caller provides an `mtimeMs`
 *     *newer* than the cached value. Calls without an mtime always
 *     serve a cache hit (they're either the watcher writing fresh
 *     content via `set()`, or a UI call that doesn't know the mtime).
 */
class FileCache {
  private store = new LRU<string, Entry>(64);

  async read(path: string, mtimeMs?: number): Promise<string> {
    const hit = this.store.get(path);
    if (hit && (mtimeMs === undefined || mtimeMs <= hit.mtimeMs)) {
      return hit.content;
    }
    const content = await fs.readText(path);
    // Preserve the supplied mtime when known; otherwise mark "fresh from disk".
    this.store.set(path, { content, mtimeMs: mtimeMs ?? Date.now() });
    return content;
  }

  set(path: string, content: string, mtimeMs = Date.now()): void {
    this.store.set(path, { content, mtimeMs });
  }

  invalidate(path: string): void {
    this.store.delete(path);
  }

  clear(): void {
    this.store.clear();
  }
}

export const fileCache = new FileCache();
