/**
 * Theme SDK
 * ─────────
 * Themes are plain JSON-friendly objects that map semantic token names to
 * CSS values. The runtime writes them onto the `:root` element as CSS
 * custom properties, so any consumer that uses the token contract (Tailwind
 * utilities, raw CSS, CodeMirror themes, prose styles) updates instantly.
 *
 * To add a custom theme:
 *   1. Build a `Theme` (or load JSON via `parseTheme`).
 *   2. `themeRegistry.register(theme)`.
 *   3. Call `applyTheme(theme.id)` (or let the settings store drive it).
 */

export type ThemeMode = "light" | "dark";

export interface Theme {
  /** Stable, kebab-case identifier (used in settings persistence). */
  id: string;
  /** Human-readable name shown in the picker. */
  name: string;
  /** Light or dark — drives Tailwind `dark:` variant + `color-scheme`. */
  mode: ThemeMode;
  /** Optional author / version metadata. */
  author?: string;
  description?: string;
  /** Shiki code-block theme id. Falls back to a mode-appropriate default. */
  codeTheme?: string;
  /** Semantic tokens — every key is optional; missing keys keep the fallback. */
  tokens: Partial<ThemeTokens>;
}

/**
 * The full set of semantic tokens a theme may override. Keep this union in
 * sync with `src/themes/tokens.css` so callers get autocomplete.
 */
export interface ThemeTokens {
  bg: string;
  "bg-soft": string;
  surface: string;
  "surface-2": string;
  "surface-elevated": string;
  fg: string;
  "fg-strong": string;
  muted: string;
  subtle: string;
  border: string;
  "border-strong": string;

  accent: string;
  "accent-hover": string;
  "accent-fg": string;
  "accent-soft": string;

  danger: string;
  "danger-soft": string;
  success: string;
  "success-soft": string;
  warning: string;
  "warning-soft": string;
  info: string;
  "info-soft": string;

  "code-bg": string;
  "code-fg": string;
  selection: string;
  link: string;

  "scroll-thumb": string;
  "scroll-thumb-hover": string;
  "shadow-color": string;
}

const TOKEN_KEYS: ReadonlyArray<keyof ThemeTokens> = [
  "bg", "bg-soft", "surface", "surface-2", "surface-elevated",
  "fg", "fg-strong", "muted", "subtle", "border", "border-strong",
  "accent", "accent-hover", "accent-fg", "accent-soft",
  "danger", "danger-soft", "success", "success-soft",
  "warning", "warning-soft", "info", "info-soft",
  "code-bg", "code-fg", "selection", "link",
  "scroll-thumb", "scroll-thumb-hover", "shadow-color",
];

/** Write a theme's tokens onto :root. Missing keys are cleared. */
export function applyThemeTokens(theme: Theme): void {
  const root = document.documentElement;
  for (const key of TOKEN_KEYS) {
    const cssVar = `--ink-${key}`;
    const value = theme.tokens[key];
    if (value === undefined) root.style.removeProperty(cssVar);
    else root.style.setProperty(cssVar, value);
  }
  root.setAttribute("data-theme", theme.mode);
  root.setAttribute("data-theme-id", theme.id);
  root.style.colorScheme = theme.mode;
}

/**
 * Validate-and-coerce a JSON document into a `Theme`. Throws on missing
 * required keys; unknown token keys are silently dropped.
 */
export function parseTheme(input: unknown): Theme {
  if (!isObject(input)) throw new Error("Theme must be an object");
  const id = expectString(input, "id");
  const name = expectString(input, "name");
  const mode = expectString(input, "mode");
  if (mode !== "light" && mode !== "dark") {
    throw new Error(`Theme.mode must be "light" or "dark", got ${mode}`);
  }
  const rawTokens = (input as { tokens?: unknown }).tokens;
  if (!isObject(rawTokens)) throw new Error("Theme.tokens must be an object");
  const tokens: Partial<ThemeTokens> = {};
  for (const key of TOKEN_KEYS) {
    const v = (rawTokens as Record<string, unknown>)[key];
    if (typeof v === "string") tokens[key] = v;
  }
  return {
    id,
    name,
    mode,
    tokens,
    author: typeof input.author === "string" ? input.author : undefined,
    description: typeof input.description === "string" ? input.description : undefined,
    codeTheme: typeof input.codeTheme === "string" ? input.codeTheme : undefined,
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function expectString(o: Record<string, unknown>, key: string): string {
  const v = o[key];
  if (typeof v !== "string" || !v) throw new Error(`Theme.${key} must be a non-empty string`);
  return v;
}
