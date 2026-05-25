/**
 * Marketplace fetch helpers.
 *
 * The marketplace is a static JSON index hosted at a configurable URL.
 * It conforms to the `MarketplaceIndex` schema below. Each entry points
 * to a manifest URL + a source-bundle URL. The host downloads both,
 * validates the manifest, and routes the source through the sandbox
 * runner — there is no in-process execution path for marketplace code.
 */
import { parseManifest, type PluginManifest } from "@/plugins/sdk/manifest";

export interface MarketplaceEntry {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  category?: PluginManifest["category"];
  keywords?: string[];
  manifestUrl: string;
  sourceUrl: string;
  /** SHA-256 of the source bundle, lowercase hex. */
  sourceSha256: string;
  /** ISO date string. */
  publishedAt: string;
  /** Optional rating + downloads for sorting. */
  rating?: number;
  downloads?: number;
}

export interface MarketplaceIndex {
  schema: "inkstone-marketplace@1";
  updatedAt: string;
  plugins: MarketplaceEntry[];
}

export interface FetchedPlugin {
  manifest: PluginManifest;
  source: string;
  entry: MarketplaceEntry;
}

const DEFAULT_INDEX_URL = "https://plugins.inkstone.app/index.json";

export async function fetchMarketplaceIndex(url: string = DEFAULT_INDEX_URL): Promise<MarketplaceIndex> {
  const res = await fetch(url, { method: "GET", credentials: "omit", redirect: "follow" });
  if (!res.ok) throw new Error(`Marketplace fetch failed: ${res.status}`);
  const json = (await res.json()) as MarketplaceIndex;
  if (json.schema !== "inkstone-marketplace@1") {
    throw new Error(`Unknown marketplace schema: ${json.schema as string}`);
  }
  return json;
}

export async function downloadPlugin(entry: MarketplaceEntry): Promise<FetchedPlugin> {
  const [manifestRes, sourceRes] = await Promise.all([
    fetch(entry.manifestUrl, { credentials: "omit" }),
    fetch(entry.sourceUrl, { credentials: "omit" }),
  ]);
  if (!manifestRes.ok) throw new Error(`Manifest download failed: ${manifestRes.status}`);
  if (!sourceRes.ok) throw new Error(`Source download failed: ${sourceRes.status}`);

  const source = await sourceRes.text();
  const sha = await sha256Hex(new TextEncoder().encode(source));
  if (sha !== entry.sourceSha256.toLowerCase()) {
    throw new Error(`Integrity check failed for ${entry.id}`);
  }

  const manifest = parseManifest(await manifestRes.json());
  if (manifest.id !== entry.id) {
    throw new Error(`Manifest id mismatch: expected ${entry.id}, got ${manifest.id}`);
  }
  // Marketplace plugins are never trusted, regardless of the manifest flag.
  manifest.trusted = false;
  return { manifest, source, entry };
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}
