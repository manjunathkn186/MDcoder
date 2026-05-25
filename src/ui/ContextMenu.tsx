import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@lib/cn";

export interface MenuItem {
  label: string;
  onClick?: () => void | Promise<void>;
  /** Sub-items for a nested menu (rendered inline as a flyout). */
  items?: MenuItem[];
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
  icon?: ReactNode;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

/**
 * Generic context menu rendered into a portal. Supports keyboard navigation
 * (arrow keys + Enter + Escape), separators, danger styling, shortcut hints,
 * and viewport-edge clamping.
 */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x, y });
  const [active, setActive] = useState<number>(firstFocusable(items));

  // Edge-clamp so the menu always stays inside the viewport.
  useLayoutEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let nx = x;
    let ny = y;
    if (nx + r.width + 8 > vw) nx = Math.max(8, vw - r.width - 8);
    if (ny + r.height + 8 > vh) ny = Math.max(8, vh - r.height - 8);
    setPos({ x: nx, y: ny });
  }, [x, y, items]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => nextFocusable(items, i, +1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => nextFocusable(items, i, -1));
      } else if (e.key === "Enter") {
        const it = items[active];
        if (it && !it.disabled && it.onClick) {
          onClose();
          void it.onClick();
        }
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, items, active]);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      className="fixed z-popover min-w-[200px] origin-top-left animate-pop overflow-hidden rounded-lg border border-border bg-surface-elevated p-1 text-sm shadow-pop"
      style={{ left: pos.x, top: pos.y }}
    >
      {items.map((it, i) => (
        <div key={i}>
          {it.separatorBefore && <div className="my-1 h-px bg-border" />}
          <button
            role="menuitem"
            disabled={it.disabled}
            onMouseEnter={() => !it.disabled && setActive(i)}
            onClick={() => {
              onClose();
              void it.onClick?.();
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-50",
              it.danger
                ? "text-danger hover:bg-danger-soft"
                : active === i
                  ? "bg-accent-soft text-fg"
                  : "hover:bg-surface-2",
            )}
          >
            {it.icon && <span className="flex-none text-muted">{it.icon}</span>}
            <span className="flex-1 truncate">{it.label}</span>
            {it.shortcut && (
              <kbd className="ml-3 text-[10px] tracking-wider text-muted">{it.shortcut}</kbd>
            )}
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}

function firstFocusable(items: MenuItem[]): number {
  return items.findIndex((it) => !it.disabled);
}
function nextFocusable(items: MenuItem[], from: number, dir: 1 | -1): number {
  const n = items.length;
  if (n === 0) return -1;
  let i = from;
  for (let step = 0; step < n; step++) {
    i = (i + dir + n) % n;
    if (!items[i].disabled) return i;
  }
  return from;
}
