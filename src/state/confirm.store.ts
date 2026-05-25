import { create } from "zustand";

export interface ConfirmRequest {
  id: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  resolve: (value: boolean) => void;
}

export interface ConfirmState {
  request: ConfirmRequest | null;
  open: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
  }) => Promise<boolean>;
  resolve: (value: boolean) => void;
}

export const useConfirm = create<ConfirmState>((set, get) => ({
  request: null,
  open: ({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", destructive = false }) =>
    new Promise<boolean>((resolve) => {
      set({
        request: {
          id: Math.random().toString(36).slice(2),
          title,
          message,
          confirmLabel,
          cancelLabel,
          destructive,
          resolve,
        },
      });
    }),
  resolve: (value) => {
    const r = get().request;
    if (!r) return;
    r.resolve(value);
    set({ request: null });
  },
}));

/** Imperative confirm — usage: `await confirm({ title, message })`. */
export const confirm = useConfirm.getState().open;
