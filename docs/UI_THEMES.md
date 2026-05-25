# UI System & Themes (Phase 6)

## Pillars

1. **Token contract** — every visible surface reads from a small set of CSS
   custom properties declared in `src/themes/tokens.css`. Themes only ever
   need to override these tokens.
2. **Runtime Theme SDK** — themes are plain TS/JSON objects validated by
   `parseTheme` and applied via `applyThemeTokens`. The registry is
   observable so user-loaded themes appear immediately in the picker.
3. **Tailwind ↔ tokens** — `tailwind.config.ts` maps semantic Tailwind
   colors / spacing / radius / shadows / animations to the tokens, so the
   utility surface adapts when tokens change.
4. **OS sync** — `settings.themeMode === "system"` follows
   `prefers-color-scheme`; `AppShell` subscribes to the media query so the
   theme flips live when the OS appearance changes.

## Token groups

| Group | Tokens |
|---|---|
| Typography | `font-sans`, `font-serif`, `font-mono`, `fs-xs…4xl`, `lh-tight/normal/relaxed`, `fw-regular…bold` |
| Spacing | `space-0…9` (4-pt grid) |
| Radii | `radius-sm`, `radius`, `radius-lg`, `radius-xl`, `radius-full` |
| Elevation | `shadow-1`, `shadow-2`, `shadow-3`, `shadow-pop` (uses `shadow-color`) |
| Motion | `ease-out`, `ease-in-out`, `ease-emphasized`, `d-fast/base/slow` |
| Surface | `bg`, `bg-soft`, `surface`, `surface-2`, `surface-elevated` |
| Foreground | `fg`, `fg-strong`, `muted`, `subtle` |
| Borders | `border`, `border-strong` |
| Brand | `accent`, `accent-hover`, `accent-fg`, `accent-soft` |
| Status | `danger`/`success`/`warning`/`info` + their `-soft` variants |
| Code | `code-bg`, `code-fg` |
| Scrollbars | `scroll-thumb`, `scroll-thumb-hover` |
| Z-scale | `z-base/overlay/modal/popover/toast/tooltip` |

## Built-in themes

| Mode | Theme |
|---|---|
| Light | Inkstone Light, Sepia, Solarized Light, GitHub Light |
| Dark | Inkstone Dark, Solarized Dark, Nord, Dracula, GitHub Dark |

Each is a single file under `@/Users/manjunathkn/Desktop/Work/MyProject/src/themes/builtin/`. Add new ones by:

```ts
import { themeRegistry } from "@themes/registry";
themeRegistry.register({
  id: "my-theme",
  name: "My Theme",
  mode: "dark",
  tokens: { bg: "#0d1117", fg: "#e6edf3", accent: "#58a6ff" /* … */ },
});
```

To load from JSON (e.g. user-imported file):

```ts
themeRegistry.registerFromJson(await fetch("/themes/midnight.json").then((r) => r.json()));
```

## Theme SDK API

```ts
// src/themes/sdk.ts
export interface Theme {
  id: string;
  name: string;
  mode: "light" | "dark";
  author?: string;
  description?: string;
  codeTheme?: string;          // Shiki theme id for code blocks
  tokens: Partial<ThemeTokens>;
}
applyThemeTokens(theme: Theme): void
parseTheme(input: unknown): Theme
```

```ts
// src/themes/registry.ts
themeRegistry.themes()
themeRegistry.themesFor("light" | "dark")
themeRegistry.get(id)
themeRegistry.register(theme)
themeRegistry.registerFromJson(json)
themeRegistry.subscribe(fn)
resolveActiveTheme(themeMode, lightId, darkId): Theme
```

## Settings

```ts
useSettings.getState().setThemeMode("system" | "light" | "dark");
useSettings.getState().setLightThemeId("inkstone-light");
useSettings.getState().setDarkThemeId("dracula");
useSettings.getState().setDensity("compact" | "comfortable" | "cozy");
```

