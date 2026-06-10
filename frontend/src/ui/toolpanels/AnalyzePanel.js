import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useStore } from "../../store";
import { MathDisplay } from "../MathDisplay";
const dim = { color: "rgba(255,255,255,0.35)", fontSize: 11 };
const mono = { fontFamily: "monospace", fontSize: 12, color: "#e8e8e8" };
const badge = (color) => ({
    background: color + "22", border: `1px solid ${color}55`,
    borderRadius: 3, padding: "1px 5px", fontSize: 10, color,
});
function PointChip({ cp }) {
    const color = cp.type === "min" ? "#6be08e" : cp.type === "max" ? "#ff6b6b" : "#ffc935";
    const xStr = typeof cp.x === "number" ? cp.x.toPrecision(5) : String(cp.x);
    const yStr = cp.y !== undefined && isFinite(cp.y) ? cp.y.toPrecision(5) : null;
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }, children: [_jsx("span", { style: badge(color), children: cp.type }), _jsxs("span", { style: mono, children: ["x = ", xStr] }), yStr && _jsxs("span", { style: { ...mono, ...dim }, children: ["  y = ", yStr] })] }));
}
export function AnalyzePanel({ entry, def }) {
    const runTool = useStore(s => s.runTool);
    const clearToolResult = useStore(s => s.clearToolResult);
    const toolResults = useStore(s => s.toolResults);
    const [loading, setLoading] = useState(false);
    const [autoRan, setAutoRan] = useState(false);
    const [expanded, setExpanded] = useState({});
    const resultKey = `${def.id}:${entry.id}`;
    const result = toolResults[resultKey];
    const doRun = async () => {
        setLoading(true);
        await runTool(def.id, {}, entry.id);
        setLoading(false);
    };
    if (!autoRan && !result) {
        setAutoRan(true);
        void doRun();
    }
    if (!result) {
        return _jsx("div", { style: { ...dim, padding: "4px 0" }, children: loading ? "Analyzing…" : "—" });
    }
    if (!result.ok) {
        return _jsx("div", { style: { color: "#ff6b6b", fontSize: 11 }, children: result.error });
    }
    const data = result.data;
    const toggle = (k) => setExpanded(e => ({ ...e, [k]: !e[k] }));
    const Section = ({ id, title, count, children }) => (_jsxs("div", { style: { marginBottom: 6 }, children: [_jsxs("button", { onClick: () => toggle(id), style: { background: "none", border: "none", cursor: "pointer", padding: 0,
                    display: "flex", alignItems: "center", gap: 6, width: "100%" }, children: [_jsx("span", { style: { ...dim, fontSize: 10 }, children: expanded[id] ? "▾" : "▸" }), _jsx("span", { style: { fontSize: 12, color: "#c8c8c8" }, children: title }), _jsxs("span", { style: { ...dim, marginLeft: "auto" }, children: ["(", count, ")"] })] }), expanded[id] && _jsx("div", { style: { paddingLeft: 14, paddingTop: 4 }, children: children })] }));
    return (_jsxs("div", { children: [_jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("div", { style: { ...dim, marginBottom: 2 }, children: "f\u2032(x)" }), _jsx(MathDisplay, { latex: data.derivative_latex, displayMode: true })] }), _jsx(Section, { id: "roots", title: "Roots", count: data.roots.length, children: data.roots.length === 0
                    ? _jsx("span", { style: dim, children: "No real roots found" })
                    : data.roots.map((r, i) => (_jsxs("div", { style: { ...mono, marginBottom: 2 }, children: ["x = ", typeof r === "number" ? r.toPrecision(6) : String(r)] }, i))) }), _jsx(Section, { id: "critical", title: "Critical Points", count: data.critical_points.length, children: data.critical_points.length === 0
                    ? _jsx("span", { style: dim, children: "None" })
                    : data.critical_points.map((cp, i) => _jsx(PointChip, { cp: cp }, i)) }), _jsx(Section, { id: "inflect", title: "Inflection Points", count: data.inflection_points.length, children: data.inflection_points.length === 0
                    ? _jsx("span", { style: dim, children: "None" })
                    : data.inflection_points.map((p, i) => (_jsxs("div", { style: { ...mono, marginBottom: 2 }, children: ["x = ", typeof p === "number" ? p.toPrecision(6) : String(p)] }, i))) }), _jsx(Section, { id: "deriv2", title: "f\u2033(x)", count: 0, children: _jsx(MathDisplay, { latex: data.second_derivative_latex, displayMode: true }) }), _jsxs("div", { style: { display: "flex", gap: 6, marginTop: 6 }, children: [_jsx("button", { onClick: doRun, disabled: loading, style: btn("#61acff"), children: loading ? "…" : "Refresh" }), _jsx("button", { onClick: () => clearToolResult(resultKey), style: btn("rgba(255,255,255,0.3)"), children: "Clear" })] })] }));
}
function btn(color) {
    return { background: "none", border: `1px solid ${color}`, color,
        borderRadius: 3, padding: "1px 7px", fontSize: 11, cursor: "pointer" };
}
