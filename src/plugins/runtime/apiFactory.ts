/**
 * Build the `InkstoneAPI` object handed to an in-process plugin.
 * Each call routes to the matching extension-point registry / global
 * service and returns a Disposable the host tracks for revocation.
 */
import type {
  Disposable,
  InkstoneAPI,
  PluginCommand,
  StatusBarItem,
  ToolbarItem,
  LogLevel,
} from "@/plugins/sdk/api";
import type { PluginManifest, PluginPermission } from "@/plugins/sdk/manifest";
import {
  commandRegistry,
  toolbarRegistry,
  statusBarRegistry,
  markdownPluginRegistry,
  editorExtensionRegistry,
} from "./extensionPoints";
import { toast as hostToast } from "@ui/toast";
import { confirm as hostConfirm } from "@state/confirm.store";
import { useEditor } from "@state/editor.store";
import { themeRegistry } from "@themes/registry";
import { logger } from "@lib/logger";

const HOST_VERSION = "0.1.0";

function ensure(perms: PluginPermission[], required: PluginPermission, what: string): void {
  if (!perms.includes(required)) {
    throw new Error(`Plugin lacks permission "${required}" needed for ${what}`);
  }
}

export function createInProcessApi(manifest: PluginManifest): InkstoneAPI {
  const perms = manifest.permissions;
  const id = manifest.id;

  const log = (level: LogLevel, msg: string, ...args: unknown[]) => {
    logger[level === "debug" ? "debug" : level](`[plugin/${id}] ${msg}`, ...args);
  };

  const api: InkstoneAPI = {
    version: HOST_VERSION,
    pluginId: id,
    log,
    commands: {
      register(cmd: PluginCommand): Disposable {
        ensure(perms, "commands", "commands.register");
        const dispose = commandRegistry.add(id, cmd);
        return { dispose };
      },
    },
    toolbar: {
      addItem(item: ToolbarItem): Disposable {
        ensure(perms, "toolbar", "toolbar.addItem");
        const dispose = toolbarRegistry.add(id, item);
        return { dispose };
      },
    },
    statusBar: {
      addItem(item: StatusBarItem): Disposable {
        ensure(perms, "statusBar", "statusBar.addItem");
        const dispose = statusBarRegistry.add(id, item);
        return { dispose };
      },
    },
    ui: {
      toast(input) {
        ensure(perms, "ui", "ui.toast");
        const opts = typeof input === "string" ? { message: input } : input;
        const kind = (typeof input === "string" ? "info" : opts.kind ?? "info");
        hostToast[kind]({ title: typeof input === "string" ? undefined : opts.title, message: opts.message });
      },
      confirm(opts) {
        ensure(perms, "ui", "ui.confirm");
        return hostConfirm(opts);
      },
    },
    workspace: {
      activeDocument() {
        ensure(perms, "workspace", "workspace.activeDocument");
        const s = useEditor.getState();
        if (!s.activeId) return null;
        const d = s.docs[s.activeId];
        if (!d) return null;
        return {
          id: d.id,
          path: d.path,
          title: d.title,
          content: d.content,
          dirty: d.dirty,
        };
      },
      onActiveDocumentChange(fn) {
        ensure(perms, "workspace", "workspace.onActiveDocumentChange");
        let lastId: string | null = null;
        const unsub = useEditor.subscribe((s) => {
          if (s.activeId === lastId) return;
          lastId = s.activeId;
          const doc = lastId ? s.docs[lastId] : null;
          fn(
            doc
              ? {
                  id: doc.id,
                  path: doc.path,
                  title: doc.title,
                  content: doc.content,
                  dirty: doc.dirty,
                }
              : null,
          );
        });
        return { dispose: unsub };
      },
    },
    themes: {
      register(theme) {
        ensure(perms, "themes", "themes.register");
        themeRegistry.register(theme);
        return { dispose: () => themeRegistry.unregister(theme.id) };
      },
    },
    markdown: perms.includes("markdown")
      ? {
          use(plugin) {
            const dispose = markdownPluginRegistry.add(id, plugin);
            return { dispose };
          },
        }
      : undefined,
    editor: perms.includes("editor")
      ? {
          addExtension(extension) {
            const dispose = editorExtensionRegistry.add(id, extension);
            return { dispose };
          },
        }
      : undefined,
  };
  return api;
}
