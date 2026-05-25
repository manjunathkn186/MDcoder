import type { PluginManifest } from "@/plugins/sdk/manifest";
import type {
  AnyMsg,
  HostCallMsg,
  HostEvent,
  HostEventMsg,
  HostAckMsg,
  InitMsg,
} from "./bridge";
import {
  commandRegistry,
  toolbarRegistry,
  statusBarRegistry,
  clearOwnerEverywhere,
} from "./extensionPoints";
import type { PluginCommand, StatusBarItem, ToolbarItem } from "@/plugins/sdk/api";
import { themeRegistry } from "@themes/registry";
import { parseTheme } from "@themes/sdk";
import { toast as hostToast } from "@ui/toast";
import { confirm as hostConfirm } from "@state/confirm.store";
import { useEditor } from "@state/editor.store";
import { logger } from "@lib/logger";

interface SandboxedHandle {
  iframe: HTMLIFrameElement;
  pendingCalls: Map<number, (msg: HostAckMsg) => void>;
  subscriptions: Map<string, () => void>; // local cleanup keyed by sub-id
  destroy(): void;
}

/**
 * Loads untrusted plugin code in a heavily-sandboxed iframe.
 *
 *   sandbox="allow-scripts" only — no same-origin, no top navigation,
 *   no popups, no forms, no modals. The plugin can compute and message
 *   the host but has no direct access to the DOM, IPC, fs, or globals.
 *
 * The plugin sees a tiny remote-proxy SDK injected as `window.inkstone`,
 * with the same shape as the in-process `InkstoneAPI`.
 */
export class SandboxRunner {
  private handles = new Map<string, SandboxedHandle>();

