import type { ToolDefinition } from "./types";
import { loadInstalledPlugins, pluginToolsToDefinitions } from "../plugins/manager";

const RAW_TOOLS = import.meta.glob("./*.tool.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function parse(raw: string): ToolDefinition | null {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) {
    console.warn("[tools/loader] Missing --- front matter block in tool file");
    return null;
  }
  try {
    const def = JSON.parse(match[1]) as ToolDefinition;
    def.docs = match[2].trim();
    return def;
  } catch (e) {
    console.warn("[tools/loader] Failed to parse tool front matter:", e);
    return null;
  }
}

const BUILTIN_TOOLS: ToolDefinition[] = Object.entries(RAW_TOOLS)
  .map(([, raw]) => parse(raw))
  .filter((d): d is ToolDefinition => d !== null);

function loadPluginTools(): ToolDefinition[] {
  return loadInstalledPlugins().flatMap(pluginToolsToDefinitions);
}

export function getAllToolDefinitions(): ToolDefinition[] {
  return [...BUILTIN_TOOLS, ...loadPluginTools()];
}

export const TOOL_DEFINITIONS: ToolDefinition[] = getAllToolDefinitions();

export function getToolDef(id: string): ToolDefinition | undefined {
  return getAllToolDefinitions().find(d => d.id === id);
}

export function toolsForType(type: string): ToolDefinition[] {
  return getAllToolDefinitions().filter(d => d.appliesTo.includes(type as never));
}
