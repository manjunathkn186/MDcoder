import { pluginHost } from "@/plugins/runtime/PluginHost";
import * as callout from "./callout";
import * as midnight from "./midnight-theme";

/**
 * Install + activate built-in trusted plugins at app start.
 * Idempotent — safe to call multiple times.
 */
export async function installBuiltinPlugins(): Promise<void> {
  await pluginHost.installBuiltin(callout.manifest, callout.plugin);
  await pluginHost.installBuiltin(midnight.manifest, midnight.plugin);
}
