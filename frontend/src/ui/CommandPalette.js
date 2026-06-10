import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { useStore } from "../store";
import { defaultViewport } from "../renderer/viewport";
import { health } from "../api/calls";
export function CommandPalette({ onClose }) {
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState(0);
    const inputRef = useRef(null);
    const setViewport = useStore(s => s.setViewport);
    const addExpression = useStore(s => s.addExpression);
    const COMMANDS = [
        {
            id: "new-expression",
            label: "New Expression",
            description: "Add a new expression row",
            run: () => { addExpression(); onClose(); },
        },
        {
            id: "fit-view",
            label: "Fit View",
            description: "Reset viewport to default",
            run: () => { setViewport(defaultViewport()); onClose(); },
        },
        {
            id: "health",
            label: "Check Backend",
            description: "Ping the math engine",
            run: async () => {
                const r = await health();
                alert(r.ok ? "Backend OK" : "Backend unreachable");
                onClose();
            },
        },
    ];
    const filtered = COMMANDS.filter(c => !query ||
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description.toLowerCase().includes(query.toLowerCase()));
    useEffect(() => { inputRef.current?.focus(); }, []);
    useEffect(() => { setSelected(0); }, [query]);
    const onKeyDown = (e) => {
        if (e.key === "Escape")
            onClose();
        if (e.key === "ArrowDown")
            setSelected(i => Math.min(i + 1, filtered.length - 1));
        if (e.key === "ArrowUp")
            setSelected(i => Math.max(i - 1, 0));
        if (e.key === "Enter" && filtered[selected])
            filtered[selected].run();
    };
    return (_jsx("div", { style: {
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            paddingTop: 80, zIndex: 1000,
        }, onClick: onClose, children: _jsxs("div", { style: {
                background: "#252525", borderRadius: 8, width: 480,
                boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.1)",
                overflow: "hidden",
            }, onClick: e => e.stopPropagation(), onKeyDown: onKeyDown, children: [_jsx("input", { ref: inputRef, value: query, onChange: e => setQuery(e.target.value), placeholder: "Search commands\u2026", style: {
                        width: "100%", padding: "14px 16px", background: "transparent",
                        border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)",
                        color: "#e8e8e8", fontSize: 15, outline: "none",
                        fontFamily: "inherit",
                    } }), _jsxs("div", { style: { maxHeight: 320, overflowY: "auto" }, children: [filtered.map((cmd, i) => (_jsxs("div", { onClick: cmd.run, style: {
                                padding: "10px 16px", cursor: "pointer",
                                background: i === selected ? "rgba(97,172,255,0.12)" : "transparent",
                                borderLeft: i === selected ? "2px solid #61acff" : "2px solid transparent",
                            }, children: [_jsx("div", { style: { fontSize: 14, color: "#e8e8e8" }, children: cmd.label }), _jsx("div", { style: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }, children: cmd.description })] }, cmd.id))), filtered.length === 0 && (_jsxs("div", { style: { padding: "16px", color: "rgba(255,255,255,0.3)", fontSize: 13 }, children: ["No commands match \"", query, "\""] }))] })] }) }));
}
