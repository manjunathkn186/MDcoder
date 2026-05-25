import { memo, useState, type DragEvent } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Star } from "lucide-react";
import type { WorkspaceNode } from "@ipc/client";
import { useWorkspaceTree } from "@state/workspaceTree.store";
import { useEditor } from "@state/editor.store";
import { useFavorites } from "@state/favorites.store";
import { fileCache } from "@/services/cache";
import { fs, basename, isMarkdown } from "@/services/fs";
import { workspaceManager } from "@/services/workspaceManager";
import { useRecent } from "@state/recent.store";
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { cn } from "@lib/cn";

interface Props {
  node: WorkspaceNode;
  depth: number;
}

/**
 * Heavy component — memoized so a sibling re-render doesn't restyle the
 * whole subtree. Equality is by reference; the workspace tree is
 * rebuilt as a fresh object only on file-system mutations.
 */
export const TreeNode = memo(TreeNodeImpl, (a, b) => a.node === b.node && a.depth === b.depth);

function TreeNodeImpl({ node, depth }: Props): JSX.Element {
  const expanded = useWorkspaceTree((s) => s.expanded.has(node.path));
  const selected = useWorkspaceTree((s) => s.selected === node.path);
  const toggle = useWorkspaceTree((s) => s.toggle);
  const select = useWorkspaceTree((s) => s.select);
  const isFav = useFavorites((s) => s.paths.includes(node.path));
  const toggleFav = useFavorites((s) => s.toggle);

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const onActivate = async () => {
    select(node.path);
    if (node.isDir) {
      toggle(node.path);
      return;
    }
    if (!isMarkdown(node.path)) return;
    try {
      const content = await fileCache.read(node.path, node.mtimeMs);
      useEditor.getState().openDoc({
        id: node.path,
        path: node.path,
        title: node.name,
        content,
      });
      useRecent.getState().pushFile(node.path);
    } catch {
      /* ignored */
    }
  };

  const buildMenu = (): MenuItem[] => [
    ...(node.isDir
      ? [
          {
            label: "New file…",
            onClick: async () => {
              const name = prompt("File name", "untitled.md");
              if (!name) return;
              const target = `${node.path}/${name}`;
              await fs.writeText(target, "");
              await workspaceManager.refresh();
            },
          },
          {
            label: "New folder…",
            onClick: async () => {
              const name = prompt("Folder name", "new-folder");
              if (!name) return;
              await fs.createDir(`${node.path}/${name}`);
              await workspaceManager.refresh();
            },
          },
        ]
      : [
          {
            label: "Open",
            onClick: onActivate,
          },
          {
            label: isFav ? "Remove from favorites" : "Add to favorites",
            onClick: () => toggleFav(node.path),
          },
        ]),
    {
      label: "Rename…",
      separatorBefore: true,
      onClick: async () => {
        const name = prompt("Rename to", node.name);
        if (!name || name === node.name) return;
        const target = node.path.replace(/[^/\\]+$/, name);
        await fs.rename(node.path, target);
        await workspaceManager.refresh();
      },
    },
    {
      label: "Delete",
      danger: true,
      onClick: async () => {
        if (!confirm(`Delete ${node.name}?`)) return;
        await fs.remove(node.path);
        await workspaceManager.refresh();
      },
    },
  ];

  const onDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/x-inkstone-path", node.path);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!node.isDir) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);
  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (!node.isDir) return;
    const from = e.dataTransfer.getData("text/x-inkstone-path");
    if (!from || from === node.path) return;
    const target = `${node.path}/${basename(from)}`;
    if (target === from) return;
    try {
      await fs.rename(from, target);
      await workspaceManager.refresh();
    } catch {
      /* ignored */
    }
  };

  return (
    <>
      <div
        role="treeitem"
        aria-expanded={node.isDir ? expanded : undefined}
        aria-selected={selected}
        tabIndex={0}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onActivate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            void onActivate();
          } else if (e.key === "ArrowRight" && node.isDir && !expanded) {
            toggle(node.path);
          } else if (e.key === "ArrowLeft" && node.isDir && expanded) {
            toggle(node.path);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        className={cn(
          "flex cursor-pointer items-center gap-1 px-2 py-0.5 text-sm hover:bg-surface-2",
          selected && "bg-surface-2",
          dragOver && "ring-1 ring-accent ring-inset",
        )}
        style={{ paddingLeft: 8 + depth * 12 }}
        title={node.path}
      >
        <span className="flex h-4 w-4 items-center justify-center">
          {node.isDir ? (
            expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : null}
        </span>
        {node.isDir ? (
          expanded ? <FolderOpen size={14} /> : <Folder size={14} />
        ) : (
          <FileText size={14} />
        )}
        <span className="truncate">{node.name}</span>
        {isFav && !node.isDir && <Star size={10} className="ml-auto fill-current opacity-70" />}
      </div>
      {node.isDir && expanded && (
        <div role="group">
          {node.children.map((c) => (
            <TreeNode key={c.path} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={buildMenu()} onClose={() => setMenu(null)} />}
    </>
  );
}
