/**
 * Plugin API surface — the object handed to a plugin's `activate(api)`
 * function. Each capability is grouped under a namespace; calls return
 * `Disposable`s the host tracks so it can revoke registrations cleanly
 * when the plugin is disabled or uninstalled.
 *
 * Trusted (in-process) plugins receive the full object. Sandboxed plugins
 * receive a remote proxy whose methods marshal calls through postMessage;
 * fields marked "trusted-only" are unavailable in the sandbox.
 */
import type { Theme } from "@themes/sdk";

export interface Disposable {
  dispose(): void;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface PluginCommand {
  id: string;
  title: string;
  shortcut?: string;
  run: () => void | Promise<void>;
}

export interface ToolbarItem {
  id: string;
  /** Tooltip / accessible label. */
  title: string;
  /** Lucide icon name (must be a string so the host can resolve safely). */
  icon: string;
  /** Optional priority (higher renders earlier). */
  priority?: number;
  onClick: () => void | Promise<void>;
}

export interface StatusBarItem {
  id: string;
  text: string;
  tooltip?: string;
  /** Defaults to "right". */
  align?: "left" | "right";
  /** Higher = earlier in its alignment group. */
  priority?: number;
  onClick?: () => void | Promise<void>;
}

export interface ActiveDocument {
  id: string;
  path: string | null;
  title: string;
  content: string;
  dirty: boolean;
}

export type ToastKind = "info" | "success" | "warning" | "danger";

export interface InkstoneAPI {
  /** Host engine version (semver). */
  readonly version: string;
  readonly pluginId: string;

  commands: {
    register(cmd: PluginCommand): Disposable;
  };

  toolbar: {
    addItem(item: ToolbarItem): Disposable;
  };

  statusBar: {
    addItem(item: StatusBarItem): Disposable;
  };

  ui: {
    toast(input: string | { title?: string; message: string; kind?: ToastKind }): void;
    confirm(opts: {
      title: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      destructive?: boolean;
    }): Promise<boolean>;
  };

  workspace: {
    activeDocument(): ActiveDocument | null;
    onActiveDocumentChange(fn: (doc: ActiveDocument | null) => void): Disposable;
  };

  themes: {
    register(theme: Theme): Disposable;
  };

  /** Trusted-only: extend the markdown-it pipeline. */
  markdown?: {
    use(plugin: (md: unknown) => void): Disposable;
  };

  /** Trusted-only: register a CodeMirror 6 extension. */
  editor?: {
    addExtension(extension: unknown): Disposable;
  };

  log(level: LogLevel, message: string, ...args: unknown[]): void;
}

/**
 * The shape a plugin module must export. `activate` may return a
 * Disposable that the host will call on deactivate; alternatively the
 * plugin may export a top-level `deactivate` function.
 */
export interface PluginModule {
  activate(api: InkstoneAPI): void | Disposable | Promise<void | Disposable>;
  deactivate?(): void | Promise<void>;
}
