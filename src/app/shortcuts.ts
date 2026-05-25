import { useEffect } from "react";
import { commands } from "@app/commands";

const isMac = navigator.platform.toLowerCase().includes("mac");

function matches(e: KeyboardEvent, accel: string): boolean {
  const parts = accel.toLowerCase().split("+");
  const want = {
    mod: parts.includes("mod"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
    key: parts[parts.length - 1],
  };
  const mod = isMac ? e.metaKey : e.ctrlKey;
  return (
    !!want.mod === mod &&
    !!want.shift === e.shiftKey &&
    !!want.alt === e.altKey &&
    e.key.toLowerCase() === want.key
  );
}

export function useGlobalShortcuts(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const cmd of commands) {
        if (cmd.shortcut && matches(e, cmd.shortcut)) {
          e.preventDefault();
          void cmd.run();
          return;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
