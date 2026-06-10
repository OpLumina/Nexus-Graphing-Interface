import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useStore } from "../../store";
const TOOL_ID = "reflect";
const GOLD = "#ffc935";
const FAINT = "rgba(255,255,255,0.4)";
const label = { color: FAINT, fontSize: 11 };
const mono = { fontFamily: "monospace", fontSize: 12, color: "#e8e8e8" };
const grid = { display: "grid", gridTemplateColumns: "110px 1fr", rowGap: 2, marginTop: 4 };
export function ReflectPanel({ entry }) {
    const runTool = useStore(s => s.runTool);
    const clearToolResult = useStore(s => s.clearToolResult);
    const toolResults = useStore(s => s.toolResults);
    const [loading, setLoading] = useState(false);
    const resultKey = `${TOOL_ID}:${entry.id}`;
    const result = toolResults[resultKey];
    const data = result?.data;
    if (entry.parsed.type !== "reflect")
        return null;
    const { expr1, expr2 } = entry.parsed;
    useEffect(() => () => { clearToolResult(resultKey); }, []);
    const handleCompute = async () => {
        setLoading(true);
        await runTool(TOOL_ID, {}, entry.id);
        setLoading(false);
    };
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }, children: [_jsxs("span", { style: { color: FAINT, fontSize: 12 }, children: ["reflect(", _jsx("span", { style: { color: "#e8e8e8" }, children: expr1 }), ",", " ", _jsx("span", { style: { color: "#e8e8e8" }, children: expr2 }), ")"] }), _jsx("button", { onClick: handleCompute, disabled: loading, style: btn("#61acff"), children: loading ? "…" : "Compute" })] }), result?.error && (_jsx("div", { style: { color: "#ff6b6b", fontSize: 11, marginBottom: 6 }, children: result.error })), data?.both_nonlinear && (data.intersections.length > 0) && (_jsx("div", { style: { color: GOLD, fontSize: 11, marginBottom: 6 }, children: "Both curves \u2014 tangent lines shown at each intersection." })), data?.intersections.map((pt, i) => (_jsxs("div", { style: {
                    marginBottom: 8, padding: "6px 8px",
                    background: "rgba(255,255,255,0.04)", borderRadius: 4,
                }, children: [_jsxs("div", { style: { ...label, marginBottom: 2 }, children: ["Intersection ", i + 1] }), _jsxs("div", { style: { ...mono, marginBottom: 4 }, children: ["(", pt.x.toFixed(4), ", ", pt.y.toFixed(4), ")"] }), _jsxs("div", { style: grid, children: [_jsxs("span", { style: label, children: ["slope ", expr1] }), _jsx("span", { style: { ...mono, fontSize: 11 }, children: pt.slope1.toFixed(5) }), _jsxs("span", { style: label, children: ["slope ", expr2] }), _jsx("span", { style: { ...mono, fontSize: 11 }, children: pt.slope2.toFixed(5) }), pt.reflect_slope != null && (_jsxs(_Fragment, { children: [_jsx("span", { style: { ...label, color: GOLD }, children: "reflected slope" }), _jsx("span", { style: { ...mono, fontSize: 11, color: GOLD }, children: pt.reflect_slope.toFixed(5) })] }))] })] }, i))), !loading && !result && (_jsx("div", { style: { color: "rgba(255,255,255,0.25)", fontSize: 11 }, children: "Press Compute to find intersections." }))] }));
}
function btn(color) {
    return {
        background: "none", border: `1px solid ${color}`, color,
        borderRadius: 3, padding: "1px 8px", fontSize: 11, cursor: "pointer",
    };
}
