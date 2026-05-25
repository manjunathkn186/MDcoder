import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { FolderOpen, RefreshCw } from "lucide-react";
import { useWorkspaceTree } from "@state/workspaceTree.store";
import { workspaceManager } from "@/services/workspaceManager";
import { Button } from "@ui/Button";
import { Icon } from "@ui/Icon";
import { TreeNode } from "./TreeNode";
import { logger } from "@lib/logger";

export function FileTree(): JSX.Element {
  const root = useWorkspaceTree((s) => s.root);

  const pickFolder = async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (typeof selected === "string") await workspaceManager.open(selected);
    } catch (err) {
      logger.error("[explorer] open failed", err);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="truncate text-xs font-semibold uppercase tracking-wider text-muted">
          {root ? root.name : "Workspace"}
        </span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => workspaceManager.refresh()} aria-label="Refresh">
            <Icon icon={RefreshCw} />
          </Button>
          <Button size="sm" variant="ghost" onClick={pickFolder} aria-label="Open folder">
            <Icon icon={FolderOpen} />
          </Button>
        </div>
      </div>
      {!root ? (
        <div className="p-4 text-sm text-muted">No folder open. Click the folder icon.</div>
      ) : (
        <div className="ink-scroll flex-1 overflow-y-auto" role="tree" aria-label="File tree">
          {root.children.map((c) => (
            <TreeNode key={c.path} node={c} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}
