/**
 * Plugin manifest schema (a JSON file shipped at the root of every plugin).
 * Kept intentionally small so authoring is trivial; capabilities are
 * expressed declaratively in `permissions` and the runtime grants the
 * matching API surface accordingly.
 */
export type PluginPermission =
  | "commands"
  | "toolbar"
  | "statusBar"
  | "ui"
  | "workspace"
  | "markdown"   // trusted-only — extends markdown-it pipeline
  | "editor"     // trusted-only — extends CodeMirror
  | "themes";

export interface PluginManifest {
  /** Stable, kebab-case identifier. */
  id: string;
  /** Display name in the plugins UI. */
  name: string;
  /** Semver. */
  version: string;
  /** Short marketing copy. */
  description?: string;
  /** Plugin author / team. */
  author?: string;
  /** Author homepage / repo. */
  homepage?: string;
  /** Optional logo path relative to the plugin folder. */
  icon?: string;
  /** Relative path to the plugin entry, e.g. `main.js`. */
  main: string;
  /** Permissions the plugin requires. Missing permissions cause activation to fail. */
  permissions: PluginPermission[];
  /** Inkstone version range this plugin targets. */
  engines?: { inkstone?: string };
  /** Source category — used in marketplace listings. */
  category?: "productivity" | "editor" | "preview" | "themes" | "integrations" | "other";
  /** Free-form tags. */
  keywords?: string[];
  /** Optional flag to opt into trusted (in-process) execution. The host
   *  ignores this for plugins installed from untrusted sources. */
  trusted?: boolean;
}

const KEBAB = /^[a-z][a-z0-9-]*$/;
const SEMVER = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

const VALID_PERMISSIONS: ReadonlySet<PluginPermission> = new Set([
  "commands", "toolbar", "statusBar", "ui", "workspace",
  "markdown", "editor", "themes",
]);

/** Parse + validate. Throws on the first violation. */
export function parseManifest(input: unknown): PluginManifest {
  if (!isObject(input)) throw new Error("Manifest must be a JSON object");
  const id = expectString(input, "id");
  if (!KEBAB.test(id)) throw new Error(`Manifest.id must be kebab-case: ${id}`);
  const name = expectString(input, "name");
  const version = expectString(input, "version");
  if (!SEMVER.test(version)) throw new Error(`Manifest.version must be semver: ${version}`);
  const main = expectString(input, "main");
  const perms = input.permissions;
  if (!Array.isArray(perms)) throw new Error("Manifest.permissions must be an array");
  const permissions: PluginPermission[] = [];
  for (const p of perms) {
    if (typeof p !== "string" || !VALID_PERMISSIONS.has(p as PluginPermission)) {
      throw new Error(`Manifest.permissions contains invalid entry: ${String(p)}`);
    }
    permissions.push(p as PluginPermission);
  }
  return {
    id,
    name,
    version,
    main,
    permissions,
    description: optString(input, "description"),
    author: optString(input, "author"),
    homepage: optString(input, "homepage"),
    icon: optString(input, "icon"),
    engines: isObject(input.engines)
      ? { inkstone: optString(input.engines, "inkstone") }
      : undefined,
    category: optString(input, "category") as PluginManifest["category"],
    keywords: Array.isArray(input.keywords)
      ? (input.keywords as unknown[]).filter((k): k is string => typeof k === "string")
      : undefined,
    trusted: typeof input.trusted === "boolean" ? input.trusted : undefined,
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function expectString(o: Record<string, unknown>, key: string): string {
  const v = o[key];
  if (typeof v !== "string" || !v) throw new Error(`Manifest.${key} must be a non-empty string`);
  return v;
}
function optString(o: Record<string, unknown>, key: string): string | undefined {
  const v = o[key];
  return typeof v === "string" && v ? v : undefined;
}
