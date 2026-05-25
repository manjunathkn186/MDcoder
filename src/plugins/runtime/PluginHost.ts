import type { PluginManifest } from "@/plugins/sdk/manifest";
import type { PluginModule } from "@/plugins/sdk/api";
import { inProcessRunner } from "./InProcessRunner";
import { sandboxRunner } from "./SandboxRunner";
import { usePlugins, type InstalledPlugin } from "@state/plugins.store";
import { logger } from "@lib/logger";

/**
 * Top-level facade. The host owns the plugin lifecycle:
 *
 *   install → manifest stored + persisted (state)
 *   enable  → runner activates the module
 *   disable → runner deactivates (extension points cleared)
 *   uninstall → disabled (if enabled) + removed from registry
 *
 * Two execution modes:
 *   - In-process for built-ins and plugins explicitly marked trusted.
 *     Loaded as ES modules — full type-safe API surface.
 *   - Sandbox (iframe + postMessage) for everything else. Reduced API.
 */
export class PluginHost {
  /** Register a built-in trusted plugin already imported as a module. */
  async installBuiltin(manifest: PluginManifest, mod: PluginModule): Promise<void> {
    usePlugins.getState().upsert({
      manifest,
      source: "builtin",
      enabled: true,
      status: "idle",
    });
    await this.activate(manifest, { kind: "module", module: mod });
  }

  /** Install an untrusted plugin from raw source. */
  async installFromSource(manifest: PluginManifest, source: string): Promise<void> {
    usePlugins.getState().upsert({
      manifest,
      source: "user",
      enabled: false,
      status: "idle",
      code: source,
    });
  }

  async enable(pluginId: string): Promise<void> {
    const entry = usePlugins.getState().byId(pluginId);
    if (!entry) throw new Error(`Unknown plugin: ${pluginId}`);
    if (entry.enabled && entry.status === "active") return;
    usePlugins.getState().setEnabled(pluginId, true);
    try {
      if (entry.module) {
        await this.activate(entry.manifest, { kind: "module", module: entry.module });
      } else if (entry.code) {
        await this.activate(entry.manifest, { kind: "source", source: entry.code });
      } else {
        throw new Error(`Plugin ${pluginId} has no executable payload`);
      }
    } catch (err) {
      usePlugins.getState().setStatus(pluginId, "error", String(err));
      throw err;
    }
  }

  async disable(pluginId: string): Promise<void> {
    const entry = usePlugins.getState().byId(pluginId);
    if (!entry) return;
    usePlugins.getState().setEnabled(pluginId, false);
    await this.deactivate(entry);
  }

  async uninstall(pluginId: string): Promise<void> {
    const entry = usePlugins.getState().byId(pluginId);
    if (entry) await this.deactivate(entry);
    usePlugins.getState().remove(pluginId);
  }

  private async activate(
    manifest: PluginManifest,
    payload: { kind: "module"; module: PluginModule } | { kind: "source"; source: string },
  ): Promise<void> {
    usePlugins.getState().setStatus(manifest.id, "activating");
    try {
      if (payload.kind === "module" && manifest.trusted !== false) {
        await inProcessRunner.activate(manifest, payload.module);
      } else if (payload.kind === "source") {
        await sandboxRunner.activate(manifest, payload.source);
      } else {
        throw new Error("No suitable runner for this plugin");
      }
      usePlugins.getState().setStatus(manifest.id, "active");
    } catch (err) {
      logger.error(`[plugin] activate failed: ${manifest.id}`, err);
      usePlugins.getState().setStatus(manifest.id, "error", String(err));
      throw err;
    }
  }

  private async deactivate(entry: InstalledPlugin): Promise<void> {
    try {
      if (entry.source === "builtin" || entry.manifest.trusted) {
        await inProcessRunner.deactivate(entry.manifest.id);
      } else {
        await sandboxRunner.deactivate(entry.manifest.id);
      }
    } finally {
      usePlugins.getState().setStatus(entry.manifest.id, "idle");
    }
  }
}

export const pluginHost = new PluginHost();
