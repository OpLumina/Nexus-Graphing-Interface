import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useStore } from "../../store";
import { ExpressionRow } from "./ExpressionRow";
import { Slider } from "./Slider";
export function ExpressionPanel() {
    const expressions = useStore(s => s.expressions);
    const sliders = useStore(s => s.sliders);
    const addExpression = useStore(s => s.addExpression);
    return (_jsxs("div", { style: {
            width: 320, minWidth: 240, maxWidth: 480,
            height: "100%", display: "flex", flexDirection: "column",
            background: "#1e1e1e", borderRight: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
        }, children: [_jsx("div", { style: {
                    padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)",
                    letterSpacing: "0.05em", userSelect: "none",
                }, children: "NEXUSGRAPH" }), _jsxs("div", { style: { flex: 1, overflowY: "auto", overflowX: "hidden" }, children: [expressions.map((e, i) => (_jsx(ExpressionRow, { entry: e, index: i }, e.id))), _jsx("button", { onClick: addExpression, style: {
                            width: "100%", padding: "10px 16px", background: "none",
                            border: "none", borderTop: "1px solid rgba(255,255,255,0.06)",
                            color: "rgba(255,255,255,0.3)", cursor: "pointer",
                            textAlign: "left", fontSize: 13,
                        }, children: "+ Add expression" })] }), sliders.length > 0 && (_jsxs("div", { style: { borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0" }, children: [_jsx("div", { style: {
                            padding: "4px 16px 8px", fontSize: 11,
                            color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em",
                        }, children: "PARAMETERS" }), sliders.map(s => _jsx(Slider, { slider: s }, s.name))] }))] }));
}
