import { useEffect, useRef } from "react";
import { Compartment, EditorSelection, EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  drawSelection,
  rectangularSelection,
  crosshairCursor,
  dropCursor,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { bracketMatching, indentOnInput, foldGutter, foldKeymap } from "@codemirror/language";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { useEditor } from "@state/editor.store";
import { useSettings } from "@state/settings.store";
import { useUi } from "@state/ui.store";
import { useViewState } from "@state/viewState.store";
import { markdownLang } from "./extensions/markdownLang";
import { inlineDecorations } from "./extensions/decorations";
import { pasteHandlers } from "./extensions/pasteHandlers";
import { extraKeymap } from "./extensions/extraKeymap";
import { markdownSnippets } from "./extensions/snippets";
import { loadKeybindingsMode } from "./extensions/keybindingsMode";
import { editorRegistry } from "./extensions/editorRegistry";
import { cmLight } from "./theme/cm-light";
import { cmDark } from "./theme/cm-dark";
import { parserService } from "@/markdown/parserService";
import { autosave } from "./services/autosave";
import { debounce } from "@lib/debounce";
import { classifySize, MASSIVE_FILE_CHARS } from "@lib/fileSize";

const PARSE_DEBOUNCE_MS = 120;

export function Editor(): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const docVersionRef = useRef(0);
  const themeCompartment = useRef(new Compartment());
  const keymodeCompartment = useRef(new Compartment());
  const fontCompartment = useRef(new Compartment());
  const linesCompartment = useRef(new Compartment());

  const fontSize = useSettings((s) => s.editorFontSize);
  const showLineNumbers = useSettings((s) => s.showLineNumbers);
  const themeMode = useSettings((s) => s.themeMode);
  const keyMode = useUi((s) => s.keyMode);
  const zoom = useUi((s) => s.zoom);
  const { activeId, docs, openDoc, updateContent } = useEditor();

  const doc = activeId ? docs[activeId] : null;

  // Build editor when active doc switches. Theme/font/keymap changes
  // are applied via compartments without remounting.
  useEffect(() => {
    if (!hostRef.current || !doc) {
      const v = viewRef.current;
      if (v) {
        editorRegistry.unregister(doc?.id ?? "");
        v.destroy();
        viewRef.current = null;
      }
      return;
    }

    // Adaptive parse cadence (Phase 9): large docs get a longer debounce,
    // massive docs skip the parser entirely.
    const debouncedParse = debounce((source: string) => {
      if (source.length >= MASSIVE_FILE_CHARS) return;
      docVersionRef.current += 1;
      parserService.parse(source, docVersionRef.current);
    }, classifySize(doc.content) === "large" ? PARSE_DEBOUNCE_MS * 3 : PARSE_DEBOUNCE_MS);

    // Restore cursor & scroll for this doc from per-doc view state.
    const saved = useViewState.getState().get(doc.id);
    const cursorPos = Math.max(
      0,
      Math.min(saved.cursor ?? 0, doc.content.length),
    );

    const state = EditorState.create({
      doc: doc.content,
      selection: EditorSelection.cursor(cursorPos),
      extensions: [
        history(),
        drawSelection(),
        dropCursor(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        bracketMatching(),
        closeBrackets(),
        indentOnInput(),
        foldGutter(),
        EditorState.allowMultipleSelections.of(true),
        autocompletion({ override: [markdownSnippets], activateOnTyping: true }),
        linesCompartment.current.of(showLineNumbers ? lineNumbers() : []),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...extraKeymap,
          indentWithTab,
        ]),
        markdownLang(),
        inlineDecorations,
        pasteHandlers,
        EditorView.lineWrapping,
        fontCompartment.current.of(
          EditorView.theme({ "&": { fontSize: `${fontSize * zoom}px` } }),
        ),
        themeCompartment.current.of(resolveCmTheme(themeMode)),
        keymodeCompartment.current.of([]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const next = update.state.doc.toString();
            updateContent(doc.id, next);
            debouncedParse(next);
            autosave.schedule(doc.id);
          }
          if (update.selectionSet) {
            useViewState.getState().patch(doc.id, {
              cursor: update.state.selection.main.head,
            });
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    editorRegistry.register(doc.id, view);
    editorRegistry.setActive(doc.id);

    // Restore editor scroll on the next frame (after layout) and start
    // tracking subsequent scrolls into the per-doc view state store.
    const restoreScroll = (): void => {
      view.scrollDOM.scrollTop = saved.editorScrollTop ?? 0;
    };
    requestAnimationFrame(restoreScroll);
    const onScroll = (): void => {
      useViewState.getState().patch(doc.id, {
        editorScrollTop: view.scrollDOM.scrollTop,
      });
    };
    view.scrollDOM.addEventListener("scroll", onScroll, { passive: true });

    void (async () => {
      const ext = await loadKeybindingsMode(keyMode);
      if (viewRef.current === view) {
        view.dispatch({ effects: keymodeCompartment.current.reconfigure(ext) });
      }
    })();

    if (doc.content.length < MASSIVE_FILE_CHARS) {
      docVersionRef.current += 1;
      parserService.parse(doc.content, docVersionRef.current);
    }

    return () => {
      view.scrollDOM.removeEventListener("scroll", onScroll);
      editorRegistry.unregister(doc.id);
      view.destroy();
      viewRef.current = null;
    };
  }, [doc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    v.dispatch({
      effects: [
        themeCompartment.current.reconfigure(resolveCmTheme(themeMode)),
        fontCompartment.current.reconfigure(
          EditorView.theme({ "&": { fontSize: `${fontSize * zoom}px` } }),
        ),
        linesCompartment.current.reconfigure(showLineNumbers ? lineNumbers() : []),
      ],
    });
  }, [themeMode, fontSize, showLineNumbers, zoom]);

  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    void loadKeybindingsMode(keyMode).then((ext) => {
      if (viewRef.current !== v) return;
      v.dispatch({ effects: keymodeCompartment.current.reconfigure(ext) });
    });
  }, [keyMode]);

  if (!doc) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <button
          className="rounded border border-border bg-surface px-4 py-2 text-sm hover:bg-surface-2"
          onClick={() =>
            openDoc({
              id: crypto.randomUUID(),
              path: null,
              title: "Untitled.md",
              content: "# Welcome to MDCoder\n\nStart typing your **markdown** here.\n",
            })
          }
        >
          New document
        </button>
      </div>
    );
  }

  return <div ref={hostRef} className="h-full overflow-hidden gpu-layer" />;
}

function resolveCmTheme(theme: string) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  return resolved === "dark" ? cmDark : cmLight;
}
