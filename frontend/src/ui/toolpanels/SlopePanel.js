import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useStore } from "../../store";
import { getToolDef } from "../../tools/loader";
const TOOL_ID = "slope";
const labelStyle = { color: "rgba(255,255,255,0.4)", fontSize: 11 };
const monoStyle = { fontFamily: "monospace", fontSize: 12, color: "#e8e8e8" };
export function SlopePanel({ entry }) {
    const runTool = useStore(s => s.runTool);
    const clearToolResult = useStore(s => s.clearToolResult);
    const toolResults = useStore(s => s.toolResults);
    const [xInput, setXInput] = useState("0");
    const [loading, setLoading] = useState(false);
    const resultKey = `${TOOL_ID}:${entry.id}`;
    const result = toolResults[resultKey];
    const slope = result?.data?.slope;
    const y = result?.data?.y;
    useEffect(() => () => { clearToolResult(resultKey); }, []);
    const handleSet = async () => {
        const x = parseFloat(xInput);
        if (!isNaN(x)) {
            setLoading(true);
            await runTool(TOOL_ID, { x }, entry.id);
            setLoading(false);
        }
    };
    const def = getToolDef(TOOL_ID);
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }, children: [_jsx("span", { style: labelStyle, children: def?.inputs[0]?.label ?? "x =" }), _jsx("input", { type: "number", value: xInput, onChange: e => setXInput(e.target.value), onKeyDown: e => { if (e.key === "Enter")
                            void handleSet(); }, style: {
                            width: 64, background: "rgba(255,255,255,0.07)",
                            border: "1px solid rgba(255,255,255,0.15)", borderRadius: 3,
                            color: "#e8e8e8", fontFamily: "monospace", fontSize: 12,
                            padding: "1px 4px", outline: "none",
                        } }), _jsx("button", { onClick: handleSet, disabled: loading, style: btn("#61acff"), children: loading ? "…" : "Set" }), result && (_jsx("button", { onClick: () => clearToolResult(resultKey), style: btn("rgba(255,255,255,0.3)"), children: "Clear" }))] }), result?.error && (_jsx("div", { style: { color: "#ff6b6b", fontSize: 11, marginTop: 4 }, children: result.error })), result?.ok && slope !== undefined && (_jsxs("div", { style: { marginTop: 6, display: "grid", gridTemplateColumns: "90px 1fr", rowGap: 2 }, children: [_jsx("span", { style: labelStyle, children: "slope" }), _jsx("span", { style: { ...monoStyle, color: entry.color }, children: isFinite(slope) ? slope.toPrecision(6) : "undefined" }), _jsx("span", { style: labelStyle, children: "y" }), _jsx("span", { style: monoStyle, children: y !== undefined && isFinite(y) ? y.toPrecision(6) : "undefined" })] }))] }));
}
function btn(color) {
    return {
        background: "none", border: `1px solid ${color}`, color,
        borderRadius: 3, padding: "1px 7px", fontSize: 11, cursor: "pointer",
    };
}
