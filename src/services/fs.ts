import { ipc, type WorkspaceNode } from "@ipc/client";

/**
 * Thin FS facade. Centralizes path manipulation, basename/dirname/relative
 * computations, and forwards IO to typed Tauri commands.
 */
export const fs = {
  readText: ipc.readTextFile,
  writeText: ipc.writeTextFile,
  createDir: ipc.createDir,
  rename: ipc.movePath,
  remove: ipc.deletePath,
  tree: ipc.workspaceTree,
  watch: ipc.watchWorkspace,
  unwatch: ipc.unwatchWorkspace,
};

export function basename(p: string): string {
  const i = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return i < 0 ? p : p.slice(i + 1);
}
export function dirname(p: string): string {
  const i = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return i < 0 ? "" : p.slice(0, i);
}
export function extname(p: string): string {
  const base = basename(p);
  const i = base.lastIndexOf(".");
  return i <= 0 ? "" : base.slice(i);
}
export function joinPath(a: string, b: string): string {
  if (!a) return b;
  if (a.endsWith("/") || a.endsWith("\\")) return a + b;
  const sep = a.includes("\\") ? "\\" : "/";
  return a + sep + b;
}
export function relativeTo(root: string, p: string): string {
  if (!root) return p;
  if (p.startsWith(root)) return p.slice(root.length).replace(/^[/\\]+/, "");
  return p;
}

export function isMarkdown(path: string): boolean {
  return /\.(md|mdx|markdown)$/i.test(path);
}

export function walkNodes(node: WorkspaceNode, cb: (n: WorkspaceNode) => void): void {
  cb(node);
  if (node.isDir) for (const c of node.children) walkNodes(c, cb);
}

export function flattenFiles(root: WorkspaceNode): WorkspaceNode[] {
  const out: WorkspaceNode[] = [];
  walkNodes(root, (n) => {
    if (!n.isDir) out.push(n);
  });
  return out;
}
