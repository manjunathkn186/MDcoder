import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type FsEvent =
  | { kind: "created"; path: string }
  | { kind: "modified"; path: string }
  | { kind: "deleted"; path: string }
  | { kind: "renamed"; from: string; to: string };

export async function onFsEvent(cb: (e: FsEvent) => void): Promise<UnlistenFn> {
  return listen<FsEvent>("inkstone://fs-event", (ev) => cb(ev.payload));
}
