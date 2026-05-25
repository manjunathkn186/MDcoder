import { invoke } from "@tauri-apps/api/core";
import type { FileEntry } from "@/types/index";

export interface WorkspaceNodeDto {
  path: string;
  name: string;
  is_dir: boolean;
  size: number;
  mtime_ms: number;
  children: WorkspaceNodeDto[];
}

export interface WorkspaceNode {
  path: string;
  name: string;
  isDir: boolean;
  size: number;
  mtimeMs: number;
  children: WorkspaceNode[];
}

function toNode(d: WorkspaceNodeDto): WorkspaceNode {
  return {
    path: d.path,
    name: d.name,
    isDir: d.is_dir,
    size: d.size,
    mtimeMs: d.mtime_ms,
    children: d.children.map(toNode),
  };
}

export const ipc = {
  ping(): Promise<string> {
    return invoke<string>("ping");
  },
  readTextFile(path: string): Promise<string> {
    return invoke<string>("read_text_file", { path });
  },
  writeTextFile(path: string, contents: string): Promise<void> {
    return invoke<void>("write_text_file", { path, contents });
  },
  createDir(path: string): Promise<void> {
    return invoke<void>("create_dir", { path });
  },
  movePath(from: string, to: string): Promise<void> {
    return invoke<void>("move_path", { from, to });
  },
  deletePath(path: string): Promise<void> {
    return invoke<void>("delete_path", { path });
  },
  openWorkspace(path: string): Promise<string> {
    return invoke<string>("open_workspace", { path });
  },
  listWorkspace(path: string): Promise<FileEntry[]> {
    return invoke<Array<{ path: string; name: string; is_dir: boolean }>>("list_workspace", {
      path,
    }).then((rows) => rows.map((r) => ({ path: r.path, name: r.name, isDir: r.is_dir })));
  },
  workspaceTree(path: string): Promise<WorkspaceNode> {
    return invoke<WorkspaceNodeDto>("workspace_tree", { path }).then(toNode);
  },
  watchWorkspace(path: string): Promise<void> {
    return invoke<void>("watch_workspace", { path });
  },
  unwatchWorkspace(path: string): Promise<void> {
    return invoke<void>("unwatch_workspace", { path });
  },
};

export type Ipc = typeof ipc;
