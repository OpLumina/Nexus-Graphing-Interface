import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { fetchRegistry, fetchAndInstallPlugin, installFromFile, loadInstalledPlugins, uninstallPlugin, setPluginEnabled, getRegistryUrl, setRegistryUrl, } from "../plugins/manager";
const TAG_COLORS = {
    calculus: "#61acff", series: "#6be08e", "signal processing": "#cc73ff",
    complex: "#ffc935", visualization: "#ff8c33", "differential equations": "#ff6b6b",
    dynamics: "#38e0e0", statistics: "#ff74c8", data: "#61acff",
};
function Tag({ label }) {
    const color = TAG_COLORS[label] ?? "rgba(255,255,255,0.3)";
    return (_jsx("span", { style: {
            fontSize: 10, padding: "1px 6px", borderRadius: 10,
            background: color + "22", border: `1px solid ${color}55`, color,
        }, children: label }));
}
export function Marketplace({ onClose }) {
    const [tab, setTab] = useState("browse");
    const [registry, setRegistry] = useState([]);
    const [installed, setInstalled] = useState([]);
    const [search, setSearch] = useState("");
    const [installing, setInstalling] = useState(null);
    const [status, setStatus] = useState(null);
    const [urlInput, setUrlInput] = useState("");
    const [regInput, setRegInput] = useState(getRegistryUrl());
    const fileRef = useRef(null);
    useEffect(() => {
        fetchRegistry().then(r => setRegistry(r.plugins));
        setInstalled(loadInstalledPlugins());
    }, []);
    const refresh = () => setInstalled(loadInstalledPlugins());
    const isInstalled = (id) => installed.some(p => p.manifest.id === id);
    const doInstallUrl = async (url) => {
        if (!url.trim())
            return;
        setInstalling(url);
        const res = await fetchAndInstallPlugin(url.trim());
        setStatus({ id: url, msg: res.ok ? `Installed "${res.name}" — restart to activate` : (res.error ?? "Failed"), ok: res.ok ?? false });
        refresh();
        setInstalling(null);
    };
    const doInstallFile = async (file) => {
        const res = await installFromFile(file);
        setStatus({ id: file.name, msg: res.ok ? `Installed "${res.name}" — restart to activate` : (res.error ?? "Failed"), ok: res.ok ?? false });
        refresh();
    };
    const doUninstall = (id) => {
        uninstallPlugin(id);
        refresh();
    };
    const doToggle = (id, enabled) => {
        setPluginEnabled(id, enabled);
        refresh();
    };
    const filtered = registry.filter(p => !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.tags.some(t => t.includes(search.toLowerCase())));
    return (_jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 2000 }, onClick: onClose, children: _jsxs("div", { style: { background: "#1e1e1e", borderRadius: 10, width: 640, maxHeight: "80vh",
                boxShadow: "0 24px 64px rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.1)",
                display: "flex", flexDirection: "column", overflow: "hidden" }, onClick: e => e.stopPropagation(), children: [_jsxs("div", { style: { padding: "16px 20px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 16, fontWeight: 600, color: "#e8e8e8" }, children: "Plugin Marketplace" }), _jsx("div", { style: { fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }, children: "Extend NexusGraph with community tools" })] }), _jsx("button", { onClick: onClose, style: { background: "none", border: "none", color: "rgba(255,255,255,0.4)",
                                        fontSize: 18, cursor: "pointer", padding: 4 }, children: "\u2715" })] }), _jsx("div", { style: { display: "flex", gap: 0 }, children: ["browse", "installed", "import"].map(t => (_jsxs("button", { onClick: () => setTab(t), style: {
                                    background: "none", border: "none", cursor: "pointer",
                                    padding: "6px 14px", fontSize: 12,
                                    color: tab === t ? "#61acff" : "rgba(255,255,255,0.4)",
                                    borderBottom: tab === t ? "2px solid #61acff" : "2px solid transparent",
                                    textTransform: "capitalize",
                                }, children: [t, t === "installed" && installed.length > 0 ? ` (${installed.length})` : ""] }, t))) })] }), status && (_jsxs("div", { style: { padding: "8px 20px", background: status.ok ? "rgba(107,224,142,0.1)" : "rgba(255,107,107,0.1)",
                        borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 12,
                        color: status.ok ? "#6be08e" : "#ff6b6b", display: "flex", justifyContent: "space-between" }, children: [status.msg, _jsx("button", { onClick: () => setStatus(null), style: { background: "none", border: "none",
                                color: "inherit", cursor: "pointer", fontSize: 11 }, children: "dismiss" })] })), _jsxs("div", { style: { flex: 1, overflowY: "auto", padding: 20 }, children: [tab === "browse" && (_jsxs("div", { children: [_jsx("input", { value: search, onChange: e => setSearch(e.target.value), placeholder: "Search plugins\u2026", style: { width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                                        borderRadius: 5, color: "#e8e8e8", padding: "7px 10px", fontSize: 13, outline: "none",
                                        marginBottom: 14, boxSizing: "border-box" } }), filtered.length === 0 && (_jsx("div", { style: { color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", padding: 24 }, children: "No plugins found" })), filtered.map(p => (_jsx("div", { style: { background: "rgba(255,255,255,0.04)", borderRadius: 7,
                                        padding: "12px 14px", marginBottom: 10, border: "1px solid rgba(255,255,255,0.06)" }, children: _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }, children: [_jsx("span", { style: { fontSize: 14, fontWeight: 500, color: "#e8e8e8" }, children: p.name }), _jsxs("span", { style: { fontSize: 10, color: "rgba(255,255,255,0.3)" }, children: ["v", p.version] }), p.requiresBackend && (_jsx("span", { style: { fontSize: 10, color: "#ffc935", background: "#ffc93518",
                                                                    border: "1px solid #ffc93540", borderRadius: 3, padding: "0 4px" }, children: "needs backend" }))] }), _jsx("div", { style: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }, children: p.description }), _jsx("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" }, children: p.tags.map(t => _jsx(Tag, { label: t }, t)) }), _jsxs("div", { style: { fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 5 }, children: ["by ", p.author] })] }), _jsx("div", { style: { marginLeft: 12 }, children: isInstalled(p.id) ? (_jsx("span", { style: { fontSize: 11, color: "#6be08e", padding: "3px 8px",
                                                        background: "rgba(107,224,142,0.1)", borderRadius: 4, border: "1px solid rgba(107,224,142,0.3)" }, children: "\u2713 Installed" })) : (_jsx("button", { onClick: () => p.url ? doInstallUrl(p.url) : setStatus({ id: p.id, msg: "No download URL — this is a built-in demo entry. Install from URL tab.", ok: false }), disabled: installing === p.id, style: { background: "#61acff18", border: "1px solid #61acff55", color: "#61acff",
                                                        borderRadius: 4, padding: "3px 10px", fontSize: 11, cursor: "pointer" }, children: installing === p.id ? "Installing…" : "Install" })) })] }) }, p.id)))] })), tab === "installed" && (_jsx("div", { children: installed.length === 0 ? (_jsx("div", { style: { color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", padding: 32 }, children: "No plugins installed. Browse the marketplace or import from a file." })) : installed.map(p => (_jsx("div", { style: { background: "rgba(255,255,255,0.04)", borderRadius: 7,
                                    padding: "12px 14px", marginBottom: 10, border: "1px solid rgba(255,255,255,0.06)",
                                    opacity: p.enabled ? 1 : 0.5 }, children: _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsxs("div", { children: [_jsxs("div", { style: { fontSize: 13, fontWeight: 500, color: "#e8e8e8", marginBottom: 2 }, children: [p.manifest.name, _jsxs("span", { style: { fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 6 }, children: ["v", p.manifest.version] })] }), _jsxs("div", { style: { fontSize: 11, color: "rgba(255,255,255,0.4)" }, children: [p.manifest.tools.length, " tool", p.manifest.tools.length !== 1 ? "s" : "", " · ", "by ", p.manifest.author, " · ", _jsx("span", { style: { color: "rgba(255,255,255,0.25)" }, children: p.source })] })] }), _jsxs("div", { style: { display: "flex", gap: 6 }, children: [_jsx("button", { onClick: () => doToggle(p.manifest.id, !p.enabled), style: { background: "none", border: "1px solid rgba(255,255,255,0.2)",
                                                        color: "rgba(255,255,255,0.5)", borderRadius: 4, padding: "2px 8px",
                                                        fontSize: 11, cursor: "pointer" }, children: p.enabled ? "Disable" : "Enable" }), _jsx("button", { onClick: () => doUninstall(p.manifest.id), style: { background: "none", border: "1px solid rgba(255,107,107,0.4)",
                                                        color: "#ff6b6b", borderRadius: 4, padding: "2px 8px",
                                                        fontSize: 11, cursor: "pointer" }, children: "Remove" })] })] }) }, p.manifest.id))) })), tab === "import" && (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 20 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }, children: "Install from URL" }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("input", { value: urlInput, onChange: e => setUrlInput(e.target.value), placeholder: "https://example.com/my-plugin.ngplugin.json", style: { flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                                                        borderRadius: 5, color: "#e8e8e8", padding: "7px 10px", fontSize: 12, outline: "none" } }), _jsx("button", { onClick: () => doInstallUrl(urlInput), style: { background: "#61acff18", border: "1px solid #61acff55", color: "#61acff",
                                                        borderRadius: 5, padding: "0 14px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }, children: "Install" })] })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }, children: "Install from file" }), _jsx("input", { ref: fileRef, type: "file", accept: ".json,.ngplugin.json", style: { display: "none" }, onChange: e => { if (e.target.files?.[0])
                                                doInstallFile(e.target.files[0]); } }), _jsx("button", { onClick: () => fileRef.current?.click(), style: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
                                                color: "#e8e8e8", borderRadius: 5, padding: "8px 16px", fontSize: 12, cursor: "pointer" }, children: "Choose .ngplugin.json file\u2026" })] }), _jsxs("div", { style: { borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }, children: [_jsxs("div", { style: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }, children: ["Registry URL ", _jsx("span", { style: { color: "rgba(255,255,255,0.25)" }, children: "(advanced)" })] }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("input", { value: regInput, onChange: e => setRegInput(e.target.value), placeholder: "https://your-registry.com/registry.json", style: { flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                                                        borderRadius: 5, color: "#e8e8e8", padding: "7px 10px", fontSize: 12, outline: "none" } }), _jsx("button", { onClick: () => { setRegistryUrl(regInput); fetchRegistry().then(r => setRegistry(r.plugins)); }, style: { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
                                                        color: "#e8e8e8", borderRadius: 5, padding: "0 14px", fontSize: 12, cursor: "pointer" }, children: "Save" })] }), _jsx("div", { style: { fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 6 }, children: "Point to any hosted registry.json to use a custom or private plugin feed." })] }), _jsxs("div", { style: { background: "rgba(255,255,255,0.03)", borderRadius: 6,
                                        padding: 14, border: "1px solid rgba(255,255,255,0.06)" }, children: [_jsx("div", { style: { fontSize: 12, color: "#61acff", marginBottom: 8 }, children: "Creating a plugin" }), _jsx("pre", { style: { fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0,
                                                lineHeight: 1.6, overflowX: "auto" }, children: PLUGIN_TEMPLATE })] })] }))] }), _jsxs("div", { style: { padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.08)",
                        fontSize: 11, color: "rgba(255,255,255,0.25)", display: "flex", justifyContent: "space-between" }, children: [_jsx("span", { children: "Plugins take effect after reload  \u00B7  NexusGraph Plugin API v1" }), _jsxs("span", { children: [installed.filter(p => p.enabled).length, " active"] })] })] }) }));
}
const PLUGIN_TEMPLATE = `{
  "id": "your-name.plugin-name",
  "version": "1.0.0",
  "name": "My Tool",
  "author": "Your Name",
  "description": "What this plugin does",
  "tags": ["calculus"],
  "tools": [{
    "id": "my_tool",
    "label": "My Tool",
    "description": "...",
    "category": "calculus",
    "appliesTo": ["function", "expression"],
    "inputs": [
      { "name": "n", "type": "number", "label": "N", "default": 5 }
    ],
    "operation": {
      "type": "inline",
      "js": "function run(inputs, ctx) {\\n  // ctx.env, ctx.viewport, ctx.userFns\\n  // Math and utils available\\n  return { ok: true, data: { result: inputs.n * 2 } };\\n}"
    },
    "outputs": {
      "panel": [{ "type": "value", "label": "result", "value": "result.result" }]
    }
  }]
}`;
