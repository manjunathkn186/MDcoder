import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@ui/Button";
import { Icon } from "@ui/Icon";
import { useUi } from "@state/ui.store";
import { usePreview } from "@state/preview.store";
import { FindController, type FindResult } from "./findController";

interface Props {
  rootRef: RefObject<HTMLElement>;
}

/**
 * Floating Find panel anchored to the preview's top-right corner.
 *
 * Lifecycle:
 *   - Opens via the `edit.find` command (Mod+F) when the editor isn't
 *     focused — see app/commands.ts.
 *   - Esc closes; Enter / Shift+Enter step through matches.
 *   - Re-runs the current query whenever the preview HTML changes so
 *     hits stay valid across edits.
 */
export function FindPanel({ rootRef }: Props): JSX.Element | null {
  const open = useUi((s) => s.findOpen);
  const setOpen = useUi((s) => s.setFindOpen);
  const html = usePreview((s) => s.html);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<FindResult>({ total: 0, index: 0 });
  const inputRef = useRef<HTMLInputElement | null>(null);

  // One controller per panel mount; rebound to whatever rootRef points at.
  const controller = useMemo(
    () => new FindController(() => rootRef.current),
    [rootRef],
  );

  // Focus + select input when the panel opens so typing replaces the
  // previous query immediately.
  useEffect(() => {
    if (!open) {
      controller.clear();
      return;
    }
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [open, controller]);

  // Re-apply the current query when the preview content changes; without
  // this, edits in the editor would orphan our highlight wrappers.
  useEffect(() => {
    if (!open || !query) return;
    setResult(controller.refresh());
  }, [open, html, query, controller]);

  // Clean up wrappers when the component unmounts (view-mode switch etc.).
  useEffect(() => () => controller.clear(), [controller]);

  if (!open) return null;

  const onChange = (v: string): void => {
    setQuery(v);
    setResult(controller.search(v));
  };
  const close = (): void => {
    controller.clear();
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Find in document"
      className="absolute right-3 top-3 z-30 flex items-center gap-1 rounded-md border border-border bg-bg-soft px-2 py-1 text-xs shadow-md"
    >
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            close();
          } else if (e.key === "Enter") {
            e.preventDefault();
            setResult(e.shiftKey ? controller.prev() : controller.next());
          }
        }}
        placeholder="Find in document…"
        aria-label="Find query"
        className="w-56 bg-transparent px-1 py-0.5 text-fg outline-none placeholder:text-muted"
      />
      <span className="select-none px-1 tabular-nums text-muted">
        {result.total === 0 ? "0/0" : `${result.index}/${result.total}`}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setResult(controller.prev())}
        aria-label="Previous match"
        title="Previous (⇧↩)"
        disabled={result.total === 0}
      >
        <Icon icon={ChevronUp} size={12} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setResult(controller.next())}
        aria-label="Next match"
        title="Next (↩)"
        disabled={result.total === 0}
      >
        <Icon icon={ChevronDown} size={12} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={close}
        aria-label="Close find"
        title="Close (Esc)"
      >
        <Icon icon={X} size={12} />
      </Button>
    </div>
  );
}
