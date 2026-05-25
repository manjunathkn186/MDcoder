import { fs } from "./fs";
import { fileWatcher } from "./fileWatcher";
import { useWorkspaceTree } from "@state/workspaceTree.store";
import { useRecent } from "@state/recent.store";
import { indexer } from "./indexer";
import { logger } from "@lib/logger";

/**
 * Orchestrates the lifecycle of an open workspace:
 *  1. Resolve + normalize root.
 *  2. Build full tree via Rust.
 *  3. Start file watcher; cache invalidation is automatic via the watcher.
 *  4. Kick off background indexing of all markdown files.
 *  5. Persist into recent-workspaces list.
 */
class WorkspaceManager {
  async open(path: string): Promise<void> {
    try {
      const tree = await fs.tree(path);
      useWorkspaceTree.getState().setTree(tree);
      useRecent.getState().pushWorkspace(tree.path);
      await fileWatcher.start(tree.path);
      void indexer.indexWorkspace(tree);
    } catch (err) {
      logger.error("[workspace] open failed", err);
      throw err;
    }
  }

  async refresh(): Promise<void> {
    const root = useWorkspaceTree.getState().root;
    if (!root) return;
    const tree = await fs.tree(root.path);
    useWorkspaceTree.getState().setTree(tree);
    void indexer.indexWorkspace(tree);
  }

  async close(): Promise<void> {
    await fileWatcher.stop();
    useWorkspaceTree.getState().clear();
    indexer.clear();
  }
}

export const workspaceManager = new WorkspaceManager();
