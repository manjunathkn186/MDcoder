/**
 * Wire protocol between the host (main thread) and a sandboxed plugin
 * (iframe). All traffic is JSON-serializable.
 *
 *   Host    ──▶ "init"                ──▶ Plugin
 *   Plugin  ──▶ "ready"                ──▶ Host
 *   Plugin  ──▶ "call"   (op, args)    ──▶ Host
 *   Host    ──▶ "ack"    (callId, ok)  ──▶ Plugin
 *   Host    ──▶ "event"  (name, data)  ──▶ Plugin    (workspace changes etc.)
 *   Plugin  ──▶ "invoke" (subscription, args) — handler triggered (commands etc.)
 *
 * The host *never* exposes raw DOM, IPC, or file-system handles. Only
 * declared, JSON-safe operations are permitted.
 */
export type HostOp =
  | "commands.register"
  | "commands.unregister"
  | "toolbar.add"
  | "toolbar.remove"
  | "statusBar.add"
  | "statusBar.remove"
  | "themes.register"
  | "themes.unregister"
  | "ui.toast"
  | "ui.confirm"
  | "workspace.activeDocument"
  | "workspace.subscribe"
  | "workspace.unsubscribe"
  | "log";

export interface HostCallMsg {
  kind: "call";
  callId: number;
  op: HostOp;
  args: unknown;
}

export interface HostAckMsg {
  kind: "ack";
  callId: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export type HostEvent =
  | { type: "active-document-changed"; doc: unknown }
  | { type: "command-invoked"; subscription: string }
  | { type: "toolbar-clicked"; subscription: string }
  | { type: "status-clicked"; subscription: string };

export interface HostEventMsg {
  kind: "event";
  event: HostEvent;
}

export interface InitMsg {
  kind: "init";
  pluginId: string;
  permissions: string[];
  version: string;
}
export interface ReadyMsg {
  kind: "ready";
}

export type AnyMsg = HostCallMsg | HostAckMsg | HostEventMsg | InitMsg | ReadyMsg;

export const BRIDGE_ORIGIN = "inkstone-plugin";
