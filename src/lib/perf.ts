/**
 * Performance utilities (Phase 9).
 *
 * - `idle()` defers work to the next idle period (falls back to
 *   setTimeout in browsers without `requestIdleCallback`).
 * - `nextFrame()` resolves on the next animation frame.
 * - `microtask()` resolves at the end of the current task.
 * - `runBatched()` processes a large queue cooperatively, yielding back
 *   to the event loop between chunks.
 * - `simpleHash()` is a fast non-cryptographic 32-bit hash used as a
 *   cache key for rendered content.
 */
type IdleHandle = number;

interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining(): number;
}

const idleApi: {
  request(cb: (d: IdleDeadline) => void, opts?: { timeout: number }): IdleHandle;
  cancel(id: IdleHandle): void;
} =
  typeof (globalThis as unknown as { requestIdleCallback?: unknown }).requestIdleCallback === "function"
    ? {
        request: (cb, opts) =>
          (window as unknown as {
            requestIdleCallback(c: (d: IdleDeadline) => void, o?: { timeout: number }): number;
          }).requestIdleCallback(cb, opts),
        cancel: (id) =>
          (window as unknown as { cancelIdleCallback(id: number): void }).cancelIdleCallback(id),
      }
    : {
        request: (cb, opts) =>
          window.setTimeout(
            () => cb({ didTimeout: true, timeRemaining: () => 16 }),
            opts?.timeout ?? 1,
          ) as unknown as number,
        cancel: (id) => window.clearTimeout(id as unknown as number),
      };

export function idle(timeoutMs = 200): Promise<IdleDeadline> {
  return new Promise((resolve) => idleApi.request(resolve, { timeout: timeoutMs }));
}

export function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

export function microtask(): Promise<void> {
  return Promise.resolve();
}

/**
 * Process `items` with `worker`, yielding to the browser when the idle
 * deadline expires. Useful for background indexing or batch UI work.
 */
export async function runBatched<T>(
  items: readonly T[],
  worker: (item: T, index: number) => void | Promise<void>,
  { minChunk = 8, idleTimeout = 100 }: { minChunk?: number; idleTimeout?: number } = {},
): Promise<void> {
  let i = 0;
  while (i < items.length) {
    const deadline = await idle(idleTimeout);
    let processed = 0;
    while (
      i < items.length &&
      (processed < minChunk || deadline.timeRemaining() > 1)
    ) {
      await worker(items[i], i);
      i++;
      processed++;
    }
  }
}

/**
 * 32-bit FNV-1a hash. Stable across runs, suitable for in-memory cache
 * keys (NOT for cryptographic purposes).
 */
export function simpleHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash.toString(36);
}
