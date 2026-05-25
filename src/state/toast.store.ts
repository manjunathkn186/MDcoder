import { create } from "zustand";

export type ToastKind = "info" | "success" | "warning" | "danger";

export interface Toast {
  id: string;
  kind: ToastKind;
  title?: string;
  message: string;
  action?: { label: string; onClick: () => void };
  /** Auto-dismiss in ms. `0` keeps it sticky. Default 4500. */
  duration: number;
  createdAt: number;
}

export interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id" | "createdAt"> & { id?: string }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

/**
 * Phase 11 (review): the auto-dismiss timer is tracked outside the store
 * and cleared eagerly on manual dismiss / clear, so we no longer leak
 * setTimeout handles past their useful life.
 */
const timers = new Map<string, number>();
function clearTimer(id: string): void {
  const t = timers.get(id);
  if (t !== undefined) {
    window.clearTimeout(t);
    timers.delete(id);
  }
}

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = t.id ?? `t_${Math.random().toString(36).slice(2, 10)}`;
    const toast: Toast = {
      id,
      kind: t.kind,
      title: t.title,
      message: t.message,
      action: t.action,
      duration: t.duration ?? 4500,
      createdAt: Date.now(),
    };
    clearTimer(id); // replacing a previous toast of the same id
    set((s) => ({ toasts: [...s.toasts.filter((x) => x.id !== id), toast].slice(-6) }));
    if (toast.duration > 0) {
      const handle = window.setTimeout(() => {
        timers.delete(id);
        if (get().toasts.some((x) => x.id === id)) get().dismiss(id);
      }, toast.duration);
      timers.set(id, handle);
    }
    return id;
  },
  dismiss: (id) => {
    clearTimer(id);
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
  clear: () => {
    for (const id of timers.keys()) clearTimer(id);
    set({ toasts: [] });
  },
}));
