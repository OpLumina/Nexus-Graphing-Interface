import type { PluginManifest, InstalledPlugin, MarketplaceRegistry } from "./types";
import type { ToolDefinition } from "../tools/types";
import { BUNDLED_PLUGINS, getBundledManifest } from "./bundled";

const STORAGE_KEY = "nexus.plugins";

export function loadInstalledPlugins(): InstalledPlugin[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as InstalledPlugin[]) : [];
  } catch {
    return [];
  }
}

function saveInstalledPlugins(plugins: InstalledPlugin[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins));
}

export function installPlugin(
  manifest: PluginManifest,
  source: InstalledPlugin["source"],
  sourceUrl?: string,
): { ok: boolean; error?: string } {
  const validation = validateManifest(manifest);
  if (!validation.ok) return validation;

  const plugins = loadInstalledPlugins();
  const existing = plugins.findIndex(p => p.manifest.id === manifest.id);

  const record: InstalledPlugin = {
    manifest,
    installedAt: new Date().toISOString(),
    enabled: true,
    source,
    sourceUrl,
  };

  if (existing >= 0) {
    plugins[existing] = record;
  } else {
    plugins.push(record);
  }

  saveInstalledPlugins(plugins);
  return { ok: true };
}

export function uninstallPlugin(id: string): void {
  const plugins = loadInstalledPlugins().filter(p => p.manifest.id !== id);
  saveInstalledPlugins(plugins);
}

export function setPluginEnabled(id: string, enabled: boolean): void {
  const plugins = loadInstalledPlugins().map(p =>
    p.manifest.id === id ? { ...p, enabled } : p
  );
  saveInstalledPlugins(plugins);
}

export async function fetchAndInstallPlugin(
  url: string,
): Promise<{ ok: boolean; error?: string; name?: string }> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const manifest = await res.json() as PluginManifest;
    const result = installPlugin(manifest, "url", url);
    return result.ok ? { ok: true, name: manifest.name } : result;
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function installFromFile(file: File): Promise<{ ok: boolean; error?: string; name?: string }> {
  try {
    const text = await file.text();
    const manifest = JSON.parse(text) as PluginManifest;
    const result = installPlugin(manifest, "file");
    return result.ok ? { ok: true, name: manifest.name } : result;
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export function getRegistryUrl(): string {
  return localStorage.getItem("nexus.registry_url") ?? BUILTIN_REGISTRY_URL;
}

export function setRegistryUrl(url: string): void {
  localStorage.setItem("nexus.registry_url", url);
}

export const BUILTIN_REGISTRY_URL = "";

// Local registry built from the plugin pack bundled with the app.
// No network needed — install copies the manifest straight into localStorage.
export const BUILTIN_REGISTRY: MarketplaceRegistry = {
  version: 1,
  updated: "2026-06-10",
  plugins: BUNDLED_PLUGINS.map(m => ({
    id: m.id,
    name: m.name,
    version: m.version,
    author: m.author,
    description: m.description,
    tags: m.tags ?? [],
    url: "",                       // empty url = bundled, installed locally
    requiresBackend: m.requiresBackend ?? false,
  })),
};

/** Install a plugin that ships with the app (no fetch). */
export function installBundled(id: string): { ok: boolean; error?: string; name?: string } {
  const manifest = getBundledManifest(id);
  if (!manifest) return { ok: false, error: `No bundled plugin with id "${id}"` };
  const result = installPlugin(manifest, "marketplace");
  return result.ok ? { ok: true, name: manifest.name } : result;
}

export async function fetchRegistry(): Promise<MarketplaceRegistry> {
  const url = getRegistryUrl();
  if (!url) return BUILTIN_REGISTRY;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as MarketplaceRegistry;
  } catch {
    return BUILTIN_REGISTRY;
  }
}

export function pluginToolsToDefinitions(plugin: InstalledPlugin): ToolDefinition[] {
  if (!plugin.enabled) return [];

  return plugin.manifest.tools.map(t => ({
    id:          t.id,
    label:       t.label,
    description: t.description,
    category:    t.category as ToolDefinition["category"],
    appliesTo:   t.appliesTo as ToolDefinition["appliesTo"],
    inputs:      t.inputs,
    operation:   t.operation as ToolDefinition["operation"],
    outputs:     t.outputs,
    docs:        t.docs ?? "",
    pluginId:    plugin.manifest.id,
  } satisfies ToolDefinition));
}

function validateManifest(m: PluginManifest): { ok: boolean; error?: string } {
  if (!m.id?.match(/^[\w.-]+$/))    return { ok: false, error: "Invalid plugin id (use letters, numbers, dots, dashes)" };
  if (!m.version?.match(/^\d+\.\d+\.\d+$/)) return { ok: false, error: "Version must be semver (e.g. 1.0.0)" };
  if (!m.name)                       return { ok: false, error: "Missing name" };
  if (!m.author)                     return { ok: false, error: "Missing author" };
  if (!Array.isArray(m.tools))       return { ok: false, error: "tools must be an array" };
  for (const t of m.tools) {
    if (!t.id || !t.label)           return { ok: false, error: `Tool ${t.id ?? "?"} missing id or label` };
    if (!t.operation?.type)          return { ok: false, error: `Tool ${t.id} missing operation.type` };
    if (t.operation.type === "inline" && !t.operation.js)
                                     return { ok: false, error: `Tool ${t.id} inline op missing js` };
  }
  return { ok: true };
}
