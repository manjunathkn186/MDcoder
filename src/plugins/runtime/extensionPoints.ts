/**
 * Observable extension-point registries. Each registry is a Map keyed by
 * the contributing plugin id; the host iterates the values to render
 * toolbars / status items, or to inject markdown-it / CM6 extensions.
 *
 * Every mutation bumps a `version` counter that subscribers can use as a
 * cheap React `useSyncExternalStore` snapshot key.
 */
import type {
  PluginCommand,
  StatusBarItem,
  ToolbarItem,
} from "@/plugins/sdk/api";

type Listener = () => void;

class ExtensionRegistry<K, V> {
  private store = new Map<K, V[]>();
  private listeners = new Set<Listener>();
  private _version = 0;

  add(owner: K, value: V): () => void {
    const list = this.store.get(owner) ?? [];
    list.push(value);
    this.store.set(owner, list);
    this.bump();
    return () => this.removeOne(owner, value);
  }

  removeOne(owner: K, value: V): void {
    const list = this.store.get(owner);
    if (!list) return;
    const i = list.indexOf(value);
    if (i >= 0) list.splice(i, 1);
    if (list.length === 0) this.store.delete(owner);
    this.bump();
  }

  /** Drop everything registered by `owner`. Called on plugin deactivation. */
  clearOwner(owner: K): void {
    if (this.store.delete(owner)) this.bump();
  }

  values(): V[] {
    const out: V[] = [];
    for (const arr of this.store.values()) out.push(...arr);
    return out;
  }

  entries(): IterableIterator<[K, V[]]> {
    return this.store.entries();
  }

  get version(): number {
    return this._version;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private bump(): void {
    this._version++;
    for (const l of this.listeners) l();
  }
}

export const commandRegistry = new ExtensionRegistry<string, PluginCommand>();
export const toolbarRegistry = new ExtensionRegistry<string, ToolbarItem>();
export const statusBarRegistry = new ExtensionRegistry<string, StatusBarItem>();
/** Markdown-it transform: function called with the `md` instance. */
export const markdownPluginRegistry = new ExtensionRegistry<
  string,
  (md: unknown) => void
>();
/** CodeMirror Extension objects. */
export const editorExtensionRegistry = new ExtensionRegistry<string, unknown>();

export function clearOwnerEverywhere(owner: string): void {
  commandRegistry.clearOwner(owner);
  toolbarRegistry.clearOwner(owner);
  statusBarRegistry.clearOwner(owner);
  markdownPluginRegistry.clearOwner(owner);
  editorExtensionRegistry.clearOwner(owner);
}
