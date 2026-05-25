import { applyThemeTokens, parseTheme, type Theme, type ThemeMode } from "./sdk";
import { inkstoneLight } from "./builtin/inkstone-light";
import { inkstoneDark } from "./builtin/inkstone-dark";
import { sepia } from "./builtin/sepia";
import { solarizedLight } from "./builtin/solarized-light";
import { solarizedDark } from "./builtin/solarized-dark";
import { nord } from "./builtin/nord";
import { dracula } from "./builtin/dracula";
import { githubLight, githubDark } from "./builtin/github";

/**
 * Lightweight observable registry of available themes.
 *
 * - `themes()` returns the active list (built-ins + any user-registered).
 * - `subscribe(fn)` notifies on registration changes.
 * - `register(theme)` validates and inserts/updates a theme.
 */
class ThemeRegistry {
  private byId = new Map<string, Theme>();
  private listeners = new Set<() => void>();

  constructor(initial: Theme[]) {
    for (const t of initial) this.byId.set(t.id, t);
  }

  themes(): Theme[] {
    return Array.from(this.byId.values());
  }
  themesFor(mode: ThemeMode): Theme[] {
    return this.themes().filter((t) => t.mode === mode);
  }
  get(id: string): Theme | undefined {
    return this.byId.get(id);
  }
  has(id: string): boolean {
    return this.byId.has(id);
  }
  register(theme: Theme): void {
    this.byId.set(theme.id, theme);
    this.emit();
  }
  registerFromJson(input: unknown): Theme {
    const theme = parseTheme(input);
    this.register(theme);
    return theme;
  }
  unregister(id: string): void {
    if (this.byId.delete(id)) this.emit();
  }
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit(): void {
    for (const l of this.listeners) l();
  }
}

export const themeRegistry = new ThemeRegistry([
  inkstoneLight,
  inkstoneDark,
  sepia,
  solarizedLight,
  solarizedDark,
  nord,
  dracula,
  githubLight,
  githubDark,
]);

export const DEFAULT_LIGHT_ID = inkstoneLight.id;
export const DEFAULT_DARK_ID = inkstoneDark.id;

export function osPrefersDark(): boolean {
  return typeof window !== "undefined"
    && window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
}

/**
 * Resolve the effective mode + theme id given user preferences.
 *
 * @param themeMode    "system" | "light" | "dark"
 * @param lightThemeId fallback to default if unknown
 * @param darkThemeId  fallback to default if unknown
 */
export function resolveActiveTheme(
  themeMode: "system" | "light" | "dark",
  lightThemeId: string,
  darkThemeId: string,
): Theme {
  const mode: ThemeMode =
    themeMode === "system" ? (osPrefersDark() ? "dark" : "light") : themeMode;
  const wantedId = mode === "dark" ? darkThemeId : lightThemeId;
  const fallbackId = mode === "dark" ? DEFAULT_DARK_ID : DEFAULT_LIGHT_ID;
  return (
    themeRegistry.get(wantedId) ??
    themeRegistry.get(fallbackId) ??
    inkstoneLight
  );
}

export function applyTheme(theme: Theme): void {
  applyThemeTokens(theme);
}

export type { Theme, ThemeMode } from "./sdk";
