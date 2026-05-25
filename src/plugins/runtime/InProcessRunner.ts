import type { Disposable, PluginModule } from "@/plugins/sdk/api";
import type { PluginManifest } from "@/plugins/sdk/manifest";
import { createInProcessApi } from "./apiFactory";
import { clearOwnerEverywhere } from "./extensionPoints";
import { logger } from "@lib/logger";

/**
 * Loads and activates a trusted ES module plugin directly in the host
 * process. Used for built-in plugins (imported statically) and for
 * developer-installed local plugins explicitly marked `trusted: true`.
 *
 * Untrusted code MUST NOT be routed through here.
 */
export class InProcessRunner {
  private disposables = new Map<string, Disposable | undefined>();
  private modules = new Map<string, PluginModule>();

  async activate(manifest: PluginManifest, mod: PluginModule): Promise<void> {
    if (this.modules.has(manifest.id)) return;
    const api = createInProcessApi(manifest);
    try {
      const result = await mod.activate(api);
      this.modules.set(manifest.id, mod);
      const dispose = result && typeof result === "object" && "dispose" in result
        ? (result as Disposable)
        : undefined;
      this.disposables.set(manifest.id, dispose);
    } catch (err) {
      logger.error(`[plugin/${manifest.id}] activation failed`, err);
      throw err;
    }
  }

  async deactivate(pluginId: string): Promise<void> {
    const mod = this.modules.get(pluginId);
    if (!mod) return;
    try {
      this.disposables.get(pluginId)?.dispose();
      await mod.deactivate?.();
    } catch (err) {
      logger.warn(`[plugin/${pluginId}] deactivate failed`, err);
    } finally {
      this.disposables.delete(pluginId);
      this.modules.delete(pluginId);
      clearOwnerEverywhere(pluginId);
    }
  }
}

export const inProcessRunner = new InProcessRunner();
