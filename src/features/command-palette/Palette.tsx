import { useMemo, useState, useEffect } from "react";
import { Dialog } from "@ui/Dialog";
import { useUi } from "@state/ui.store";
import { allCommands, type Command } from "@app/commands";
import { fuzzyFilter } from "@lib/fuzzy";

export function CommandPalette(): JSX.Element {
  const open = useUi((s) => s.paletteOpen);
  const setOpen = useUi((s) => s.setPaletteOpen);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
    }
  }, [open]);

  const filtered = useMemo(
    () => fuzzyFilter(q, allCommands(), (c) => `${c.title} ${c.id}`).slice(0, 50),
    [q],
  );

  const run = (cmd: Command) => {
    setOpen(false);
    void cmd.run();
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} ariaLabel="Command palette">
      <div className="border-b border-border p-3">
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(filtered.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const target = filtered[active]?.item;
              if (target) run(target);
            }
          }}
          placeholder="Type a command…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </div>
      <ul className="ink-scroll max-h-[50vh] overflow-y-auto p-1" role="listbox">
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-sm text-muted">No matching commands.</li>
        ) : (
          filtered.map(({ item }, i) => (
            <li
              key={item.id}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                run(item);
              }}
              className={
                "flex cursor-pointer items-center justify-between rounded px-3 py-1.5 text-sm " +
                (i === active ? "bg-accent text-accent-fg" : "hover:bg-surface-2")
              }
            >
              <span>{item.title}</span>
              {item.shortcut && (
                <kbd className="ml-3 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted">
                  {item.shortcut}
                </kbd>
              )}
            </li>
          ))
        )}
      </ul>
    </Dialog>
  );
}