Persisted to `localStorage` under `inkstone.settings` (v2). A migration
collapses the v1 `theme` field into `themeMode` with defaults for the new
fields.

## UI primitives

| Component | File |
|---|---|
| Button (5 variants × 4 sizes) | `@/Users/manjunathkn/Desktop/Work/MyProject/src/ui/Button.tsx` |
| Dialog (focus-trap, Esc) | `@/Users/manjunathkn/Desktop/Work/MyProject/src/ui/Dialog.tsx` |
| Modal (header/body/footer) | `@/Users/manjunathkn/Desktop/Work/MyProject/src/ui/Modal.tsx` |
| ContextMenu (a11y + clamping) | `@/Users/manjunathkn/Desktop/Work/MyProject/src/ui/ContextMenu.tsx` |
| Toaster | `@/Users/manjunathkn/Desktop/Work/MyProject/src/ui/Toaster.tsx` |
| `toast.*` imperative API | `@/Users/manjunathkn/Desktop/Work/MyProject/src/ui/toast.ts` |
| `confirm()` imperative | `@/Users/manjunathkn/Desktop/Work/MyProject/src/state/confirm.store.ts` |
| ConfirmHost (modal render) | `@/Users/manjunathkn/Desktop/Work/MyProject/src/ui/ConfirmHost.tsx` |
| Icon | `@/Users/manjunathkn/Desktop/Work/MyProject/src/ui/Icon.tsx` |

## Toasts

```ts
import { toast } from "@ui/toast";

toast.success("Saved");
toast.danger({ title: "Save failed", message: err.message, duration: 0 });
toast.info({
  message: "File renamed",
  action: { label: "Undo", onClick: () => undoLastRename() },
});
```

Stack capped at 6; renders top-right with `animate-toast-in`.

## Confirm

```ts
import { confirm } from "@state/confirm.store";

const ok = await confirm({
  title: "Delete folder?",
  message: "This cannot be undone.",
  confirmLabel: "Delete",
  destructive: true,
});
if (ok) await fs.remove(path);
```

## Animation utilities

Use Tailwind animations bound to the tokens:

```tsx
<div className="animate-fade-in" />
<div className="animate-slide-up" />
<div className="animate-pop" />
<div className="animate-toast-in" />
<div className="animate-pulse" />
<div className="animate-spin" />
<div className="animate-shimmer" />
```

Durations and easings come from CSS vars, so the entire app slows under
`prefers-reduced-motion: reduce` automatically.

## Scrollbars

Apply `.ink-scroll` to any scrolling container. Webkit + Firefox styles
hook into `--ink-scroll-thumb` / `--ink-scroll-thumb-hover`, so themes
restyle the chrome alongside everything else.

## Markdown styling

`.ink-prose` (in `@/Users/manjunathkn/Desktop/Work/MyProject/src/styles/prose.css`) is the canonical preview
class. It uses serif body type, sans-serif headings, an accent-bordered
blockquote, themed tables (zebra striping via `bg-soft`), styled task
lists, footnotes, and wikilinks (resolved vs `.is-broken`).

Code blocks use `--ink-code-bg/-fg` for inline code; fenced code blocks
keep Shiki's per-theme palette via `theme.codeTheme` (defaults:
`github-light` / `github-dark`).

## Density

`data-density="compact|cozy"` on `<html>` rescales `--ink-fs-base` and
spacing tokens. The Settings panel exposes the toggle.

## Reduced motion

A media query in `tokens.css` collapses all `--ink-d-*` durations to 0,
which cascades through every component using the token (transitions,
animations, theme-color flip).

## Adding a new theme — checklist

1. Create a file in `src/themes/builtin/<my-theme>.ts` exporting a `Theme`.
2. Register it in `src/themes/registry.ts` constructor (or call
   `themeRegistry.register` at app start).
3. Pick it from **Settings → Themes**.

No CSS edits needed.
