import { type ReactNode } from "react";
import { Dialog } from "./Dialog";
import { X } from "lucide-react";
import { cn } from "@lib/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Defaults to "lg" (max-w-xl). */
  size?: "sm" | "md" | "lg" | "xl";
  /** Hide the chrome (header/footer) and render only `children`. */
  bare?: boolean;
  ariaLabel?: string;
}

const SIZE: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-xl",
  xl: "max-w-3xl",
};

/**
 * High-level modal built on top of `Dialog`. Provides a title bar with a
 * close button, optional description, scrollable body, and footer slot.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  className,
  size = "lg",
  bare = false,
  ariaLabel,
}: ModalProps): JSX.Element {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      ariaLabel={ariaLabel ?? (typeof title === "string" ? title : "Modal")}
      className={cn("animate-pop", SIZE[size], className)}
    >
      {bare ? (
        children
      ) : (
        <div className="flex max-h-[80vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              {title && <h2 className="truncate text-lg font-semibold text-fg-strong">{title}</h2>}
              {description && (
                <p className="mt-1 text-sm text-muted">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 -mt-1 rounded p-1 text-muted hover:bg-surface-2 hover:text-fg"
            >
              <X size={16} />
            </button>
          </header>
          <div className="ink-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="flex items-center justify-end gap-2 border-t border-border bg-bg-soft px-5 py-3">
              {footer}
            </footer>
          )}
        </div>
      )}
    </Dialog>
  );
}
