import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useSettings, type DensityMode } from "@state/settings.store";
import { ThemePicker } from "./ThemePicker";
import { PluginsView } from "@features/plugins/PluginsView";
import { Button } from "@ui/Button";
import { Icon } from "@ui/Icon";
import { cn } from "@lib/cn";
import { useEffect } from "react";

/**
 * Settings page hosted at /settings. Sections are grouped vertically with
 * generous spacing using the design system spacing scale.
 */
export function SettingsPanel(): JSX.Element {
  const density = useSettings((s) => s.density);
  const setDensity = useSettings((s) => s.setDensity);
  const fontSize = useSettings((s) => s.editorFontSize);
  const setFontSize = useSettings((s) => s.setEditorFontSize);
  const showLineNumbers = useSettings((s) => s.showLineNumbers);
  const toggleLineNumbers = useSettings((s) => s.toggleLineNumbers);
  const showInvisibles = useSettings((s) => s.showInvisibles);
  const toggleInvisibles = useSettings((s) => s.toggleInvisibles);
  const navigate = useNavigate();

  // Close on Escape — matches platform expectations for modal-like overlays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const close = () => {
    // If the user landed directly on /settings (e.g. via deep link),
    // history.length === 1 and `navigate(-1)` would no-op. Fall back to "/".
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <div className="ink-scroll relative mx-auto h-full max-w-2xl overflow-y-auto px-6 py-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={close}
        aria-label="Close settings"
        title="Close settings (Esc)"
        className="absolute right-4 top-4"
      >
        <Icon icon={X} />
      </Button>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-fg-strong">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Preferences are stored locally and apply immediately.
        </p>
      </header>

      <Section title="Themes" description="Pick a palette for each appearance mode.">
        <ThemePicker />
      </Section>

      <Section title="Density">
        <div className="inline-flex rounded-lg border border-border bg-bg-soft p-0.5">
          {(["compact", "comfortable", "cozy"] as DensityMode[]).map((d) => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              className={cn(
                "px-3 py-1 text-xs font-medium capitalize rounded-md transition-colors duration-fast",
                density === d ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Plugins" description="Manage installed extensions.">
        <PluginsView />
      </Section>

      <Section title="Editor">
        <Row label="Font size">
          <input
            type="number"
            min={10}
            max={28}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-20 rounded border border-border bg-bg px-2 py-1 text-sm"
          />
        </Row>
        <Row label="Line numbers">
          <Toggle checked={showLineNumbers} onChange={toggleLineNumbers} />
        </Row>
        <Row label="Show invisibles">
          <Toggle checked={showInvisibles} onChange={toggleInvisibles} />
        </Row>
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2">
      <span className="text-sm text-fg">{label}</span>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}): JSX.Element {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-fast",
        checked ? "bg-accent" : "bg-surface-2",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-soft transition-transform duration-fast ease-out",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
