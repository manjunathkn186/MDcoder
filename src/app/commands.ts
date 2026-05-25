import { useUi } from "@state/ui.store";
import { useSettings } from "@state/settings.store";
import { useEditor } from "@state/editor.store";
import { useExportUi } from "@state/export.store";
import { commandRegistry } from "@/plugins/runtime/extensionPoints";
import { buildContext, runPrint } from "@/services/export/engine";
import { parseFrontmatter } from "@/markdown/frontmatter";
import { basename } from "@/services/fs";
import { autosave } from "@features/editor/services/autosave";
import { sessionService } from "@features/editor/services/session";
import { editorRegistry } from "@features/editor/extensions/editorRegistry";

export interface Command {
  id: string;
  title: string;
  shortcut?: string;
  run: () => void | Promise<void>;
}

export const commands: Command[] = [
  // Palettes
  {
    id: "palette.open",
    title: "Command Palette",
    shortcut: "Mod+Shift+P",
    run: () => useUi.getState().setPaletteOpen(true),
  },
  {
    id: "quickOpen.open",
    title: "Go to File…",
    shortcut: "Mod+P",
    run: () => useUi.getState().setQuickOpenOpen(true),
  },

  // View
  {
    id: "view.toggleSidebar",
    title: "View: Toggle Sidebar",
    shortcut: "Mod+B",
    run: () => useUi.getState().toggleSidebar(),
  },
  {
    id: "view.toggleOutline",
    title: "View: Toggle Outline",
    shortcut: "Mod+Shift+O",
    run: () => useUi.getState().toggleOutline(),
  },
  {
    id: "view.toggleMinimap",
    title: "View: Toggle Minimap",
    run: () => useUi.getState().toggleMinimap(),
  },
  {
    id: "view.cycleMode",
    title: "View: Cycle Edit / Split / Preview",
    shortcut: "Mod+\\",
    run: () => {
      const cur = useUi.getState().viewMode;
      const next = cur === "edit" ? "split" : cur === "split" ? "preview" : "edit";
      useUi.getState().setViewMode(next);
    },
  },
  {
    id: "view.fullscreen",
    title: "View: Toggle Fullscreen",
    shortcut: "F11",
    run: () => {
      useUi.getState().toggleFullscreen();
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    },
  },
  {
    id: "view.distractionFree",
    title: "View: Toggle Distraction-Free",
    shortcut: "Mod+Shift+D",
    run: () => useUi.getState().toggleDistractionFree(),
  },

  // Theme
  {
    id: "theme.toggle",
    title: "Theme: Toggle Light / Dark",
    shortcut: "Mod+Shift+L",
    run: () => {
      const cur = useSettings.getState().themeMode;
      const next = cur === "dark" ? "light" : cur === "light" ? "system" : "dark";
      useSettings.getState().setThemeMode(next);
    },
  },

  // Keybindings
  {
    id: "keys.default",
    title: "Keymap: Default",
    run: () => useUi.getState().setKeyMode("default"),
  },
  {
    id: "keys.vim",
    title: "Keymap: Vim",
    run: () => useUi.getState().setKeyMode("vim"),
  },
  {
    id: "keys.emacs",
    title: "Keymap: Emacs",
    run: () => useUi.getState().setKeyMode("emacs"),
  },

  // File / editor
  {
    id: "file.save",
    title: "File: Save",
    shortcut: "Mod+S",
    run: async () => {
      const id = useEditor.getState().activeId;
      if (id) await autosave.flush(id);
    },
  },
  {
    id: "file.saveAll",
    title: "File: Save All",
    shortcut: "Mod+Alt+S",
    run: () => autosave.flushAll(),
  },
  {
    id: "file.newDoc",
    title: "File: New Document",
    shortcut: "Mod+N",
    run: () => {
      useEditor.getState().openDoc({
        id: crypto.randomUUID(),
        path: null,
        title: "Untitled.md",
        content: "",
      });
    },
  },
  {
    id: "file.closeTab",
    title: "File: Close Tab",
    shortcut: "Mod+W",
    run: () => {
      const id = useEditor.getState().activeId;
      if (id) useEditor.getState().closeDoc(id);
    },
  },

  // Search. In the editor, CodeMirror's own searchKeymap handles Mod+F.
  // When the editor isn't focused (preview-only / preview pane), we open
  // the in-preview find panel via the UI store.
  {
    id: "edit.find",
    title: "Edit: Find in document",
    shortcut: "Mod+F",
    run: () => {
      const view = editorRegistry.active();
      const inEditor =
        view && view.dom.contains(document.activeElement as Node | null);
      if (inEditor) {
        // CodeMirror's searchKeymap handles this natively when focused.
        view.focus();
        return;
      }
      useUi.getState().setFindOpen(true);
    },
  },

  // Zoom
  {
    id: "view.zoomIn",
    title: "View: Zoom In",
    shortcut: "Mod+=",
    run: () => useUi.getState().zoomIn(),
  },
  {
    id: "view.zoomInAlt",
    title: "View: Zoom In (Shift)",
    shortcut: "Mod+Shift+=",
    run: () => useUi.getState().zoomIn(),
  },
  {
    id: "view.zoomOut",
    title: "View: Zoom Out",
    shortcut: "Mod+-",
    run: () => useUi.getState().zoomOut(),
  },
  {
    id: "view.zoomReset",
    title: "View: Reset Zoom",
    shortcut: "Mod+0",
    run: () => useUi.getState().resetZoom(),
  },

  // Export & print
  {
    id: "file.export",
    title: "File: Export…",
    shortcut: "Mod+E",
    run: () => useExportUi.getState().openDialog(),
  },
  {
    id: "file.print",
    title: "File: Print",
    shortcut: "Mod+Alt+P",
    run: async () => {
      const id = useEditor.getState().activeId;
      if (!id) return;
      const doc = useEditor.getState().docs[id];
      if (!doc) return;
      const fm = parseFrontmatter(doc.content);
      const title =
        (typeof fm.data.title === "string" && fm.data.title) ||
        (doc.path ? basename(doc.path).replace(/\.[^.]+$/, "") : doc.title) ||
        "Untitled";
      await runPrint(
        buildContext({
          source: doc.content,
          html: "",
          sourcePath: doc.path,
          format: "html",
          title,
        }),
      );
    },
  },

  // Session
  {
    id: "session.restore",
    title: "Session: Restore Last",
    run: () => sessionService.restore(),
  },
  {
    id: "session.snapshot",
    title: "Session: Snapshot Now",
    run: () => sessionService.snapshot(),
  },
];

export function findCommand(id: string): Command | undefined {
  return allCommands().find((c) => c.id === id);
}

/** Static + plugin-contributed commands, in stable order. */
export function allCommands(): Command[] {
  return [...commands, ...commandRegistry.values()];
}
