import type { Env, UserFns } from "../engine/evaluator";
import type { Viewport } from "../renderer/viewport";
import type { ParsedExpression } from "../engine/ast";
import type { OverlayLine } from "../renderer/overlays";

export interface ExpressionLike {
  id: string;
  raw: string;
  color: string;
  parsed: ParsedExpression;
}

export interface ToolContext {
  env: Env;
  userFns: UserFns;
  viewport: Viewport;
  expressions: ExpressionLike[];
  exprId?: string;
}

export interface ToolResult {
  ok: boolean;
  error?: string;
  data: Record<string, unknown>;
  overlays?: OverlayLine[];
}

export type ToolInputValues = Record<string, unknown>;

export interface ToolInputSpec {
  name: string;
  type: "number" | "string" | "boolean";
  label?: string;
  default?: unknown;
}

export interface ToolOutputPanelSpec {
  type: "value" | "table" | "text" | "latex" | "intersections" | "custom";
  label?: string;
  value?: string;
  precision?: number;
  displayMode?: boolean;
}

export interface ToolOutputOverlaySpec {
  type: "line" | "lines_from_result";
  x0?: string;
  y0?: string;
  slope?: string;
  color?: string;
}

export type ToolOperationSpec =
  | { type: "backend";  op: string; args?: Record<string, string> }
  | { type: "frontend"; op: string; args?: Record<string, string> }
  | { type: "inline";   js: string };

export interface ToolDefinition {
  id: string;
  label: string;
  description: string;
  category: "calculus" | "geometry" | "algebra" | "analysis" | "utility" | string;
  appliesTo: ParsedExpression["type"][];
  inputs: ToolInputSpec[];
  operation: ToolOperationSpec;
  outputs: {
    overlays?: ToolOutputOverlaySpec[];
    panel?: ToolOutputPanelSpec[];
  };
  docs: string;
  pluginId?: string;
}
