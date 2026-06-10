import { compute } from "../api/calls";
import { FRONTEND_OPS } from "./frontendOps";
import { runSandboxed } from "../plugins/sandbox";
import type { ToolDefinition, ToolContext, ToolInputValues, ToolResult } from "./types";
import type { OverlayLine } from "../renderer/overlays";

interface ResolveScope {
  inputs: ToolInputValues;
  result: Record<string, unknown>;
  ctx: {
    expr: string;
    expr1?: string;
    expr2?: string;
    color: string;
    exprId?: string;
    viewport: { xMin: number; xMax: number; yMin: number; yMax: number };
  };
}

function resolve(path: string, scope: ResolveScope): unknown {
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = scope;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function buildOverlays(
  def: ToolDefinition,
  scope: ResolveScope,
  rawResult: Record<string, unknown>,
): OverlayLine[] {
  const specs = def.outputs.overlays ?? [];
  return specs.flatMap((spec) => {
    if (spec.type === "line") {
      const x0    = resolve(spec.x0    ?? "", scope) as number;
      const y0    = resolve(spec.y0    ?? "", scope) as number;
      const slope = resolve(spec.slope ?? "", scope) as number;
      const color = (resolve(spec.color ?? "", scope) as string) ?? "#ffffff";
      if (!isFinite(x0) || !isFinite(y0) || !isFinite(slope)) return [];
      return [{ x0, y0, slope, color }];
    }
    if (spec.type === "lines_from_result") {
      return (rawResult.lines as OverlayLine[]) ?? [];
    }
    return [];
  });
}

export async function runTool(
  def: ToolDefinition,
  inputs: ToolInputValues,
  toolCtx: ToolContext,
): Promise<ToolResult> {
  const expr = toolCtx.exprId
    ? (() => {
        const e = toolCtx.expressions.find(ex => ex.id === toolCtx.exprId);
        if (!e) return "";
        const eqIdx = e.raw.indexOf("=");
        return eqIdx >= 0 ? e.raw.slice(eqIdx + 1).trim() : e.raw.trim();
      })()
    : "";

  const exprEntry = toolCtx.expressions.find(e => e.id === toolCtx.exprId);

  const parsedExpr = exprEntry?.parsed;
  const expr1 = parsedExpr?.type === "reflect" ? parsedExpr.expr1 : undefined;
  const expr2 = parsedExpr?.type === "reflect" ? parsedExpr.expr2 : undefined;

  const resolveExprBody = (name?: string): string => {
    if (!name) return "";
    const fn = toolCtx.expressions.find(
      e => e.parsed.type === "function" && (e.parsed as { name: string }).name === name
    );
    if (!fn) return name;
    const eq = fn.raw.indexOf("=");
    return eq >= 0 ? fn.raw.slice(eq + 1).trim() : fn.raw.trim();
  };

  const scope: ResolveScope = {
    inputs,
    result: {},
    ctx: {
      expr,
      expr1: expr1 ? resolveExprBody(expr1) : undefined,
      expr2: expr2 ? resolveExprBody(expr2) : undefined,
      color: exprEntry?.color ?? "#ffffff",
      exprId: toolCtx.exprId,
      viewport: toolCtx.viewport,
    },
  };

  let rawResult: Record<string, unknown> = {};

  try {
    if (def.operation.type === "frontend") {
      const opFn = FRONTEND_OPS[def.operation.op];
      if (!opFn) throw new Error(`Unknown frontend op: ${def.operation.op}`);
      rawResult = opFn(inputs as Record<string, unknown>, toolCtx);
    } else if (def.operation.type === "inline") {
      const result = await runSandboxed(def.operation.js, inputs, toolCtx);
      if (!result.ok) return result;
      return result;
    } else {
      const resolvedArgs: Record<string, unknown> = {};
      for (const [k, pathOrVal] of Object.entries(def.operation.args ?? {})) {
        resolvedArgs[k] = typeof pathOrVal === "string" && pathOrVal.includes(".")
          ? resolve(pathOrVal, scope)
          : pathOrVal;
      }
      const res = await compute(def.operation.op, resolvedArgs);
      if (!res.ok) return { ok: false, error: res.error, data: {} };
      rawResult = res.result;
    }
  } catch (err) {
    return { ok: false, error: String(err), data: {} };
  }

  scope.result = rawResult;
  const overlays = buildOverlays(def, scope, rawResult);

  return { ok: true, data: rawResult, overlays };
}
