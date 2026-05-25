import { Star, X } from "lucide-react";
import { useFavorites } from "@state/favorites.store";
import { useEditor } from "@state/editor.store";
import { fileCache } from "@/services/cache";
import { basename } from "@/services/fs";

export function FavoritesView(): JSX.Element {
  const paths = useFavorites((s) => s.paths);
  const remove = useFavorites((s) => s.remove);

  const openFile = async (p: string) => {
    try {
      const content = await fileCache.read(p);
      useEditor.getState().openDoc({ id: p, path: p, title: basename(p), content });
    } catch {
      /* ignored */
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted">
        Favorites
      </div>
      {paths.length === 0 ? (
        <div className="p-4 text-sm text-muted">
          Right-click a file in the explorer and choose <em>Add to favorites</em>.
        </div>
      ) : (
        <ul className="ink-scroll flex-1 overflow-y-auto p-1">
          {paths.map((p) => (
            <li
              key={p}
              className="group flex items-center gap-2 rounded px-3 py-1.5 text-sm hover:bg-surface-2"
            >
              <Star size={12} className="flex-none opacity-70" />
              <button onClick={() => openFile(p)} className="flex-1 truncate text-left">
                {basename(p)}
              </button>
              <button
                onClick={() => remove(p)}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove favorite"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
