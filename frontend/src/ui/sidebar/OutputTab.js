import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { toolsForType } from "../../tools/loader";
import { getPanelComponent } from "../toolpanels/registry";
const panelWrap = {
    background: "rgba(0,0,0,0.22)",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    padding: "8px 14px",
    fontSize: 12,
};
const divider = {
    borderTop: "1px solid rgba(255,255,255,0.06)",
    margin: "8px 0",
};
export function OutputTab({ entry }) {
    const tools = toolsForType(entry.parsed.type);
    if (tools.length === 0)
        return null;
    return (_jsx("div", { style: panelWrap, children: tools.map((def, i) => {
            const Panel = getPanelComponent(def.id);
            return (_jsxs("div", { children: [i > 0 && _jsx("div", { style: divider }), _jsx(Panel, { entry: entry, def: def })] }, def.id));
        }) }));
}
