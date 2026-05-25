import { type KeyBinding } from "@codemirror/view";
import { EditorSelection, type ChangeSpec } from "@codemirror/state";
import { findCommand } from "@app/commands";

function wrapSelection(marker: string): KeyBinding["run"] {
  return (view) => {
    const changes: ChangeSpec[] = [];
    const ranges = view.state.selection.ranges.map((r) => {
      if (r.empty) {
        changes.push({ from: r.from, insert: marker + marker });
        return EditorSelection.cursor(r.from + marker.length);
      }
      changes.push({ from: r.from, insert: marker });
      changes.push({ from: r.to, insert: marker });
      return EditorSelection.range(r.from + marker.length, r.to + marker.length);
    });
    view.dispatch({
      changes,
      selection: EditorSelection.create(ranges, view.state.selection.mainIndex),
      scrollIntoView: true,
    });
    return true;
  };
}

function runCommand(id: string): KeyBinding["run"] {
  return () => {
    const cmd = findCommand(id);
    if (!cmd) return false;
    void cmd.run();
    return true;
  };
}

/**
 * Editor-scoped keymap. These bindings run *inside* the editor only;
 * global app shortcuts live in `src/app/shortcuts.ts`.
 */
export const extraKeymap: KeyBinding[] = [
  { key: "Mod-b", run: wrapSelection("**"), preventDefault: true },
  { key: "Mod-i", run: wrapSelection("*"), preventDefault: true },
  { key: "Mod-`", run: wrapSelection("`"), preventDefault: true },
  { key: "Mod-s", run: runCommand("file.save"), preventDefault: true },
  { key: "Mod-Shift-p", run: runCommand("palette.open"), preventDefault: true },
  { key: "Mod-p", run: runCommand("quickOpen.open"), preventDefault: true },
];
