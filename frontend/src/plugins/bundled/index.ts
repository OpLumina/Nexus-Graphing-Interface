// Bundled plugin pack — ships with the app, installable offline from the
// Marketplace "browse" tab. Each *.plugin.ts exports `manifest: PluginManifest`.
import type { PluginManifest } from "../types";

const modules = import.meta.glob("./*.plugin.ts", {
  eager: true,
  import: "manifest",
}) as Record<string, PluginManifest>;

export const BUNDLED_PLUGINS: PluginManifest[] = Object.values(modules)
  .sort((a, b) => a.name.localeCompare(b.name));

export function getBundledManifest(id: string): PluginManifest | undefined {
  return BUNDLED_PLUGINS.find(p => p.id === id);
}
