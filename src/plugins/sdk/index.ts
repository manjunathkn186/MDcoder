// Public SDK surface. Plugins are expected to import from this module
// (in trusted mode) or from the postMessage shim (in sandbox mode).
export type {
  Disposable,
  InkstoneAPI,
  PluginCommand,
  PluginModule,
  ToolbarItem,
  StatusBarItem,
  ActiveDocument,
  ToastKind,
  LogLevel,
} from "./api";
export { parseManifest, type PluginManifest, type PluginPermission } from "./manifest";

/** Tiny helper for plugins to compose multiple Disposables into one. */
export function composeDisposables(...ds: Array<{ dispose(): void } | undefined>): {
  dispose(): void;
} {
  return {
    dispose() {
      for (const d of ds) {
        try {
          d?.dispose();
        } catch {
          /* ignore */
        }
      }
    },
  };
}
