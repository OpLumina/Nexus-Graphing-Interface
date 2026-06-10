// Tool panel registry — maps tool IDs to React components.
// To add a custom panel: create MyPanel.tsx, add one entry below.
// To use the default layout: omit the entry — GenericPanel is used automatically.
import { GenericPanel } from "./GenericPanel";
import { SlopePanel } from "./SlopePanel";
import { ReflectPanel } from "./ReflectPanel";
import { AnalyzePanel } from "./AnalyzePanel";
// Map from tool id → custom panel component.
// If a tool id is NOT listed here, GenericPanel is used.
const CUSTOM_PANELS = {
    slope: SlopePanel,
    reflect: ReflectPanel,
    analyze: AnalyzePanel,
};
// Returns the panel component for the given tool id.
export function getPanelComponent(toolId) {
    return CUSTOM_PANELS[toolId] ?? GenericPanel;
}
