import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useStore } from "../../store";
import { MathDisplay } from "../MathDisplay";
const label = { color: "rgba(255,255,255,0.4)", fontSize: 11, minWidth: 90 };
const value = { fontFamily: "monospace", fontSize: 12, color: "#e8e8e8" };
const row = { display: "flex", gap: 8, alignItems: "baseline", marginBottom: 3 };
function formatValue(v, precision) {
    if (v === null || v === undefined)
        return "—";
    if (Array.isArray(v))
        return v.length === 0 ? "none" : v.map(x => formatValue(x, precision)).join(", ");
    if (typeof v === "number") {
        if (!isFinite(v))
            return "undefined";
        return precision != null ? v.toPrecision(precision) : String(v);
    }
    return String(v);
}
export function GenericPanel({ entry, def }) {
    const runTool = useStore(s => s.runTool);
    const clearToolResult = useStore(s => s.clearToolResult);
    const toolResults = useStore(s => s.toolResults);
    const [loading, setLoading] = useState(false);
    const [showDocs, setShowDocs] = useState(false);
    const [inputs, setInputs] = useState(() => Object.fromEntries(def.inputs.map(i => [i.name, i.default ?? ""])));
    const resultKey = `${def.id}:${entry.id}`;
    const result = toolResults[resultKey];
    const isAutoRun = def.inputs.length === 0;
    const doRun = async () => {
        setLoading(true);
        await runTool(def.id, inputs, entry.id);
        setLoading(false);
    };
    const [autoRan, setAutoRan] = useState(false);
    if (isAutoRun && !autoRan && !result) {
        setAutoRan(true);
        void doRun();
    }
    const panelOutputs = def.outputs.panel ?? [];
    return (_jsxs("div", { children: [def.inputs.length > 0 && (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }, children: [def.inputs.map(inp => (_jsxs("label", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("span", { style: label, children: inp.label ?? inp.name }), _jsx("input", { type: inp.type === "number" ? "number" : "text", value: String(inputs[inp.name] ?? ""), onChange: e => setInputs(prev => ({ ...prev, [inp.name]: inp.type === "number" ? parseFloat(e.target.value) : e.target.value })), style: {
                                    width: 64, background: "rgba(255,255,255,0.07)",
                                    border: "1px solid rgba(255,255,255,0.15)", borderRadius: 3,
                                    color: "#e8e8e8", fontFamily: "monospace", fontSize: 12,
                                    padding: "1px 4px", outline: "none",
                                } })] }, inp.name))), _jsx("button", { onClick: doRun, disabled: loading, style: btnStyle("#61acff"), children: loading ? "…" : "Run" }), result && (_jsx("button", { onClick: () => clearToolResult(resultKey), style: btnStyle("rgba(255,255,255,0.3)"), children: "Clear" }))] })), result?.error && (_jsx("div", { style: { color: "#ff6b6b", fontSize: 11, marginBottom: 6 }, children: result.error })), result?.ok && panelOutputs.map((spec, i) => {
                if (spec.type === "value") {
                    const parts = (spec.value ?? "").replace(/^result\./, "").split(".");
                    let resolved = result.data;
                    for (const p of parts)
                        resolved = resolved?.[p];
                    return (_jsxs("div", { style: row, children: [_jsx("span", { style: label, children: spec.label }), _jsx("span", { style: value, children: formatValue(resolved, spec.precision) })] }, i));
                }
                if (spec.type === "latex") {
                    const parts = (spec.value ?? "").replace(/^result\./, "").split(".");
                    let resolved = result.data;
                    for (const p of parts)
                        resolved = resolved?.[p];
                    return (_jsxs("div", { style: { ...row, alignItems: "center" }, children: [spec.label && _jsx("span", { style: label, children: spec.label }), _jsx(MathDisplay, { latex: String(resolved ?? ""), displayMode: spec.displayMode ?? false, style: { fontSize: spec.displayMode ? 15 : 13 } })] }, i));
                }
                if (spec.type === "table") {
                    const rows = result.data.rows ?? [];
                    return (_jsxs("table", { style: { borderCollapse: "collapse", width: "100%", marginBottom: 4 }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { ...label, padding: "2px 8px", textAlign: "left" }, children: "x" }), _jsx("th", { style: { ...label, padding: "2px 8px", textAlign: "right" }, children: "f(x)" })] }) }), _jsx("tbody", { children: rows.map(r => (_jsxs("tr", { children: [_jsx("td", { style: { ...value, padding: "1px 8px", textAlign: "left" }, children: r.x }), _jsx("td", { style: { ...value, padding: "1px 8px", textAlign: "right" }, children: isFinite(r.y) ? r.y.toPrecision(5) : _jsx("span", { style: { color: "rgba(255,255,255,0.3)" }, children: "undef" }) })] }, r.x))) })] }, i));
                }
                return null;
            }), def.docs && (_jsxs("div", { style: { marginTop: 6 }, children: [_jsx("button", { onClick: () => setShowDocs(v => !v), style: {
                            background: "none", border: "none", color: "rgba(255,255,255,0.25)",
                            fontSize: 10, cursor: "pointer", padding: 0, letterSpacing: "0.05em",
                        }, children: showDocs ? "▲ hide docs" : "▼ docs" }), showDocs && (_jsx("div", { style: {
                            marginTop: 6, padding: "8px 10px",
                            background: "rgba(255,255,255,0.03)", borderRadius: 4,
                            borderLeft: "2px solid rgba(255,255,255,0.1)",
                            fontSize: 11, color: "rgba(255,255,255,0.5)",
                            fontFamily: "system-ui, sans-serif", lineHeight: 1.6,
                        }, children: _jsx(ReactMarkdown, { disallowedElements: ["script", "iframe", "object", "embed", "form", "input", "button"], unwrapDisallowed: true, children: def.docs }) }))] }))] }));
}
function btnStyle(color) {
    return {
        background: "none", border: `1px solid ${color}`, color,
        borderRadius: 3, padding: "1px 7px", fontSize: 11, cursor: "pointer",
    };
}
