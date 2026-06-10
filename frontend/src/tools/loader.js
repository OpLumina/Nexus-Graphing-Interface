import { loadInstalledPlugins, pluginToolsToDefinitions } from "../plugins/manager";
const RAW_TOOLS = import.meta.glob("./*.tool.md", {
    query: "?raw",
    import: "default",
    eager: true,
});
function parse(raw) {
    const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    if (!match) {
        console.warn("[tools/loader] Missing --- front matter block in tool file");
        return null;
    }
    try {
        const def = JSON.parse(match[1]);
        def.docs = match[2].trim();
        return def;
    }
    catch (e) {
        console.warn("[tools/loader] Failed to parse tool front matter:", e);
        return null;
    }
}
const BUILTIN_TOOLS = Object.entries(RAW_TOOLS)
    .map(([, raw]) => parse(raw))
    .filter((d) => d !== null);
function loadPluginTools() {
    return loadInstalledPlugins().flatMap(pluginToolsToDefinitions);
}
export function getAllToolDefinitions() {
    return [...BUILTIN_TOOLS, ...loadPluginTools()];
}
export const TOOL_DEFINITIONS = getAllToolDefinitions();
export function getToolDef(id) {
    return getAllToolDefinitions().find(d => d.id === id);
}
export function toolsForType(type) {
    return getAllToolDefinitions().filter(d => d.appliesTo.includes(type));
}
