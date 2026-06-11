import type { PluginManifest } from "../types";

export const manifest: PluginManifest = {
  id: "nexus.secant-line",
  version: "1.0.0",
  name: "Secant Line",
  author: "NexusGraph",
  description: "Secant line through (a, f(a)) and (b, f(b)) — average rate of change",
  tags: ["calculus", "geometry"],
  license: "MIT",
  requiresBackend: false,
  tools: [
    {
      id: "secant_line",
      label: "Secant Line",
      description: "Line through two points on the curve",
      category: "calculus",
      appliesTo: ["function"],
      inputs: [
        { name: "a", type: "number", label: "a", default: 0 },
        { name: "b", type: "number", label: "b", default: 2 },
      ],
      operation: {
        type: "inline",
        js: String.raw`function run(inputs, ctx) {
  var expr = null;
  for (var i = 0; i < ctx.expressions.length; i++) if (ctx.expressions[i].id === ctx.exprId) expr = ctx.expressions[i];
  if (!expr || expr.parsed.type !== 'function') return { ok: false, error: 'Apply to a named function f(x)', data: {} };
  var fn = ctx.userFns[expr.parsed.name];
  if (!fn) return { ok: false, error: 'Function not found', data: {} };
  var f = function (x) { try { var v = fn([x]); return typeof v === 'number' ? v : NaN; } catch (e) { return NaN; } };
  var a = Number(inputs.a), b = Number(inputs.b);
  if (a === b) return { ok: false, error: 'Require a ≠ b', data: {} };
  var fa = f(a), fb = f(b);
  if (!isFinite(fa) || !isFinite(fb)) return { ok: false, error: 'f undefined at a or b', data: {} };
  var m = (fb - fa) / (b - a);
  return {
    ok: true,
    data: { slope: m, fa: fa, fb: fb },
    overlays: [{ x0: a, y0: fa, slope: m, color: '#cc73ff', label: 'secant' }]
  };
}`,
      },
      outputs: {
        panel: [
          { type: "value", label: "avg rate Δy/Δx", value: "result.slope", precision: 8 },
          { type: "value", label: "f(a)", value: "result.fa", precision: 6 },
          { type: "value", label: "f(b)", value: "result.fb", precision: 6 },
        ],
      },
      docs: "Draws the secant line through (a, f(a)) and (b, f(b)). The slope is the average rate of change of f on [a, b] — compare with the tangent tool as b → a.",
    },
  ],
};
