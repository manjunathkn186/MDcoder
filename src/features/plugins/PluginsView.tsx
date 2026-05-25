import { useMemo, useState } from "react";
import { Plug, Power, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePlugins, type InstalledPlugin } from "@state/plugins.store";
import { pluginHost } from "@/plugins/runtime/PluginHost";
import { useConfirm } from "@state/confirm.store";
import { toast } from "@ui/toast";
import { Button } from "@ui/Button";
import { cn } from "@lib/cn";

/**
 * Plugin manager surface for Settings.
 *
 * Lists every installed plugin, exposes enable/disable/uninstall, and
 * surfaces activation errors inline.
 */
export function PluginsView(): JSX.Element {
  const plugins = usePlugins((s) => s.plugins);
  const list = useMemo(
    () => Object.values(plugins).sort((a, b) => a.manifest.name.localeCompare(b.manifest.name)),
    [plugins],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const confirm = useConfirm((s) => s.open);

  const toggle = async (p: InstalledPlugin) => {
    setBusy(p.manifest.id);
    try {
      if (p.enabled) await pluginHost.disable(p.manifest.id);
      else await pluginHost.enable(p.manifest.id);
    } catch (err) {
      toast.danger({
        title: `Failed to ${p.enabled ? "disable" : "enable"} ${p.manifest.name}`,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  };

  const uninstall = async (p: InstalledPlugin) => {
    if (p.source === "builtin") return;
    const ok = await confirm({
      title: `Uninstall ${p.manifest.name}?`,
      message: "All extensions added by this plugin will be removed.",
      destructive: true,
      confirmLabel: "Uninstall",
    });
    if (!ok) return;
    setBusy(p.manifest.id);
    try {
      await pluginHost.uninstall(p.manifest.id);
      toast.info({ message: `${p.manifest.name} uninstalled.` });
    } finally {
      setBusy(null);
    }
  };

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
        <Plug className="text-muted" size={28} />
        <div className="text-sm font-medium">No plugins installed.</div>
        <p className="max-w-sm text-sm text-muted">
          Built-in plugins ship enabled by default. You can install additional plugins from a
          marketplace JSON index or by dropping a folder into <code>.inkstone/plugins/</code>.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-2">
      {list.map((p) => (
        <li
          key={p.manifest.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-3",
            p.status === "error" && "border-danger/40 bg-danger-soft",
          )}
        >
          <span className="mt-0.5 flex-none">
            {p.status === "error" ? (
              <AlertTriangle className="text-danger" size={16} />
            ) : p.status === "active" ? (
              <CheckCircle2 className="text-success" size={16} />
            ) : (
              <Plug className="text-muted" size={16} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-fg-strong">
                {p.manifest.name}
              </span>
              <span className="text-[11px] text-muted">v{p.manifest.version}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                  p.source === "builtin"
                    ? "bg-accent-soft text-accent"
                    : "bg-surface-2 text-muted",
                )}
              >
                {p.source}
              </span>
            </div>
            {p.manifest.description && (
              <div className="text-sm text-muted">{p.manifest.description}</div>
            )}
            {p.manifest.permissions.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {p.manifest.permissions.map((perm) => (
                  <span
                    key={perm}
                    className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            )}
            {p.error && (
              <div className="mt-1 text-[11px] text-danger">{p.error}</div>
            )}
          </div>
          <div className="flex flex-none items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggle(p)}
              disabled={busy === p.manifest.id}
              aria-label={p.enabled ? "Disable" : "Enable"}
              title={p.enabled ? "Disable" : "Enable"}
            >
              <Power size={14} className={p.enabled ? "text-success" : "text-muted"} />
            </Button>
            {p.source !== "builtin" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => uninstall(p)}
                disabled={busy === p.manifest.id}
                aria-label="Uninstall"
                title="Uninstall"
              >
                <Trash2 size={14} className="text-danger" />
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
