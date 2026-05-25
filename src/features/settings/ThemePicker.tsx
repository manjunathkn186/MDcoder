import { useEffect, useState } from "react";
import { useSettings, type ThemeMode } from "@state/settings.store";
import { themeRegistry, type Theme } from "@themes/registry";
import { cn } from "@lib/cn";

/**
 * Theme picker UI. Lets the user choose:
 *   - Theme mode: system / light / dark
 *   - Active light theme (any theme with mode === "light")
 *   - Active dark theme (any theme with mode === "dark")
 *
 * Subscribes to the live theme registry so user-added themes appear
 * without a remount.
 */
export function ThemePicker(): JSX.Element {
  const themeMode = useSettings((s) => s.themeMode);
  const lightThemeId = useSettings((s) => s.lightThemeId);
  const darkThemeId = useSettings((s) => s.darkThemeId);
  const setThemeMode = useSettings((s) => s.setThemeMode);
  const setLightThemeId = useSettings((s) => s.setLightThemeId);
  const setDarkThemeId = useSettings((s) => s.setDarkThemeId);

  const [version, setVersion] = useState(0);
  useEffect(() => themeRegistry.subscribe(() => setVersion((v) => v + 1)), []);

  const lightThemes = themeRegistry.themesFor("light");
  const darkThemes = themeRegistry.themesFor("dark");

  return (
    <div className="space-y-6" data-version={version}>
      <div>
        <h3 className="text-sm font-semibold text-fg-strong">Appearance</h3>
        <div className="mt-2 inline-flex rounded-lg border border-border bg-bg-soft p-0.5">
          {(["system", "light", "dark"] as ThemeMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setThemeMode(m)}
              className={cn(
                "px-3 py-1 text-xs font-medium capitalize transition-colors duration-fast ease-out rounded-md",
                themeMode === m ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <ThemeGrid
        title="Light theme"
        themes={lightThemes}
        activeId={lightThemeId}
        onPick={setLightThemeId}
      />
      <ThemeGrid
        title="Dark theme"
        themes={darkThemes}
        activeId={darkThemeId}
        onPick={setDarkThemeId}
      />
    </div>
  );
}

function ThemeGrid({
  title,
  themes,
  activeId,
  onPick,
}: {
  title: string;
  themes: Theme[];
  activeId: string;
  onPick: (id: string) => void;
}): JSX.Element {
  return (
    <div>
      <h3 className="text-sm font-semibold text-fg-strong">{title}</h3>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => onPick(t.id)}
            className={cn(
              "group flex flex-col overflow-hidden rounded-lg border text-left transition-all duration-fast",
              activeId === t.id
                ? "border-accent ring-2 ring-accent ring-offset-1 ring-offset-bg"
                : "border-border hover:border-border-strong",
            )}
            aria-pressed={activeId === t.id}
          >
            <Swatch theme={t} />
            <div className="px-2.5 py-2">
              <div className="truncate text-xs font-medium">{t.name}</div>
              {t.description && (
                <div className="truncate text-[11px] text-muted">{t.description}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Swatch({ theme }: { theme: Theme }): JSX.Element {
  const t = theme.tokens;
  return (
    <div
      className="relative h-14 w-full"
      style={{ background: t.bg ?? "var(--ink-bg)" }}
    >
      <div
        className="absolute inset-x-2 top-2 h-2 rounded"
        style={{ background: t.surface ?? "var(--ink-surface)" }}
      />
      <div className="absolute inset-x-2 bottom-2 flex gap-1.5">
        <span
          className="h-3 w-6 rounded"
          style={{ background: t.accent ?? "var(--ink-accent)" }}
        />
        <span
          className="h-3 w-3 rounded"
          style={{ background: t.success ?? "var(--ink-success)" }}
        />
        <span
          className="h-3 w-3 rounded"
          style={{ background: t.warning ?? "var(--ink-warning)" }}
        />
        <span
          className="h-3 w-3 rounded"
          style={{ background: t.danger ?? "var(--ink-danger)" }}
        />
      </div>
    </div>
  );
}
