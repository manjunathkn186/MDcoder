import type { Extension } from "@codemirror/state";
import type { KeyMode } from "@state/ui.store";

/**
 * Dynamic Vim / Emacs mode loader. Both packages are dynamically imported
 * so default-keymap users never pay their bundle cost.
 */
export async function loadKeybindingsMode(mode: KeyMode): Promise<Extension[]> {
  if (mode === "vim") {
    const { vim } = await import("@replit/codemirror-vim");
    return [vim()];
  }
  if (mode === "emacs") {
    const { emacs } = await import("@replit/codemirror-emacs");
    return [emacs()];
  }
  return [];
}
