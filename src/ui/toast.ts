import { useToasts, type ToastKind } from "@state/toast.store";

type Input = string | { title?: string; message: string; duration?: number; action?: { label: string; onClick: () => void } };

function show(kind: ToastKind, input: Input): string {
  const opts = typeof input === "string" ? { message: input } : input;
  return useToasts.getState().push({ kind, duration: opts.duration ?? 4500, ...opts });
}

/** Imperative toast API usable from anywhere (components, services, IPC). */
export const toast = {
  info: (input: Input) => show("info", input),
  success: (input: Input) => show("success", input),
  warning: (input: Input) => show("warning", input),
  danger: (input: Input) => show("danger", input),
  dismiss: (id: string) => useToasts.getState().dismiss(id),
  clear: () => useToasts.getState().clear(),
};
