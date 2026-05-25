import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { useToasts, type ToastKind } from "@state/toast.store";
import { cn } from "@lib/cn";

const ICONS: Record<ToastKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
};

const KIND_STYLES: Record<ToastKind, string> = {
  info: "border-info/40 bg-info-soft text-fg",
  success: "border-success/40 bg-success-soft text-fg",
  warning: "border-warning/40 bg-warning-soft text-fg",
  danger: "border-danger/40 bg-danger-soft text-fg",
};

/**
 * Top-right toast stack. Mounted once at app root. Toasts animate in/out,
 * collapse to a max of 6, and auto-dismiss based on per-toast `duration`.
 */
export function Toaster(): JSX.Element {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  return createPortal(
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 top-4 z-toast flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            aria-live={t.kind === "danger" ? "assertive" : "polite"}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border bg-surface-elevated/90 p-3 shadow-pop backdrop-blur",
              "animate-toast-in",
              KIND_STYLES[t.kind],
            )}
          >
            <span className="mt-0.5 flex-none">
              <Icon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              {t.title && <div className="text-sm font-semibold leading-tight">{t.title}</div>}
              <div className="text-sm leading-snug text-fg/90">{t.message}</div>
              {t.action && (
                <button
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                  className="mt-1 text-xs font-medium uppercase tracking-wider text-accent hover:underline"
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="flex-none rounded p-0.5 text-muted hover:bg-surface-2 hover:text-fg"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
