import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useStore } from "../store";
import { serialise, deserialise } from "../project";
const LS_KEY = "nexusgraph.saves";
function relativeTime(mtime) {
    const diff = Date.now() - mtime;
    const mins = Math.floor(diff / 60000);
    if (mins < 1)
        return "just now";
    if (mins < 60)
        return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)
        return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}
function cleanName(name) {
    return name.replace(/\.(ngraph|ngp)$/, "");
}
function lsListSaves() {
    try {
        return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
    }
    catch {
        return [];
    }
}
function lsQuickSave(content) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const name = `graph-${ts}.ngraph`;
    const list = lsListSaves();
    list.unshift({ name, mtime: Date.now() });
    localStorage.setItem(LS_KEY, JSON.stringify(list));
    localStorage.setItem(`nexusgraph.save.${name}`, content);
    return name;
}
function lsLoadSave(name) {
    return localStorage.getItem(`nexusgraph.save.${name}`) ?? "";
}
export function LibraryDrawer({ open, onClose, onSaveAs }) {
    const expressions = useStore(s => s.expressions);
    const sliders = useStore(s => s.sliders);
    const viewport = useStore(s => s.viewport);
    const [saves, setSaves] = useState([]);
    const [toast, setToast] = useState(null);
    const refresh = async () => {
        if (window.electronAPI?.listSaves) {
            setSaves(await window.electronAPI.listSaves());
        }
        else {
            setSaves(lsListSaves());
        }
    };
    useEffect(() => {
        if (open)
            void refresh();
    }, [open]);
    const handleQuickSave = async () => {
        const content = serialise({ expressions, sliders, viewport });
        let name = null;
        if (window.electronAPI?.quickSave) {
            name = await window.electronAPI.quickSave(content);
        }
        else {
            name = lsQuickSave(content);
        }
        if (name) {
            setToast(`Saved: ${name}`);
            setTimeout(() => setToast(null), 2500);
            await refresh();
        }
    };
    const handleLoad = async (name) => {
        let content;
        if (window.electronAPI?.loadSave) {
            content = await window.electronAPI.loadSave(name);
        }
        else {
            content = lsLoadSave(name);
        }
        const data = deserialise(content);
        if (!data) {
            alert("Could not read file");
            return;
        }
        const store = useStore.getState();
        data.expressions.forEach(e => {
            store.addExpression();
            const added = useStore.getState().expressions.at(-1);
            store.updateExpression(added.id, e.raw);
        });
        store.setViewport(data.viewport);
        onClose();
    };
    if (!open)
        return null;
    return (_jsxs("div", { style: {
            position: "fixed", top: 36, left: 0, right: 0, zIndex: 20,
            background: "rgba(18,18,18,0.97)", borderBottom: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(8px)", maxHeight: "40vh", overflow: "hidden",
            display: "flex", flexDirection: "column",
        }, children: [_jsxs("div", { style: {
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                    flexShrink: 0,
                }, children: [_jsx("span", { style: { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em" }, children: "LIBRARY" }), _jsx("div", { style: { flex: 1 } }), toast && (_jsx("span", { style: { fontSize: 11, color: "#61acff" }, children: toast })), _jsx(LibBtn, { label: "Quick Save", onClick: handleQuickSave, color: "#61acff" }), _jsx(LibBtn, { label: "Save As\u2026", onClick: onSaveAs, color: "rgba(255,255,255,0.4)" }), _jsx(LibBtn, { label: "\u2715", onClick: onClose, color: "rgba(255,255,255,0.3)" })] }), _jsx("div", { style: {
                    overflowY: "auto", flex: 1, padding: "8px 16px",
                    display: "flex", flexWrap: "wrap", gap: 8, alignContent: "flex-start",
                }, children: saves.length === 0 ? (_jsx("span", { style: { fontSize: 11, color: "rgba(255,255,255,0.25)", padding: "8px 0" }, children: "No saved graphs yet \u2014 click Quick Save to save the current graph." })) : (saves.map(f => (_jsxs("button", { onClick: () => void handleLoad(f.name), style: {
                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6, padding: "6px 12px", cursor: "pointer", textAlign: "left",
                        display: "flex", flexDirection: "column", gap: 2, minWidth: 140,
                    }, children: [_jsx("span", { style: { fontSize: 12, color: "#e8e8e8", fontFamily: "monospace" }, children: cleanName(f.name) }), _jsx("span", { style: { fontSize: 10, color: "rgba(255,255,255,0.3)" }, children: relativeTime(f.mtime) })] }, f.name)))) })] }));
}
function LibBtn({ label, onClick, color }) {
    return (_jsx("button", { onClick: onClick, style: {
            background: "none", border: `1px solid ${color}`, color,
            borderRadius: 3, padding: "2px 8px", fontSize: 11, cursor: "pointer",
        }, children: label }));
}
