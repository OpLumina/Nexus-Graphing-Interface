import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useStore } from "../../store";
export function Slider({ slider }) {
    const setSliderValue = useStore(s => s.setSliderValue);
    const setSliderRange = useStore(s => s.setSliderRange);
    const [editingValue, setEditingValue] = useState(false);
    const [tempValue, setTempValue] = useState("");
    const commitValue = () => {
        const v = parseFloat(tempValue);
        if (isFinite(v))
            setSliderValue(slider.name, v);
        setEditingValue(false);
    };
    return (_jsxs("div", { style: { padding: "4px 16px 8px" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }, children: [_jsx("span", { style: { fontFamily: "monospace", fontSize: 13, color: "#e8e8e8", minWidth: 40 }, children: slider.name }), editingValue ? (_jsx("input", { autoFocus: true, value: tempValue, onChange: e => setTempValue(e.target.value), onBlur: commitValue, onKeyDown: e => {
                            if (e.key === "Enter")
                                commitValue();
                            if (e.key === "Escape")
                                setEditingValue(false);
                        }, style: {
                            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                            color: "#e8e8e8", fontFamily: "monospace", fontSize: 13,
                            width: 80, padding: "1px 4px", borderRadius: 3,
                        } })) : (_jsx("span", { onClick: () => { setEditingValue(true); setTempValue(String(slider.value)); }, style: { fontFamily: "monospace", fontSize: 13, color: "#61acff", cursor: "text", minWidth: 60 }, children: slider.value.toPrecision(4) }))] }), _jsx("input", { type: "range", min: slider.min, max: slider.max, step: slider.step, value: slider.value, onChange: e => setSliderValue(slider.name, parseFloat(e.target.value)), style: { width: "100%", accentColor: "#61acff" } }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.3)" }, children: [_jsx("span", { contentEditable: true, suppressContentEditableWarning: true, onBlur: e => {
                            const v = parseFloat(e.currentTarget.textContent ?? "");
                            if (isFinite(v))
                                setSliderRange(slider.name, v, slider.max);
                        }, style: { cursor: "text", outline: "none" }, children: slider.min }), _jsx("span", { contentEditable: true, suppressContentEditableWarning: true, onBlur: e => {
                            const v = parseFloat(e.currentTarget.textContent ?? "");
                            if (isFinite(v))
                                setSliderRange(slider.name, slider.min, v);
                        }, style: { cursor: "text", outline: "none" }, children: slider.max })] })] }));
}
