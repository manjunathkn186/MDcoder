import { useEffect, useRef, type PropsWithChildren } from "react";
import { createPortal } from "react-dom";
import { cn } from "@lib/cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  className?: string;
  initialFocusSelector?: string;
}

/**
 * Headless modal dialog with focus-trap + Escape-to-close.
 * Renders into document.body via React portal.
 */
export function Dialog({
  open,
  onClose,
  ariaLabel,
  className,
  children,
  initialFocusSelector,
}: PropsWithChildren<DialogProps>): JSX.Element | null {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab" && ref.current) {
        const focusables = ref.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    queueMicrotask(() => {
      const target = initialFocusSelector
        ? ref.current?.querySelector<HTMLElement>(initialFocusSelector)
        : ref.current?.querySelector<HTMLElement>("input,textarea,button");
      target?.focus();
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose, initialFocusSelector]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={cn(
          "mt-[15vh] w-full max-w-xl rounded-lg border border-border bg-surface shadow-2xl",
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
