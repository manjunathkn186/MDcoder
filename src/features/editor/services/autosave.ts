import { ipc } from "@ipc/client";
import { useEditor } from "@state/editor.store";
import { debounce } from "@lib/debounce";
import { logger } from "@lib/logger";

const AUTOSAVE_DEBOUNCE_MS = 800;

/**
 * Autosave service. Schedules atomic writes via Tauri's `write_text_file`
 * command for documents that have a backing path. In-memory (untitled) docs
 * are preserved via the session store instead.
 */
class AutosaveService {
  private pending = new Map<string, ReturnType<typeof debounce>>();

  schedule(docId: string): void {
    let trigger = this.pending.get(docId);
    if (!trigger) {
      trigger = debounce(() => void this.flush(docId), AUTOSAVE_DEBOUNCE_MS);
      this.pending.set(docId, trigger);
    }
    trigger();
  }

  async flush(docId: string): Promise<void> {
    const doc = useEditor.getState().docs[docId];
    if (!doc || !doc.path || !doc.dirty) return;
    try {
      await ipc.writeTextFile(doc.path, doc.content);
      useEditor.getState().markSaved(doc.id);
      logger.debug("[autosave] wrote", doc.path);
    } catch (err) {
      logger.warn("[autosave] failed", doc.path, err);
    }
  }

  async flushAll(): Promise<void> {
    const ids = Object.keys(useEditor.getState().docs);
    await Promise.allSettled(ids.map((id) => this.flush(id)));
  }
}

export const autosave = new AutosaveService();