  async activate(manifest: PluginManifest, source: string): Promise<void> {
    if (this.handles.has(manifest.id)) return;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.display = "none";

    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>${PLUGIN_BOOTSTRAP}\n;(function(){\n${source}\n})()</script></body></html>`;
    iframe.srcdoc = html;
    document.body.appendChild(iframe);

    const handle: SandboxedHandle = {
      iframe,
      pendingCalls: new Map(),
      subscriptions: new Map(),
      destroy: () => {
        for (const dispose of handle.subscriptions.values()) dispose();
        handle.subscriptions.clear();
        handle.pendingCalls.clear();
        iframe.remove();
      },
    };
    this.handles.set(manifest.id, handle);

    const onMessage = (ev: MessageEvent) => {
      if (ev.source !== iframe.contentWindow) return;
      const msg = ev.data as AnyMsg | undefined;
      if (!msg || typeof msg !== "object") return;
      if (msg.kind === "ready") {
        // Plugin has set up its globals; nothing else required.
        return;
      }
      if (msg.kind === "call") this.handleCall(manifest, handle, msg).catch((err) => logger.warn(err));
    };
    window.addEventListener("message", onMessage);
    const original = handle.destroy;
    handle.destroy = () => {
      window.removeEventListener("message", onMessage);
      original();
    };

    // Wait for the iframe to be ready, then send init.
    await new Promise<void>((resolve) => {
      iframe.addEventListener(
        "load",
        () => {
          const init: InitMsg = {
            kind: "init",
            pluginId: manifest.id,
            permissions: manifest.permissions,
            version: manifest.version,
          };
          iframe.contentWindow?.postMessage(init, "*");
          resolve();
        },
        { once: true },
      );
    });
  }

  async deactivate(pluginId: string): Promise<void> {
    const handle = this.handles.get(pluginId);
    if (!handle) return;
    handle.destroy();
    this.handles.delete(pluginId);
    clearOwnerEverywhere(pluginId);
  }

  private send(iframe: HTMLIFrameElement, msg: HostEventMsg | HostAckMsg): void {
    iframe.contentWindow?.postMessage(msg, "*");
  }

  private async handleCall(
    manifest: PluginManifest,
    handle: SandboxedHandle,
    msg: HostCallMsg,
  ): Promise<void> {
    const perms = manifest.permissions;
    const ok = (result?: unknown): HostAckMsg => ({
      kind: "ack",
      callId: msg.callId,
      ok: true,
      result,
    });
    const err = (e: string): HostAckMsg => ({
      kind: "ack",
      callId: msg.callId,
      ok: false,
      error: e,
    });

    try {
      switch (msg.op) {
        case "commands.register": {
          require(perms, "commands");
          const args = msg.args as { id: string; title: string; shortcut?: string; sub: string };
          const cmd: PluginCommand = {
            id: args.id,
            title: args.title,
            shortcut: args.shortcut,
            run: () => {
              this.send(handle.iframe, this.event({ type: "command-invoked", subscription: args.sub }));
            },
          };
          const dispose = commandRegistry.add(manifest.id, cmd);
          handle.subscriptions.set(args.sub, dispose);
          this.send(handle.iframe, ok());
          return;
        }
        case "commands.unregister": {
          const args = msg.args as { sub: string };
          handle.subscriptions.get(args.sub)?.();
          handle.subscriptions.delete(args.sub);
          this.send(handle.iframe, ok());
          return;
        }
        case "toolbar.add": {
          require(perms, "toolbar");
          const args = msg.args as ToolbarItem & { sub: string };
          const item: ToolbarItem = {
            id: args.id,
            title: args.title,
            icon: args.icon,
            priority: args.priority,
            onClick: () => {
              this.send(handle.iframe, this.event({ type: "toolbar-clicked", subscription: args.sub }));
            },
          };
          const dispose = toolbarRegistry.add(manifest.id, item);
          handle.subscriptions.set(args.sub, dispose);
          this.send(handle.iframe, ok());
          return;
        }
        case "toolbar.remove": {
          const args = msg.args as { sub: string };
          handle.subscriptions.get(args.sub)?.();
          handle.subscriptions.delete(args.sub);
          this.send(handle.iframe, ok());
          return;
        }
        case "statusBar.add": {
          require(perms, "statusBar");
          const args = msg.args as StatusBarItem & { sub: string };
          const item: StatusBarItem = {
            id: args.id,
            text: args.text,
            tooltip: args.tooltip,
            align: args.align,
            priority: args.priority,
            onClick: () => {
              this.send(handle.iframe, this.event({ type: "status-clicked", subscription: args.sub }));
            },
          };
          const dispose = statusBarRegistry.add(manifest.id, item);
          handle.subscriptions.set(args.sub, dispose);
          this.send(handle.iframe, ok());
          return;
        }
        case "statusBar.remove": {
          const args = msg.args as { sub: string };
          handle.subscriptions.get(args.sub)?.();
          handle.subscriptions.delete(args.sub);
          this.send(handle.iframe, ok());
          return;
        }
        case "themes.register": {
          require(perms, "themes");
          const theme = parseTheme(msg.args);
          themeRegistry.register(theme);
          this.send(handle.iframe, ok({ id: theme.id }));
          return;
        }
        case "themes.unregister": {
          const args = msg.args as { id: string };
          themeRegistry.unregister(args.id);
          this.send(handle.iframe, ok());
          return;
        }
        case "ui.toast": {
          require(perms, "ui");
          const args = msg.args as { title?: string; message: string; kind?: "info" | "success" | "warning" | "danger" };
          hostToast[args.kind ?? "info"]({ title: args.title, message: args.message });
          this.send(handle.iframe, ok());
          return;
        }
        case "ui.confirm": {
          require(perms, "ui");
          const result = await hostConfirm(msg.args as Parameters<typeof hostConfirm>[0]);
          this.send(handle.iframe, ok(result));
          return;
        }
        case "workspace.activeDocument": {
          require(perms, "workspace");
          const s = useEditor.getState();
          const d = s.activeId ? s.docs[s.activeId] : null;
          this.send(
            handle.iframe,
            ok(
              d ? { id: d.id, path: d.path, title: d.title, content: d.content, dirty: d.dirty } : null,
            ),
          );
          return;
        }
        case "workspace.subscribe": {
          require(perms, "workspace");
          const args = msg.args as { sub: string };
          let lastId: string | null = null;
          const unsub = useEditor.subscribe((s) => {
            if (s.activeId === lastId) return;
            lastId = s.activeId;
            const d = lastId ? s.docs[lastId] : null;
            this.send(handle.iframe, this.event({
              type: "active-document-changed",
              doc: d ? { id: d.id, path: d.path, title: d.title, content: d.content, dirty: d.dirty } : null,
            }));
          });
          handle.subscriptions.set(args.sub, unsub);
          this.send(handle.iframe, ok());
          return;
        }
        case "workspace.unsubscribe": {
          const args = msg.args as { sub: string };
          handle.subscriptions.get(args.sub)?.();
          handle.subscriptions.delete(args.sub);
          this.send(handle.iframe, ok());
          return;
        }
        case "log": {
          const args = msg.args as { level: "info" | "warn" | "error" | "debug"; msg: string };
          logger[args.level === "debug" ? "debug" : args.level](`[plugin/${manifest.id}] ${args.msg}`);
          this.send(handle.iframe, ok());
          return;
        }
        default:
          this.send(handle.iframe, err(`Unknown op: ${msg.op as string}`));
      }
    } catch (e) {
      this.send(handle.iframe, err(e instanceof Error ? e.message : String(e)));
    }
  }

  private event(e: HostEvent): HostEventMsg {
    return { kind: "event", event: e };
  }
}

function require(perms: string[], perm: string): void {
  if (!perms.includes(perm)) throw new Error(`Permission denied: ${perm}`);
}

/** Boilerplate injected before every sandboxed plugin's source. Provides
 *  the `window.inkstone` proxy that mirrors the in-process API. */
const PLUGIN_BOOTSTRAP = `
(function(){
  const pending = new Map();
  let callId = 0;
  let subId = 0;
  const listeners = new Map(); // sub -> handler
  let pluginId = "?";
  let permissions = [];

  function send(op, args) {
    const id = ++callId;
    return new Promise(function(resolve, reject){
      pending.set(id, function(msg){ msg.ok ? resolve(msg.result) : reject(new Error(msg.error)); });
      parent.postMessage({ kind: "call", callId: id, op: op, args: args }, "*");
    });
  }
  function on(handler){
    const sub = "s"+(++subId);
    listeners.set(sub, handler);
    return sub;
  }
  function off(sub){ listeners.delete(sub); }

  window.addEventListener("message", function(ev){
    const msg = ev.data;
    if (!msg) return;
    if (msg.kind === "ack") {
      const cb = pending.get(msg.callId);
      pending.delete(msg.callId);
      if (cb) cb(msg);
    } else if (msg.kind === "event") {
      const e = msg.event;
      const cb = listeners.get(e.subscription);
      if (cb) cb(e);
      if (e.type === "active-document-changed") {
        for (const fn of activeDocSubs) fn(e.doc);
      }
    } else if (msg.kind === "init") {
      pluginId = msg.pluginId;
      permissions = msg.permissions;
      bootstrap();
    }
  });

  const activeDocSubs = new Set();

  function api(){
    return {
      version: "0.1.0",
      get pluginId(){ return pluginId; },
      log: function(level, m){ send("log", { level: level, msg: String(m) }); },
      commands: {
        register: function(cmd){
          const sub = on(function(){ return cmd.run(); });
          send("commands.register", { id: cmd.id, title: cmd.title, shortcut: cmd.shortcut, sub: sub });
          return { dispose: function(){ send("commands.unregister", { sub: sub }); off(sub); } };
        }
      },
      toolbar: {
        addItem: function(item){
          const sub = on(function(){ return item.onClick(); });
          send("toolbar.add", { id: item.id, title: item.title, icon: item.icon, priority: item.priority, sub: sub });
          return { dispose: function(){ send("toolbar.remove", { sub: sub }); off(sub); } };
        }
      },
      statusBar: {
        addItem: function(item){
          const sub = on(function(){ return item.onClick && item.onClick(); });
          send("statusBar.add", Object.assign({}, item, { sub: sub }));
          return { dispose: function(){ send("statusBar.remove", { sub: sub }); off(sub); } };
        }
      },
      themes: {
        register: function(theme){
          send("themes.register", theme);
          return { dispose: function(){ send("themes.unregister", { id: theme.id }); } };
        }
      },
      ui: {
        toast: function(input){
          const o = typeof input === "string" ? { message: input } : input;
          send("ui.toast", o);
        },
        confirm: function(opts){ return send("ui.confirm", opts); }
      },
      workspace: {
        activeDocument: function(){ return send("workspace.activeDocument", {}); },
        onActiveDocumentChange: function(fn){
          activeDocSubs.add(fn);
          const sub = on(function(){ /* covered by activeDocSubs */ });
          send("workspace.subscribe", { sub: sub });
          return { dispose: function(){ send("workspace.unsubscribe", { sub: sub }); off(sub); activeDocSubs.delete(fn); } };
        }
      }
    };
  }

  function bootstrap(){
    window.inkstone = api();
    parent.postMessage({ kind: "ready" }, "*");
    if (typeof window.activate === "function") {
      try { window.activate(window.inkstone); } catch (e) { window.inkstone.log("error", String(e)); }
    }
  }
})();
`;

export const sandboxRunner = new SandboxRunner();
