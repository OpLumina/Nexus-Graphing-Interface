import type { PluginManifest, InstalledPlugin, MarketplaceRegistry } from "./types";
import type { ToolDefinition } from "../tools/types";
import { BUNDLED_PLUGINS, getBundledManifest } from "./bundled";
import { resolveInlineJs, verifyInlineIntegrity } from "./integrity";

// NexusGraph is a LOCAL-ONLY app. Plugins are never fetched over the network:
// the only sources are (a) the plugin pack bundled with the build and (b) a
// local .ngplugin.json file the user explicitly picks — and even then only
// after the consent warning in the Marketplace (SEC-2). The CSP connect-src
// (index.html) additionally blocks any outbound fetch to non-backend hosts.

export { getBundledManifest };

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

/**
 * Read + validate a local plugin file WITHOUT installing it, so the UI can show
 * the consent warning first. Installation is a separate, explicit step.
 */
export async function parsePluginFile(
  file: File,
): Promise<{ ok: boolean; error?: string; manifest?: PluginManifest }> {
  try {
    const text = await file.text();
    const manifest = JSON.parse(text) as PluginManifest;
    const validation = validateManifest(manifest);
    if (!validation.ok) return validation;
    // BP-4: enforce any declared integrity digests before the file is trusted
    // enough to install. A tool without `integrity` is accepted (back-compat),
    // but a present-and-wrong digest means the source was altered → reject.
    for (const t of manifest.tools) {
      if (t.operation.type === "inline" && t.operation.integrity) {
        const source = resolveInlineJs(t.operation.js);
        const ok = await verifyInlineIntegrity(source, t.operation.integrity);
        if (!ok) return { ok: false, error: `Tool ${t.id}: integrity check failed (js source does not match digest)` };
      }
    }
    return { ok: true, manifest };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

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

/** Local-only: always the bundled registry, no network. */
export function getRegistry(): MarketplaceRegistry {
  return BUILTIN_REGISTRY;
}

export function pluginToolsToDefinitions(plugin: InstalledPlugin): ToolDefinition[] {
  if (!plugin.enabled) return [];

  return plugin.manifest.tools.map(t => {
    // BP-4: collapse an inline `js` line-array into the single string the sandbox
    // runs, so the runtime (runner.ts → runSandboxed) never sees the array form.
    const operation = t.operation.type === "inline"
      ? { type: "inline" as const, js: resolveInlineJs(t.operation.js) }
      : (t.operation as ToolDefinition["operation"]);
    return {
      id:          t.id,
      label:       t.label,
      description: t.description,
      category:    t.category as ToolDefinition["category"],
      appliesTo:   t.appliesTo as ToolDefinition["appliesTo"],
      inputs:      t.inputs,
      operation,
      outputs:     t.outputs,
      docs:        t.docs ?? "",
      pluginId:    plugin.manifest.id,
    } satisfies ToolDefinition;
  });
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
    if (t.operation.type === "inline") {
      // BP-4: js may be a string or a non-empty array of source lines.
      const js = t.operation.js;
      const okJs = typeof js === "string"
        ? js.length > 0
        : Array.isArray(js) && js.length > 0 && js.every(line => typeof line === "string");
      if (!okJs) return { ok: false, error: `Tool ${t.id} inline op missing or malformed js` };
    }
  }
  return { ok: true };
}
