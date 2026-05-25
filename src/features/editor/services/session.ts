import { useEditor } from "@state/editor.store";
import { useSession, type PersistedTab } from "@state/session.store";
import { useViewState } from "@state/viewState.store";
import { debounce } from "@lib/debounce";

const SAVE_DEBOUNCE_MS = 1500;

/**
 * Session restore service.
 *   - `snapshot()` captures the current open-tab set and active id.
 *   - `restore()` loads the most recent snapshot into the editor store.
 *   - `attach()` wires a debounced auto-save to the editor store.
 */
class SessionService {
  private detach: (() => void) | null = null;

  attach(): void {
    if (this.detach) return;
    const persist = debounce(() => this.snapshot(), SAVE_DEBOUNCE_MS);
    const unsub = useEditor.subscribe(() => persist());
    this.detach = unsub;
  }

  dispose(): void {
    this.detach?.();
    this.detach = null;
  }

  /**
   * Capture the current open-tab set, active id, and per-doc view state
   * (cursor + editor scrollTop + preview scrollTop) into the persisted
   * session. Reads view state from `useViewState` so the editor/preview
   * components don't need to participate at snapshot time.
   */
  snapshot(): void {
    const { docs, order, activeId } = useEditor.getState();
    const view = useViewState.getState();
    const tabs: PersistedTab[] = order
      .map((id) => docs[id])
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map((d) => {
        const v = view.get(d.id);
        return {
          id: d.id,
          path: d.path,
          title: d.title,
          content: d.content,
          dirty: d.dirty,
          cursor: v.cursor,
          scrollTop: v.editorScrollTop,
          previewScrollTop: v.previewScrollTop,
        };
      });
    useSession.getState().save({ tabs, activeId, savedAt: Date.now() });
  }

  /**
   * Restore the most recent snapshot. Re-opens every persisted tab and
   * hydrates `useViewState` so the Editor/Preview restore effects pick
   * up the saved cursor + scroll positions on first mount.
   */
  restore(): boolean {
    const snap = useSession.getState().snapshot;
    if (!snap || snap.tabs.length === 0) return false;
    const store = useEditor.getState();
    const view: Record<
      string,
      { cursor: number; editorScrollTop: number; previewScrollTop: number }
    > = {};
    for (const t of snap.tabs) {
      store.openDoc({
        id: t.id,
        path: t.path,
        title: t.title,
        content: t.content,
        dirty: t.dirty,
      });
      view[t.id] = {
        cursor: t.cursor ?? 0,
        editorScrollTop: t.scrollTop ?? 0,
        previewScrollTop: t.previewScrollTop ?? 0,
      };
    }
    useViewState.getState().hydrate(view);
    if (snap.activeId) store.setActive(snap.activeId);
    return true;
  }
}

export const sessionService = new SessionService();
