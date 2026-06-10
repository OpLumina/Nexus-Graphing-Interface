// Tool panel registry — maps tool IDs to React components.
// To add a custom panel: create MyPanel.tsx, add one entry below.
// To use the default layout: omit the entry — GenericPanel is used automatically.

import React from "react";
import { GenericPanel } from "./GenericPanel";
import { SlopePanel }   from "./SlopePanel";
import { ReflectPanel } from "./ReflectPanel";
import { AnalyzePanel } from "./AnalyzePanel";
import type { ExpressionEntry } from "../../store";
import type { ToolDefinition }  from "../../tools/types";

export interface ToolPanelProps {
  entry: ExpressionEntry;
  def:   ToolDefinition;
}

export type ToolPanelComponent = React.FC<ToolPanelProps>;

// Map from tool id → custom panel component.
// If a tool id is NOT listed here, GenericPanel is used.
const CUSTOM_PANELS: Record<string, ToolPanelComponent> = {
  slope:   SlopePanel,
  reflect: ReflectPanel,
  analyze: AnalyzePanel,
};

// Returns the panel component for the given tool id.
export function getPanelComponent(toolId: string): ToolPanelComponent {
  return CUSTOM_PANELS[toolId] ?? GenericPanel;
}
